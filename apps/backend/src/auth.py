"""
JWT Authentication Stub for Image Annotation Tool

This is a basic implementation sketch for token-based authentication.
In a production environment, you would want to:
- Use a proper user database with password hashing
- Implement proper session management
- Add role-based access control
- Use environment variables for secrets
- Add rate limiting and security measures
"""

import jwt
import hashlib
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app

# Mock user database (in production, use a real database)
MOCK_USERS = {
    "admin": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "password_hash": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",  # "admin123"
        "role": "admin",
        "created_at": "2023-01-01T00:00:00Z"
    },
    "user": {
        "id": 2,
        "username": "user",
        "email": "user@example.com", 
        "password_hash": "04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb",  # "user123"
        "role": "user",
        "created_at": "2023-01-01T00:00:00Z"
    }
}

# JWT Configuration (in production, use environment variables)
JWT_SECRET_KEY = "your-super-secret-jwt-key-change-this-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

class AuthService:
    """Authentication service for JWT token management."""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using SHA-256 (in production, use bcrypt or similar)."""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify password against hash."""
        return AuthService.hash_password(password) == password_hash
    
    @staticmethod
    def generate_token(user_data: dict) -> str:
        """Generate JWT token for user."""
        payload = {
            "user_id": user_data["id"],
            "username": user_data["username"],
            "email": user_data["email"],
            "role": user_data["role"],
            "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
            "iat": datetime.utcnow()
        }
        
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def verify_token(token: str) -> dict:
        """Verify and decode JWT token."""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise Exception("Token has expired")
        except jwt.InvalidTokenError:
            raise Exception("Invalid token")
    
    @staticmethod
    def authenticate_user(username: str, password: str) -> dict:
        """Authenticate user with username and password."""
        user = MOCK_USERS.get(username)
        
        if not user:
            raise Exception("User not found")
        
        if not AuthService.verify_password(password, user["password_hash"]):
            raise Exception("Invalid password")
        
        # Remove password hash from response
        user_data = {k: v for k, v in user.items() if k != "password_hash"}
        return user_data

def token_required(f):
    """Decorator to require JWT token for protected routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            # Verify token
            payload = AuthService.verify_token(token)
            current_user = payload
        except Exception as e:
            return jsonify({'error': str(e)}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorator to require admin role."""
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def register_auth_routes(app):
    """Register authentication routes."""
    
    @app.route('/auth/login', methods=['POST'])
    def login():
        """Login endpoint."""
        try:
            data = request.get_json()
            
            if not data or not data.get('username') or not data.get('password'):
                return jsonify({'error': 'Username and password required'}), 400
            
            # Authenticate user
            user_data = AuthService.authenticate_user(
                data['username'], 
                data['password']
            )
            
            # Generate token
            token = AuthService.generate_token(user_data)
            
            return jsonify({
                'message': 'Login successful',
                'token': token,
                'user': user_data,
                'expires_in': JWT_EXPIRATION_HOURS * 3600  # seconds
            }), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 401
    
    @app.route('/auth/verify', methods=['GET'])
    @token_required
    def verify_token_endpoint(current_user):
        """Verify token endpoint."""
        return jsonify({
            'message': 'Token is valid',
            'user': current_user
        }), 200
    
    @app.route('/auth/refresh', methods=['POST'])
    @token_required
    def refresh_token(current_user):
        """Refresh token endpoint."""
        try:
            # Generate new token
            user_data = {
                'id': current_user['user_id'],
                'username': current_user['username'],
                'email': current_user['email'],
                'role': current_user['role']
            }
            
            new_token = AuthService.generate_token(user_data)
            
            return jsonify({
                'message': 'Token refreshed',
                'token': new_token,
                'expires_in': JWT_EXPIRATION_HOURS * 3600
            }), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/auth/profile', methods=['GET'])
    @token_required
    def get_profile(current_user):
        """Get user profile."""
        return jsonify({
            'user': current_user
        }), 200
    
    @app.route('/auth/users', methods=['GET'])
    @token_required
    @admin_required
    def list_users(current_user):
        """List all users (admin only)."""
        users = []
        for username, user_data in MOCK_USERS.items():
            user_info = {k: v for k, v in user_data.items() if k != "password_hash"}
            users.append(user_info)
        
        return jsonify({
            'users': users,
            'total': len(users)
        }), 200

# Example of how to protect existing routes
def protect_image_routes(app):
    """Example of how to add authentication to existing image routes."""
    
    # This is just a demonstration - you would modify your existing routes
    @app.route('/api/protected/images/', methods=['GET'])
    @token_required
    def get_protected_images(current_user):
        """Protected version of get images endpoint."""
        # Your existing get_images logic here
        return jsonify({
            'message': f'Hello {current_user["username"]}, here are your images',
            'user_role': current_user['role']
        })
    
    @app.route('/api/admin/stats', methods=['GET'])
    @token_required
    @admin_required
    def get_admin_stats(current_user):
        """Admin-only statistics endpoint."""
        return jsonify({
            'message': 'Admin statistics',
            'total_users': len(MOCK_USERS),
            'admin_user': current_user['username']
        })

"""
Frontend Integration Example:

// Login
const login = async (username, password) => {
    const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
};

// Make authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
};

// Usage
const images = await makeAuthenticatedRequest('/api/protected/images/');
""" 