"""
Image Model
===========

This module contains the Image model and related database operations.
"""

import os
from datetime import datetime
from .database import db

class Images(db.Model):
    """Flask-SQLAlchemy model for images table."""
    __tablename__ = 'images'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    upload_time = db.Column(db.String(50), nullable=False)
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    
    # Relationship to annotations
    annotations = db.relationship('Annotations', backref='image', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        """Convert image record to dictionary."""
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_path': self.file_path,
            'upload_time': self.upload_time,
            'width': self.width,
            'height': self.height,
            'url': f'/uploads/{self.filename}'
        }


class ImageModel:
    """Model class for image operations (backward compatibility)."""
    
    @staticmethod
    def create(filename, original_filename, file_path, width=None, height=None):
        """Create a new image record."""
        new_image = Images(
            filename=filename,
            original_filename=original_filename,
            file_path=file_path,
            upload_time=datetime.now().isoformat(),
            width=width,
            height=height
        )
        
        db.session.add(new_image)
        db.session.commit()
        
        return {
            'image_id': new_image.id,
            'filename': new_image.filename,
            'original_filename': new_image.original_filename,
            'url': f'/uploads/{new_image.filename}'
        }
    
    @staticmethod
    def get_all():
        """Get all images."""
        images = Images.query.order_by(Images.upload_time.desc()).all()
        return [img.to_dict() for img in images]
    
    @staticmethod
    def get_by_id(image_id):
        """Get image by ID."""
        image = Images.query.get(image_id)
        return image.to_dict() if image else None 