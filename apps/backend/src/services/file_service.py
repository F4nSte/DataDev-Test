"""
File Service
============

This module handles file operations including upload, validation, and storage.
"""

import os
import uuid
import magic
from PIL import Image
from werkzeug.utils import secure_filename
from ..config.settings import UPLOAD_FOLDER, ALLOWED_EXTENSIONS

class FileService:
    """Service for handling file operations."""
    
    @staticmethod
    def save_uploaded_file(file):
        """Save uploaded file to storage and return file info."""
        try:
            # Generate unique filename
            original_filename = secure_filename(file.filename)
            unique_filename = FileService._generate_unique_filename(original_filename)
            file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
            
            # Ensure upload directory exists
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            
            # Save file
            file.save(file_path)
            
            # Validate MIME type
            if not FileService._validate_mime_type(file_path):
                os.remove(file_path)
                return {
                    'success': False,
                    'error': 'Invalid file type detected during MIME validation'
                }
            
            # Extract image metadata
            width, height = FileService._get_image_dimensions(file_path)
            
            return {
                'success': True,
                'filename': unique_filename,
                'file_path': file_path,
                'width': width,
                'height': height
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'File save failed: {str(e)}'
            }
    
    @staticmethod
    def _generate_unique_filename(original_filename):
        """Generate unique filename while preserving extension."""
        name, ext = os.path.splitext(original_filename)
        timestamp = str(uuid.uuid4())
        return f"{name}_{timestamp}{ext}"
    
    @staticmethod
    def _validate_mime_type(file_path):
        """Validate file MIME type using python-magic."""
        try:
            mime_type = magic.from_file(file_path, mime=True)
            allowed_mime_types = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp'
            ]
            return mime_type in allowed_mime_types
        except Exception:
            return False
    
    @staticmethod
    def _get_image_dimensions(file_path):
        """Extract image width and height."""
        try:
            with Image.open(file_path) as img:
                return img.width, img.height
        except Exception:
            return None, None
    
    @staticmethod
    def file_exists(filename):
        """Check if file exists in storage."""
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        return os.path.exists(file_path) 