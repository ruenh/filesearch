"""API Keys management blueprint."""
from datetime import datetime
from flask import Blueprint, jsonify, request
from backend.extensions import db
from backend.models.api_key import APIKey, APIKeyUsage
from backend.utils.auth import token_required

api_keys_bp = Blueprint('api_keys', __name__)


@api_keys_bp.route('', methods=['GET'])
@token_required
def list_api_keys():
    """List all API keys for the current user.
    
    Returns:
        List of API keys (without the actual key values)
    """
    user_id = request.current_user['user_id']
    
    api_keys = APIKey.query.filter_by(user_id=user_id).order_by(
        APIKey.created_at.desc()
    ).all()
    
    return jsonify({
        'api_keys': [key.to_dict() for key in api_keys],
        'count': len(api_keys)
    }), 200


@api_keys_bp.route('', methods=['POST'])
@token_required
def create_api_key():
    """Create a new API key.
    
    Request body:
        - name: Name/description for the API key (required)
        - rate_limit: Requests per hour limit (optional, default 1000)
        - expires_at: Expiration date ISO string (optional)
    
    Returns:
        The created API key (including the raw key - only shown once!)
    """
    data = request.get_json() or {}
    user_id = request.current_user['user_id']
    
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    if len(name) > 255:
        return jsonify({'error': 'Name must be 255 characters or less'}), 400
    
    # Parse optional fields
    rate_limit = data.get('rate_limit', 1000)
    if not isinstance(rate_limit, int) or rate_limit < 1:
        return jsonify({'error': 'Rate limit must be a positive integer'}), 400
    
    expires_at = None
    if data.get('expires_at'):
        try:
            expires_at = datetime.fromisoformat(data['expires_at'].replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return jsonify({'error': 'Invalid expires_at format. Use ISO 8601'}), 400
    
    # Generate the API key
    raw_key, key_hash, key_prefix = APIKey.generate_key()
    
    api_key = APIKey(
        user_id=user_id,
        name=name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        rate_limit=rate_limit,
        expires_at=expires_at
    )
    
    db.session.add(api_key)
    db.session.commit()
    
    # Return the raw key - this is the only time it will be shown!
    response_data = api_key.to_dict()
    response_data['key'] = raw_key
    response_data['warning'] = 'Save this key now. It will not be shown again.'
    
    return jsonify(response_data), 201


@api_keys_bp.route('/<key_id>', methods=['GET'])
@token_required
def get_api_key(key_id):
    """Get details of a specific API key.
    
    Args:
        key_id: The API key ID
    
    Returns:
        API key details (without the actual key value)
    """
    user_id = request.current_user['user_id']
    
    api_key = APIKey.query.filter_by(id=key_id, user_id=user_id).first()
    if not api_key:
        return jsonify({'error': 'API key not found'}), 404
    
    return jsonify(api_key.to_dict()), 200


@api_keys_bp.route('/<key_id>', methods=['PUT'])
@token_required
def update_api_key(key_id):
    """Update an API key.
    
    Args:
        key_id: The API key ID
    
    Request body:
        - name: New name (optional)
        - rate_limit: New rate limit (optional)
        - is_active: Enable/disable the key (optional)
        - expires_at: New expiration date (optional)
    
    Returns:
        Updated API key details
    """
    data = request.get_json() or {}
    user_id = request.current_user['user_id']
    
    api_key = APIKey.query.filter_by(id=key_id, user_id=user_id).first()
    if not api_key:
        return jsonify({'error': 'API key not found'}), 404
    
    # Update fields
    if 'name' in data:
        name = data['name'].strip()
        if not name:
            return jsonify({'error': 'Name cannot be empty'}), 400
        if len(name) > 255:
            return jsonify({'error': 'Name must be 255 characters or less'}), 400
        api_key.name = name
    
    if 'rate_limit' in data:
        rate_limit = data['rate_limit']
        if not isinstance(rate_limit, int) or rate_limit < 1:
            return jsonify({'error': 'Rate limit must be a positive integer'}), 400
        api_key.rate_limit = rate_limit
    
    if 'is_active' in data:
        api_key.is_active = bool(data['is_active'])
    
    if 'expires_at' in data:
        if data['expires_at'] is None:
            api_key.expires_at = None
        else:
            try:
                api_key.expires_at = datetime.fromisoformat(
                    data['expires_at'].replace('Z', '+00:00')
                )
            except (ValueError, AttributeError):
                return jsonify({'error': 'Invalid expires_at format. Use ISO 8601'}), 400
    
    db.session.commit()
    
    return jsonify(api_key.to_dict()), 200


@api_keys_bp.route('/<key_id>', methods=['DELETE'])
@token_required
def delete_api_key(key_id):
    """Delete an API key.
    
    Args:
        key_id: The API key ID
    
    Returns:
        Success message
    """
    user_id = request.current_user['user_id']
    
    api_key = APIKey.query.filter_by(id=key_id, user_id=user_id).first()
    if not api_key:
        return jsonify({'error': 'API key not found'}), 404
    
    # Delete usage logs first
    APIKeyUsage.query.filter_by(api_key_id=key_id).delete()
    
    db.session.delete(api_key)
    db.session.commit()
    
    return jsonify({'message': 'API key deleted successfully'}), 200


@api_keys_bp.route('/<key_id>/regenerate', methods=['POST'])
@token_required
def regenerate_api_key(key_id):
    """Regenerate an API key (creates new key value, keeps settings).
    
    Args:
        key_id: The API key ID
    
    Returns:
        New API key value (only shown once!)
    """
    user_id = request.current_user['user_id']
    
    api_key = APIKey.query.filter_by(id=key_id, user_id=user_id).first()
    if not api_key:
        return jsonify({'error': 'API key not found'}), 404
    
    # Generate new key
    raw_key, key_hash, key_prefix = APIKey.generate_key()
    
    api_key.key_hash = key_hash
    api_key.key_prefix = key_prefix
    api_key.request_count = 0  # Reset request count
    
    db.session.commit()
    
    response_data = api_key.to_dict()
    response_data['key'] = raw_key
    response_data['warning'] = 'Save this key now. It will not be shown again.'
    
    return jsonify(response_data), 200


@api_keys_bp.route('/<key_id>/usage', methods=['GET'])
@token_required
def get_api_key_usage(key_id):
    """Get usage statistics for an API key.
    
    Args:
        key_id: The API key ID
    
    Query params:
        - limit: Number of recent usage logs to return (default 100)
        - offset: Offset for pagination (default 0)
    
    Returns:
        Usage statistics and recent logs
    """
    user_id = request.current_user['user_id']
    
    api_key = APIKey.query.filter_by(id=key_id, user_id=user_id).first()
    if not api_key:
        return jsonify({'error': 'API key not found'}), 404
    
    limit = min(int(request.args.get('limit', 100)), 1000)
    offset = int(request.args.get('offset', 0))
    
    # Get recent usage logs
    usage_logs = APIKeyUsage.query.filter_by(api_key_id=key_id).order_by(
        APIKeyUsage.timestamp.desc()
    ).offset(offset).limit(limit).all()
    
    # Get total count
    total_count = APIKeyUsage.query.filter_by(api_key_id=key_id).count()
    
    # Calculate stats
    from datetime import timedelta
    now = datetime.utcnow()
    hour_ago = now - timedelta(hours=1)
    day_ago = now - timedelta(days=1)
    
    requests_last_hour = APIKeyUsage.query.filter(
        APIKeyUsage.api_key_id == key_id,
        APIKeyUsage.timestamp >= hour_ago
    ).count()
    
    requests_last_day = APIKeyUsage.query.filter(
        APIKeyUsage.api_key_id == key_id,
        APIKeyUsage.timestamp >= day_ago
    ).count()
    
    return jsonify({
        'api_key': api_key.to_dict(),
        'stats': {
            'total_requests': api_key.request_count,
            'requests_last_hour': requests_last_hour,
            'requests_last_day': requests_last_day,
            'rate_limit': api_key.rate_limit,
            'rate_limit_remaining': max(0, api_key.rate_limit - requests_last_hour)
        },
        'recent_usage': [
            {
                'endpoint': log.endpoint,
                'method': log.method,
                'status_code': log.status_code,
                'response_time_ms': log.response_time_ms,
                'ip_address': log.ip_address,
                'timestamp': log.timestamp.isoformat()
            }
            for log in usage_logs
        ],
        'pagination': {
            'total': total_count,
            'limit': limit,
            'offset': offset
        }
    }), 200
