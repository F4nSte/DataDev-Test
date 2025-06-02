"""
Database Configuration and Initialization
=========================================

This module handles SQLAlchemy database setup and initialization.
"""

import os
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize SQLAlchemy
db = SQLAlchemy()

def init_db():
    """Initialize the database with required tables."""
    try:
        from .image import Images
        from .annotation import Annotations
        
        # Get database URI for debugging
        from flask import current_app
        db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', 'Not configured')
        
        print(f"🗄️ Initializing database...")
        print(f"   Database URI: {db_uri}")
        
        # Extract database file path from URI for additional checks
        if db_uri.startswith('sqlite:///'):
            db_file_path = db_uri[10:]  # Remove 'sqlite:///' prefix
            db_dir = os.path.dirname(db_file_path)
            
            print(f"   Database file: {db_file_path}")
            print(f"   Database directory: {db_dir}")
            print(f"   Directory exists: {os.path.exists(db_dir)}")
            print(f"   Directory writable: {os.access(db_dir, os.W_OK) if os.path.exists(db_dir) else 'N/A'}")
            
            # Ensure directory exists
            if not os.path.exists(db_dir):
                print(f"   Creating database directory: {db_dir}")
                os.makedirs(db_dir, exist_ok=True)
        
        # Create all tables
        print("   Creating database tables...")
        db.create_all()
        
        print(f"✅ Database initialized successfully at {datetime.now()}")
        print("   Tables created:")
        print("   - images")
        print("   - annotations")
        
    except Exception as e:
        print(f"❌ Database initialization failed: {str(e)}")
        print(f"   Error type: {type(e).__name__}")
        raise e 