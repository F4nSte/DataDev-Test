"""
Images API Routes
================

This module contains API routes for image management.
"""

from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from ..models import ImageModel
from ..services.file_service import FileService
from ..utils.validators import validate_image_file
from ..utils.decorators import handle_api_errors

images_bp = Blueprint('images', __name__)

@images_bp.route('/images/', methods=['GET', 'POST'])
@handle_api_errors
def handle_images():
    """Handle both GET (list images) and POST (upload image) requests."""
    if request.method == 'POST':
        return upload_image()
    else:
        return get_images()

def upload_image():
    """Upload a new image."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Validate file
    validation_result = validate_image_file(file)
    if not validation_result['valid']:
        return jsonify({'error': validation_result['error']}), 400
    
    # Save file
    result = FileService.save_uploaded_file(file)
    if not result['success']:
        return jsonify({'error': result['error']}), 500
    
    # Create database record
    image_data = ImageModel.create(
        filename=result['filename'],
        original_filename=file.filename,
        file_path=result['file_path'],
        width=result.get('width'),
        height=result.get('height')
    )
    
    return jsonify(image_data), 201

def get_images():
    """Get list of all images."""
    images = ImageModel.get_all()
    return jsonify({'images': images}) 