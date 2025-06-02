"""
Application Configuration
========================

This module contains configuration settings for the Image Annotation Tool.
"""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

PROJECT_ROOT = os.environ.get('PROJECT_ROOT')
if not PROJECT_ROOT:
    if os.path.exists('/app'):
        PROJECT_ROOT = '/app'
    else:
        PROJECT_ROOT = BASE_DIR

UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', os.path.join(PROJECT_ROOT, 'storage', 'uploads'))

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024

SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', f'sqlite:///{os.path.join(PROJECT_ROOT, "storage", "database", "app.db")}')
SQLALCHEMY_TRACK_MODIFICATIONS = False

CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:3001']

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
JWT_ACCESS_TOKEN_EXPIRES = 24 * 60 * 60

print(f"🔧 Configuration loaded:")
print(f"   PROJECT_ROOT: {PROJECT_ROOT}")
print(f"   UPLOAD_FOLDER: {UPLOAD_FOLDER}")
print(f"   DATABASE_URI: {SQLALCHEMY_DATABASE_URI}")
print(f"   CORS_ORIGINS: {CORS_ORIGINS}") 