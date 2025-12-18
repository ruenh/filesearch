"""Users API blueprint for user management and role assignment."""
from flask import Blueprint, jsonify, request
from backend.extensions import db
from backend.models import User
from backend.utils.auth import token_required, admin_required, hash_password

users_bp = Blueprint('users', __name__)

# Valid roles in the system
VALID_ROLES = ['admin', 'editor', 'viewer']

# Role hierarchy for permission checks
ROLE_HIERARCHY = {
    'admin': 3,
    'editor': 2,
    'viewer': 1
}


def get_role_level(role: str) -> int:
    """Get the numeric level of a role for comparison."""
    return ROLE_HIERARCHY.get(role, 0)


def can_manage_role(manager_role: str, target_role: str) -> bool:
    """Check if a manager can assign/modify a target role."""
    return get_role_level(manager_role) > get_role_level(target_role)


@users_bp.route('', methods=['GET'])
@admin_required
def list_users():
    """List all users (admin only).
    
    Query parameters:
        - role: Filter by role (optional)
        - search: Search by name or email (optional)
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20)
    
    Returns:
        - List of users with pagination info
    """
    role_filter = request.args.get('role')
    search = request.args.get('search', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # Build query
    query = User.query
    
    # Apply role filter
    if role_filter and role_filter in VALID_ROLES:
        query = query.filter(User.role == role_filter)
    
    # Apply search filter
    if search:
        search_pattern = f'%{search}%'
        query = query.filter(
            db.or_(
                User.name.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )
    
    # Order by creation date (newest first)
    query = query.order_by(User.created_at.desc())
    
    # Paginate
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'users': [user.to_dict() for user in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'per_page': pagination.per_page,
        'pages': pagination.pages,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    }), 200


@users_bp.route('/<user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    """Get a specific user by ID (admin only).
    
    Returns:
        - User data
    """
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200


@users_bp.route('/<user_id>/role', methods=['PUT'])
@admin_required
def update_user_role(user_id):
    """Update a user's role (admin only).
    
    Request body:
        - role: New role ('admin', 'editor', 'viewer')
    
    Returns:
        - Updated user data
    """
    data = request.get_json()
    
    if not data or 'role' not in data:
        return jsonify({'error': 'Role is required'}), 400
    
    new_role = data['role']
    
    if new_role not in VALID_ROLES:
        return jsonify({'error': f'Invalid role. Must be one of: {", ".join(VALID_ROLES)}'}), 400
    
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Prevent self-demotion for admins
    current_user_id = request.current_user['user_id']
    if user_id == current_user_id and new_role != 'admin':
        return jsonify({'error': 'Cannot demote yourself'}), 400
    
    # Update role
    old_role = user.role
    user.role = new_role
    db.session.commit()
    
    return jsonify({
        'message': f'User role updated from {old_role} to {new_role}',
        'user': user.to_dict()
    }), 200


@users_bp.route('/<user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update user details (admin only).
    
    Request body:
        - name: User display name (optional)
        - email: User email (optional)
        - role: User role (optional)
    
    Returns:
        - Updated user data
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Update name
    if 'name' in data:
        name = data['name'].strip()
        if not name:
            return jsonify({'error': 'Name cannot be empty'}), 400
        user.name = name
    
    # Update email
    if 'email' in data:
        email = data['email'].strip().lower()
        if not email or '@' not in email:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Check if email is already taken by another user
        existing = User.query.filter(User.email == email, User.id != user_id).first()
        if existing:
            return jsonify({'error': 'Email already in use'}), 409
        
        user.email = email
    
    # Update role
    if 'role' in data:
        new_role = data['role']
        if new_role not in VALID_ROLES:
            return jsonify({'error': f'Invalid role. Must be one of: {", ".join(VALID_ROLES)}'}), 400
        
        # Prevent self-demotion
        current_user_id = request.current_user['user_id']
        if user_id == current_user_id and new_role != 'admin':
            return jsonify({'error': 'Cannot demote yourself'}), 400
        
        user.role = new_role
    
    db.session.commit()
    
    return jsonify({
        'message': 'User updated successfully',
        'user': user.to_dict()
    }), 200


@users_bp.route('/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete a user (admin only).
    
    Returns:
        - Success message
    """
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Prevent self-deletion
    current_user_id = request.current_user['user_id']
    if user_id == current_user_id:
        return jsonify({'error': 'Cannot delete yourself'}), 400
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'User deleted successfully'}), 200


@users_bp.route('', methods=['POST'])
@admin_required
def create_user():
    """Create a new user (admin only).
    
    Request body:
        - email: User email (required)
        - password: User password (required)
        - name: User display name (required)
        - role: User role (optional, default: 'viewer')
    
    Returns:
        - Created user data
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    role = data.get('role', 'viewer')
    
    # Validate required fields
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    if not password:
        return jsonify({'error': 'Password is required'}), 400
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    # Validate email format
    if '@' not in email or '.' not in email:
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Validate password strength
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    # Validate role
    if role not in VALID_ROLES:
        return jsonify({'error': f'Invalid role. Must be one of: {", ".join(VALID_ROLES)}'}), 400
    
    # Check if user already exists
    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({'error': 'Email already registered'}), 409
    
    # Create user
    user = User(
        email=email,
        password_hash=hash_password(password),
        name=name,
        role=role
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'message': 'User created successfully',
        'user': user.to_dict()
    }), 201


@users_bp.route('/roles', methods=['GET'])
@token_required
def get_roles():
    """Get available roles and their descriptions.
    
    Returns:
        - List of roles with descriptions
    """
    roles = [
        {
            'id': 'admin',
            'name': 'Administrator',
            'description': 'Full access to all features including user management',
            'level': 3
        },
        {
            'id': 'editor',
            'name': 'Editor',
            'description': 'Can create, edit, and delete documents',
            'level': 2
        },
        {
            'id': 'viewer',
            'name': 'Viewer',
            'description': 'Can view documents and search',
            'level': 1
        }
    ]
    
    return jsonify({'roles': roles}), 200


@users_bp.route('/stats', methods=['GET'])
@admin_required
def get_user_stats():
    """Get user statistics (admin only).
    
    Returns:
        - User count by role
        - Total users
    """
    total = User.query.count()
    admin_count = User.query.filter_by(role='admin').count()
    editor_count = User.query.filter_by(role='editor').count()
    viewer_count = User.query.filter_by(role='viewer').count()
    
    return jsonify({
        'total': total,
        'by_role': {
            'admin': admin_count,
            'editor': editor_count,
            'viewer': viewer_count
        }
    }), 200
