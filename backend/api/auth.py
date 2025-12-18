"""Authentication API blueprint."""
from flask import Blueprint, jsonify, request, current_app
from backend.extensions import db
from backend.models import User
from backend.utils.auth import (
    hash_password,
    verify_password,
    generate_access_token,
    generate_refresh_token,
    decode_token,
    token_required,
    generate_2fa_secret,
    get_2fa_uri,
    generate_2fa_qr_code,
    verify_2fa_code
)

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user.
    
    Request body:
        - email: User email (required)
        - password: User password (required)
        - name: User display name (required)
    
    Returns:
        - User data and tokens on success
        - Error message on failure
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    
    # Validate required fields
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    if not password:
        return jsonify({'error': 'Password is required'}), 400
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    # Validate email format (basic check)
    if '@' not in email or '.' not in email:
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Validate password strength
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'error': 'Email already registered'}), 409
    
    # Create new user
    user = User(
        email=email,
        password_hash=hash_password(password),
        name=name,
        role='viewer'  # Default role for new users
    )
    
    db.session.add(user)
    db.session.commit()
    
    # Generate tokens
    access_token = generate_access_token(user.id, user.email, user.role)
    refresh_token = generate_refresh_token(user.id)
    
    return jsonify({
        'message': 'User registered successfully',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user.
    
    Request body:
        - email: User email (required)
        - password: User password (required)
        - totp_code: 2FA code (required if 2FA is enabled)
    
    Returns:
        - User data and tokens on success
        - Error message on failure
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    totp_code = data.get('totp_code', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Find user
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Verify password
    if not verify_password(password, user.password_hash):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Check 2FA if enabled
    if user.two_factor_enabled:
        if not totp_code:
            return jsonify({
                'error': '2FA code required',
                'requires_2fa': True
            }), 401
        
        if not verify_2fa_code(user.two_factor_secret, totp_code):
            return jsonify({'error': 'Invalid 2FA code'}), 401
    
    # Generate tokens
    access_token = generate_access_token(user.id, user.email, user.role)
    refresh_token = generate_refresh_token(user.id)
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    """Logout user.
    
    Note: Since we're using stateless JWT tokens, logout is handled client-side
    by removing the tokens. This endpoint can be used for logging/auditing.
    
    Returns:
        - Success message
    """
    # In a stateless JWT system, the client simply discards the tokens
    # For enhanced security, you could implement a token blacklist using Redis
    return jsonify({'message': 'Logout successful'}), 200


@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """Refresh access token using refresh token.
    
    Request body:
        - refresh_token: Valid refresh token (required)
    
    Returns:
        - New access token on success
        - Error message on failure
    """
    data = request.get_json()
    
    if not data or not data.get('refresh_token'):
        return jsonify({'error': 'Refresh token is required'}), 400
    
    payload = decode_token(data['refresh_token'])
    
    if not payload:
        return jsonify({'error': 'Invalid or expired refresh token'}), 401
    
    if payload.get('type') != 'refresh':
        return jsonify({'error': 'Invalid token type'}), 401
    
    # Get user
    user = db.session.get(User, payload['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Generate new access token
    access_token = generate_access_token(user.id, user.email, user.role)
    
    return jsonify({
        'access_token': access_token
    }), 200


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    """Get current authenticated user.
    
    Returns:
        - User data
    """
    user = db.session.get(User, request.current_user['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200


@auth_bp.route('/2fa/setup', methods=['POST'])
@token_required
def setup_2fa():
    """Setup two-factor authentication.
    
    Generates a new 2FA secret and returns QR code for authenticator app.
    
    Returns:
        - QR code image (base64) and secret
    """
    user = db.session.get(User, request.current_user['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.two_factor_enabled:
        return jsonify({'error': '2FA is already enabled'}), 400
    
    # Generate new secret
    secret = generate_2fa_secret()
    
    # Store secret temporarily (not enabled yet)
    user.two_factor_secret = secret
    db.session.commit()
    
    # Generate QR code
    uri = get_2fa_uri(secret, user.email)
    qr_code = generate_2fa_qr_code(uri)
    
    return jsonify({
        'message': '2FA setup initiated',
        'secret': secret,
        'qr_code': f'data:image/png;base64,{qr_code}',
        'uri': uri
    }), 200


@auth_bp.route('/2fa/verify', methods=['POST'])
@token_required
def verify_2fa():
    """Verify and enable two-factor authentication.
    
    Request body:
        - code: 6-digit TOTP code from authenticator app (required)
    
    Returns:
        - Success message on valid code
        - Error message on invalid code
    """
    data = request.get_json()
    
    if not data or not data.get('code'):
        return jsonify({'error': 'Verification code is required'}), 400
    
    user = db.session.get(User, request.current_user['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if not user.two_factor_secret:
        return jsonify({'error': '2FA setup not initiated'}), 400
    
    code = data['code'].strip()
    
    if not verify_2fa_code(user.two_factor_secret, code):
        return jsonify({'error': 'Invalid verification code'}), 400
    
    # Enable 2FA
    user.two_factor_enabled = True
    db.session.commit()
    
    return jsonify({
        'message': '2FA enabled successfully'
    }), 200


@auth_bp.route('/2fa/disable', methods=['POST'])
@token_required
def disable_2fa():
    """Disable two-factor authentication.
    
    Request body:
        - code: 6-digit TOTP code from authenticator app (required)
        - password: User password for verification (required)
    
    Returns:
        - Success message on valid credentials
        - Error message on invalid credentials
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    code = data.get('code', '').strip()
    password = data.get('password', '')
    
    if not code or not password:
        return jsonify({'error': 'Code and password are required'}), 400
    
    user = db.session.get(User, request.current_user['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if not user.two_factor_enabled:
        return jsonify({'error': '2FA is not enabled'}), 400
    
    # Verify password
    if not verify_password(password, user.password_hash):
        return jsonify({'error': 'Invalid password'}), 401
    
    # Verify 2FA code
    if not verify_2fa_code(user.two_factor_secret, code):
        return jsonify({'error': 'Invalid 2FA code'}), 400
    
    # Disable 2FA
    user.two_factor_enabled = False
    user.two_factor_secret = None
    db.session.commit()
    
    return jsonify({
        'message': '2FA disabled successfully'
    }), 200
