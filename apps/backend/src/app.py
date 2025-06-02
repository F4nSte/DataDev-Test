from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
import os
import uuid
import magic
from PIL import Image
from werkzeug.utils import secure_filename
from datetime import datetime


from .models import db, init_db, ImageModel, AnnotationModel
from .config.settings import (
    UPLOAD_FOLDER, 
    ALLOWED_EXTENSIONS, 
    MAX_CONTENT_LENGTH,
    CORS_ORIGINS,
    SECRET_KEY,
    SQLALCHEMY_DATABASE_URI,
    SQLALCHEMY_TRACK_MODIFICATIONS
)


def create_app():
    """Application factory pattern."""
    app = Flask(__name__)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS
    app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
    app.config['SECRET_KEY'] = SECRET_KEY
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    
    db.init_app(app)
    CORS(app, origins=CORS_ORIGINS)
    
    with app.app_context():
        init_db()
    
    register_routes(app)
    
    return app


def register_routes(app):
    """Register all application routes."""
    
    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint."""
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'version': '2.0.0'
        })
    
    @app.route('/uploads/<filename>')
    def uploaded_file(filename):
        """Serve uploaded files."""
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    
    @app.route('/images/', methods=['GET', 'POST'])
    def handle_images():
        """Handle both GET (list images) and POST (upload image) requests."""
        if request.method == 'POST':
            return upload_image(app)
        else:
            return get_images()
    
    @app.route('/images/<int:image_id>/annotations', methods=['GET', 'POST'])
    def handle_annotations(image_id):
        """Handle annotations for a specific image."""
        if request.method == 'POST':
            return save_annotations(image_id)
        else:
            return get_annotations(image_id)
    
    @app.route('/images/<int:image_id>/download-annotations')
    def download_annotations(image_id):
        """Download annotations in specified format."""
        format_type = request.args.get('format', 'json')
        
        annotations = AnnotationModel.get_annotations(image_id)
        image = ImageModel.get_by_id(image_id)
        
        if not image:
            return jsonify({'error': 'Image not found'}), 404
        
        if format_type == 'coco':
            coco_data = {
                "images": [
                    {
                        "id": image_id,
                        "width": image.get('width', 0),
                        "height": image.get('height', 0),
                        "file_name": image['filename']
                    }
                ],
                "annotations": [],
                "categories": []
            }
            
            categories = {}
            category_id = 1
            
            for i, ann in enumerate(annotations):
                label = ann.get('label', 'object')
                
                if label not in categories:
                    categories[label] = category_id
                    coco_data["categories"].append({
                        "id": category_id,
                        "name": label,
                        "supercategory": "thing"
                    })
                    category_id += 1
                
                if ann.get('type') == 'box':
                    coco_data["annotations"].append({
                        "id": i + 1,
                        "image_id": image_id,
                        "category_id": categories[label],
                        "bbox": [ann['x'], ann['y'], ann['w'], ann['h']],
                        "area": ann['w'] * ann['h'],
                        "iscrowd": 0
                    })
            
            response = Response(
                jsonify(coco_data).get_data(as_text=True),
                mimetype='application/json',
                headers={'Content-Disposition': f'attachment; filename=coco_annotations_{image_id}.json'}
            )
            return response
            
        elif format_type == 'yolo':
            image_width = image.get('width', 1)
            image_height = image.get('height', 1)
            
            if image_width <= 0 or image_height <= 0:
                return jsonify({'error': 'Image dimensions required for YOLO format'}), 400
            
            yolo_lines = []
            categories = {}
            category_id = 0
            
            for ann in annotations:
                if ann.get('type') == 'box':
                    label = ann.get('label', 'object')
                    
                    if label not in categories:
                        categories[label] = category_id
                        category_id += 1
                    
                    class_id = categories[label]
                    
                    x = ann['x']
                    y = ann['y']
                    w = ann['w']
                    h = ann['h']
                    
                    center_x = (x + w/2) / image_width
                    center_y = (y + h/2) / image_height
                    width_norm = w / image_width
                    height_norm = h / image_height
                    
                    yolo_lines.append(f"{class_id} {center_x:.6f} {center_y:.6f} {width_norm:.6f} {height_norm:.6f}")
            
            yolo_content = '\n'.join(yolo_lines)
            
            response = Response(
                yolo_content,
                mimetype='text/plain',
                headers={'Content-Disposition': f'attachment; filename=yolo_annotations_{image_id}.txt'}
            )
            return response
            
        else:
            return jsonify({
                'image': image,
                'annotations': annotations
            })


def upload_image(app):
    """Handle image upload."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    try:
        original_filename = secure_filename(file.filename)
        timestamp = str(uuid.uuid4())
        name, ext = os.path.splitext(original_filename)
        unique_filename = f"{name}_{timestamp}{ext}"
        
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        file.save(file_path)
        
        mime_type = magic.from_file(file_path, mime=True)
        allowed_mime_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        
        if mime_type not in allowed_mime_types:
            os.remove(file_path)
            return jsonify({'error': 'Invalid file type detected'}), 400
        
        try:
            with Image.open(file_path) as img:
                width, height = img.size
        except Exception:
            width, height = None, None
        
        image_data = ImageModel.create(
            filename=unique_filename,
            original_filename=original_filename,
            file_path=file_path,
            width=width,
            height=height
        )
        
        return jsonify(image_data), 201
        
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


def get_images():
    """Get all images."""
    try:
        images = ImageModel.get_all()
        return jsonify(images)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def save_annotations(image_id):
    """Save annotations for an image."""
    try:
        annotations_data = request.get_json()
        if not isinstance(annotations_data, list):
            return jsonify({'error': 'Annotations must be a list'}), 400
        
        AnnotationModel.save_annotations(image_id, annotations_data)
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def get_annotations(image_id):
    """Get annotations for an image."""
    try:
        annotations = AnnotationModel.get_annotations(image_id)
        return jsonify(annotations)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


if __name__ == '__main__':
    app = create_app()
    print(f"🚀 Starting Flask server...")
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print(f"🗄️ Database: {SQLALCHEMY_DATABASE_URI}")
    app.run(host='0.0.0.0', port=5000, debug=True) 