from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class ImageModel(db.Model):
    """Model for storing image information."""
    __tablename__ = 'images'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    upload_time = db.Column(db.DateTime, default=datetime.utcnow)
    
    annotations = db.relationship('AnnotationModel', backref='image', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'url': f'/uploads/{self.filename}',
            'width': self.width,
            'height': self.height,
            'upload_time': self.upload_time.isoformat() if self.upload_time else None
        }
    
    @classmethod
    def create(cls, **kwargs):
        """Create new image record."""
        instance = cls(**kwargs)
        db.session.add(instance)
        db.session.commit()
        return instance.to_dict()
    
    @classmethod
    def get_all(cls):
        """Get all images."""
        images = cls.query.order_by(cls.upload_time.desc()).all()
        return [img.to_dict() for img in images]
    
    @classmethod
    def get_by_id(cls, image_id):
        """Get image by ID."""
        image = cls.query.get(image_id)
        return image.to_dict() if image else None


class AnnotationModel(db.Model):
    """Model for storing annotation data."""
    __tablename__ = 'annotations'
    
    id = db.Column(db.Integer, primary_key=True)
    image_id = db.Column(db.Integer, db.ForeignKey('images.id'), nullable=False)
    annotation_type = db.Column(db.String(50), nullable=False)
    data = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    @classmethod
    def get_annotations(cls, image_id):
        """Get all annotations for an image."""
        annotations = cls.query.filter_by(image_id=image_id).all()
        result = []
        for ann in annotations:
            try:
                data = json.loads(ann.data)
                data['type'] = ann.annotation_type
                if 'id' not in data:
                    data['id'] = str(ann.id)
                result.append(data)
            except json.JSONDecodeError:
                continue
        return result
    
    @classmethod
    def save_annotations(cls, image_id, annotations):
        """Save annotations for an image."""
        cls.query.filter_by(image_id=image_id).delete()
        
        for annotation in annotations:
            annotation_type = annotation.pop('type')
            
            new_annotation = cls(
                image_id=image_id,
                annotation_type=annotation_type,
                data=json.dumps(annotation)
            )
            db.session.add(new_annotation)
        
        db.session.commit()
        return {'status': 'success'}


def init_db():
    """Initialize the database."""
    db.create_all()


class Image:
    """Legacy Image class for backward compatibility."""
    
    @staticmethod
    def get_all():
        return ImageModel.get_all()
    
    @staticmethod
    def create(**kwargs):
        return ImageModel.create(**kwargs)
    
    @staticmethod
    def get_by_id(image_id):
        return ImageModel.get_by_id(image_id)


class Annotation:
    """Legacy Annotation class for backward compatibility."""
    
    @staticmethod
    def get_annotations(image_id):
        return AnnotationModel.get_annotations(image_id)
    
    @staticmethod
    def save_annotations(image_id, annotations):
        return AnnotationModel.save_annotations(image_id, annotations)


def create_app_with_db():
    """Legacy database initialization function for backward compatibility."""
    pass 