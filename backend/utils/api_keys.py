"""API Key utilities for authentication and rate limiting."""
import time
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, g
from backend.extensions import db
from backend.models.api_key import APIKey, APIKeyUsage


# In-memory rate limit cache (in production, use Redis)
_rate_limit_cache = {}


def get_api_key_from_request():
    """Extract API key from request headers.
    
    Supports:
        - X-API-Key header
        - Authorization: Bearer <key> header
    
    Returns:
        str: The API key or None if not found
    """
    # Check X-API-Key header first
    api_key = request.headers.get('X-API-Key')
    if api_key:
        return api_key
    
    # Check Authorization header
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('ApiKey '):
        return auth_header.split(' ')[1]
    
    return None


def validate_api_key(raw_key: str):
    """Validate an API key and return the APIKey object if valid.
    
    Args:
        raw_key: The raw API key string
    
    Returns:
        APIKey: The API key object if valid, None otherwise
    """
    if not raw_key:
        return None
    
    key_hash = APIKey.hash_key(raw_key)
    api_key = APIKey.query.filter_by(key_hash=key_hash).first()
    
    if not api_key:
        return None
    
    if not api_key.is_valid():
        return None
    
    return api_key


def check_rate_limit(api_key: APIKey) -> tuple:
    """Check if the API key has exceeded its rate limit.
    
    Args:
        api_key: The APIKey object
    
    Returns:
        tuple: (is_allowed, remaining, reset_time)
    """
    now = datetime.utcnow()
    window_start = now - timedelta(hours=1)
    
    # Count requests in the last hour
    request_count = APIKeyUsage.query.filter(
        APIKeyUsage.api_key_id == api_key.id,
        APIKeyUsage.timestamp >= window_start
    ).count()
    
    remaining = max(0, api_key.rate_limit - request_count)
    reset_time = int((window_start + timedelta(hours=1)).timestamp())
    
    return (request_count < api_key.rate_limit, remaining, reset_time)


def log_api_usage(api_key: APIKey, status_code: int = None, response_time_ms: int = None):
    """Log API key usage for analytics and rate limiting.
    
    Args:
        api_key: The APIKey object
        status_code: HTTP response status code
        response_time_ms: Response time in milliseconds
    """
    usage = APIKeyUsage(
        api_key_id=api_key.id,
        endpoint=request.path,
        method=request.method,
        status_code=status_code,
        response_time_ms=response_time_ms,
        ip_address=request.remote_addr
    )
    db.session.add(usage)
    
    # Update API key usage stats
    api_key.update_usage()
    db.session.commit()


def api_key_required(f):
    """Decorator to require a valid API key for a route.
    
    Sets g.api_key and g.api_key_user_id on successful authentication.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        start_time = time.time()
        
        raw_key = get_api_key_from_request()
        if not raw_key:
            return jsonify({
                'error': 'API key is required',
                'message': 'Provide API key via X-API-Key header or Authorization: ApiKey <key>'
            }), 401
        
        api_key = validate_api_key(raw_key)
        if not api_key:
            return jsonify({
                'error': 'Invalid API key',
                'message': 'The provided API key is invalid, inactive, or expired'
            }), 401
        
        # Check rate limit
        is_allowed, remaining, reset_time = check_rate_limit(api_key)
        
        if not is_allowed:
            response = jsonify({
                'error': 'Rate limit exceeded',
                'message': f'Rate limit of {api_key.rate_limit} requests per hour exceeded',
                'retry_after': reset_time - int(time.time())
            })
            response.headers['X-RateLimit-Limit'] = str(api_key.rate_limit)
            response.headers['X-RateLimit-Remaining'] = '0'
            response.headers['X-RateLimit-Reset'] = str(reset_time)
            return response, 429
        
        # Set context
        g.api_key = api_key
        g.api_key_user_id = api_key.user_id
        
        # Execute the route
        response = f(*args, **kwargs)
        
        # Calculate response time
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Get status code from response
        status_code = response[1] if isinstance(response, tuple) else 200
        
        # Log usage
        log_api_usage(api_key, status_code, response_time_ms)
        
        # Add rate limit headers to response
        if isinstance(response, tuple):
            resp_obj, status = response[0], response[1]
        else:
            resp_obj, status = response, 200
        
        if hasattr(resp_obj, 'headers'):
            resp_obj.headers['X-RateLimit-Limit'] = str(api_key.rate_limit)
            resp_obj.headers['X-RateLimit-Remaining'] = str(remaining - 1)
            resp_obj.headers['X-RateLimit-Reset'] = str(reset_time)
        
        return response
    
    return decorated


def api_key_or_token_required(f):
    """Decorator that accepts either API key or JWT token authentication.
    
    Useful for endpoints that should work with both authentication methods.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        from backend.utils.auth import decode_token
        
        # Try API key first
        raw_key = get_api_key_from_request()
        if raw_key:
            api_key = validate_api_key(raw_key)
            if api_key:
                is_allowed, remaining, reset_time = check_rate_limit(api_key)
                if not is_allowed:
                    return jsonify({
                        'error': 'Rate limit exceeded',
                        'message': f'Rate limit of {api_key.rate_limit} requests per hour exceeded'
                    }), 429
                
                g.api_key = api_key
                g.api_key_user_id = api_key.user_id
                request.current_user = {
                    'user_id': api_key.user_id,
                    'auth_type': 'api_key'
                }
                
                response = f(*args, **kwargs)
                log_api_usage(api_key)
                return response
        
        # Try JWT token
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            payload = decode_token(token)
            if payload and payload.get('type') == 'access':
                request.current_user = {
                    'user_id': payload['user_id'],
                    'email': payload['email'],
                    'role': payload['role'],
                    'auth_type': 'jwt'
                }
                return f(*args, **kwargs)
        
        return jsonify({
            'error': 'Authentication required',
            'message': 'Provide API key via X-API-Key header or JWT token via Authorization: Bearer <token>'
        }), 401
    
    return decorated
