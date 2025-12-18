"""Authentication utilities for JWT and password handling."""
import jwt
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash


def hash_password(password: str) -> str:
    """Hash a password using werkzeug's secure hashing."""
    return generate_password_hash(password, method='pbkdf2:sha256')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return check_password_hash(password_hash, password)


def generate_access_token(user_id: str, email: str, role: str) -> str:
    """Generate a JWT access token."""
    now = datetime.now(timezone.utc)
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'type': 'access',
        'exp': now + timedelta(seconds=current_app.config['JWT_ACCESS_TOKEN_EXPIRES']),
        'iat': now
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')


def generate_refresh_token(user_id: str) -> str:
    """Generate a JWT refresh token."""
    now = datetime.now(timezone.utc)
    payload = {
        'user_id': user_id,
        'type': 'refresh',
        'exp': now + timedelta(seconds=current_app.config['JWT_REFRESH_TOKEN_EXPIRES']),
        'iat': now
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    """Decorator to require a valid JWT token for a route."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        if payload.get('type') != 'access':
            return jsonify({'error': 'Invalid token type'}), 401
        
        # Add user info to request context
        request.current_user = {
            'user_id': payload['user_id'],
            'email': payload['email'],
            'role': payload['role']
        }
        
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator to require admin role."""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if request.current_user.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated


def editor_required(f):
    """Decorator to require editor or admin role."""
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        role = request.current_user.get('role')
        if role not in ['admin', 'editor']:
            return jsonify({'error': 'Editor access required'}), 403
        return f(*args, **kwargs)
    return decorated


def role_required(*allowed_roles):
    """Decorator factory to require specific roles.
    
    Usage:
        @role_required('admin', 'editor')
        def my_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated(*args, **kwargs):
            role = request.current_user.get('role')
            if role not in allowed_roles:
                return jsonify({'error': f'Access denied. Required roles: {", ".join(allowed_roles)}'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


# Role hierarchy for permission checks
ROLE_HIERARCHY = {
    'admin': 3,
    'editor': 2,
    'viewer': 1
}


def has_permission(user_role: str, required_role: str) -> bool:
    """Check if a user role has at least the required permission level."""
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    return user_level >= required_level


def generate_2fa_secret() -> str:
    """Generate a new 2FA secret."""
    return pyotp.random_base32()


def get_2fa_uri(secret: str, email: str, issuer: str = 'FileSearchRAG') -> str:
    """Get the provisioning URI for 2FA setup."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def generate_2fa_qr_code(uri: str) -> str:
    """Generate a QR code image as base64 string."""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color='black', back_color='white')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def verify_2fa_code(secret: str, code: str) -> bool:
    """Verify a 2FA code."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code)


def get_current_user_id() -> str:
    """Get the current user ID from the request context.
    
    Returns:
        The user ID if authenticated, None otherwise.
    """
    if hasattr(request, 'current_user') and request.current_user:
        return request.current_user.get('user_id')
    
    # Try to get from Authorization header if not already decoded
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        payload = decode_token(token)
        if payload and payload.get('type') == 'access':
            return payload.get('user_id')
    
    return None
