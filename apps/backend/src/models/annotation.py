"""
Annotation Model
===============

This module contains the Annotation model and related database operations.
"""

import json
from datetime import datetime
from .database import db

class Annotations(db.Model):
    """Flask-SQLAlchemy model for annotations table."""
    __tablename__ = 'annotations'
    
    id = db.Column(db.Integer, primary_key=True)
    image_id = db.Column(db.Integer, db.ForeignKey('images.id'), nullable=False)
    annotation_type = db.Column(db.String(50), nullable=False)
    data = db.Column(db.Text, nullable=False)  # JSON string
    created_at = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        """Convert annotation record to dictionary."""
        annotation_data = json.loads(self.data)
        # Ensure the annotation has the correct structure for frontend
        result = {
            'type': self.annotation_type,
            'id': annotation_data.get('id', str(self.id)),
            'label': annotation_data.get('label', '')
        }
        
        # Add type-specific properties
        if self.annotation_type == 'box':
            result.update({
                'x': annotation_data.get('x', 0),
                'y': annotation_data.get('y', 0),
                'w': annotation_data.get('w', 0),
                'h': annotation_data.get('h', 0)
            })
        elif self.annotation_type == 'polygon':
            result['points'] = annotation_data.get('points', [])
            
        return result


class AnnotationModel:
    """Model class for annotation operations (backward compatibility)."""
    
    @staticmethod
    def save_annotations(image_id, annotations):
        """Save annotations for an image."""
        # Clear existing annotations for this image
        Annotations.query.filter_by(image_id=image_id).delete()
        
        # Save new annotations
        for annotation in annotations:
            new_annotation = Annotations(
                image_id=image_id,
                annotation_type=annotation.get('type', 'unknown'),
                data=json.dumps(annotation),
                created_at=datetime.now().isoformat()
            )
            db.session.add(new_annotation)
        
        db.session.commit()
        return {'success': True, 'count': len(annotations)}
    
    @staticmethod
    def get_annotations(image_id):
        """Get all annotations for an image."""
        annotations = Annotations.query.filter_by(image_id=image_id).all()
        return [ann.to_dict() for ann in annotations] 