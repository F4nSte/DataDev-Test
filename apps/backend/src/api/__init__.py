"""
Image Annotation Tool - API Routes
==================================

This module contains all API route definitions for the image annotation application.
"""

from .images import images_bp
from .annotations import annotations_bp
from .files import files_bp

__all__ = ['images_bp', 'annotations_bp', 'files_bp'] 