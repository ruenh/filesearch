"""Webhooks management blueprint.

Requirements: 45.1, 45.2, 45.3
"""
from datetime import datetime
from flask import Blueprint, jsonify, request
from backend.extensions import db
from backend.models.webhook import Webhook, WebhookDelivery
from backend.utils.auth import token_required
from backend.utils.webhooks import test_webhook

webhooks_bp = Blueprint('webhooks', __name__)


@webhooks_bp.route('', methods=['GET'])
@token_required
def list_webhooks():
    """List all webhooks for the current user.
    
    Query params:
        - is_active: Filter by active status (optional)
    
    Returns:
        List of webhooks with status information
    
    Requirements: 45.3
    """
    user_id = request.current_user['user_id']
    
    query = Webhook.query.filter_by(user_id=user_id)
    
    # Filter by active status if specified
    is_active = request.args.get('is_active')
    if is_active is not None:
        query = query.filter_by(is_active=is_active.lower() == 'true')
    
    webhooks = query.order_by(Webhook.created_at.desc()).all()
    
    return jsonify({
        'webhooks': [webhook.to_dict() for webhook in webhooks],
        'count': len(webhooks),
        'available_events': Webhook.EVENT_TYPES
    }), 200


@webhooks_bp.route('', methods=['POST'])
@token_required
def create_webhook():
    """Create a new webhook.
    
    Request body:
        - name: Name/description for the webhook (required)
        - url: Endpoint URL to send events to (required)
        - events: List of event types to subscribe to (required)
        - headers: Custom headers to include (optional)
        - generate_secret: Whether to generate a signing secret (optional, default true)
    
    Returns:
        The created webhook (including secret if generated)
    
    Requirements: 45.1
    """
    data = request.get_json() or {}
    user_id = request.current_user['user_id']
    
    # Validate required fields
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    if len(name) > 255:
        return jsonify({'error': 'Name must be 255 characters or less'}), 400
    
    url = data.get('url', '').strip()
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    if len(url) > 2048:
        return jsonify({'error': 'URL must be 2048 characters or less'}), 400
    
    # Validate URL format
    if not url.startswith(('http://', 'https://')):
        return jsonify({'error': 'URL must start with http:// or https://'}), 400
    
    events = data.get('events', [])
    if not events:
        return jsonify({'error': 'At least one event type is required'}), 400
    
    if not isinstance(events, list):
        return jsonify({'error': 'Events must be a list'}), 400
    
    # Validate event types
    invalid_events = [e for e in events if e not in Webhook.EVENT_TYPES]
    if invalid_events:
        return jsonify({
            'error': f'Invalid event types: {", ".join(invalid_events)}',
            'available_events': list(Webhook.EVENT_TYPES.keys())
        }), 400
    
    # Parse optional fields
    headers = data.get('headers', {})
    if not isinstance(headers, dict):
        return jsonify({'error': 'Headers must be an object'}), 400
    
    # Generate secret if requested (default true)
    generate_secret = data.get('generate_secret', True)
    secret = Webhook.generate_secret() if generate_secret else None
    
    webhook = Webhook(
        user_id=user_id,
        name=name,
        url=url,
        events=events,
        headers=headers,
        secret=secret
    )
    
    db.session.add(webhook)
    db.session.commit()
    
    # Return with secret visible (only shown once)
    response_data = webhook.to_dict(include_secret=True)
    if secret:
        response_data['warning'] = 'Save the secret now. It will not be shown again.'
    
    return jsonify(response_data), 201


@webhooks_bp.route('/events', methods=['GET'])
@token_required
def list_event_types():
    """List all available webhook event types.
    
    Returns:
        Dictionary of event types with descriptions
    """
    return jsonify({
        'events': Webhook.EVENT_TYPES
    }), 200


@webhooks_bp.route('/<webhook_id>', methods=['GET'])
@token_required
def get_webhook(webhook_id):
    """Get details of a specific webhook.
    
    Args:
        webhook_id: The webhook ID
    
    Returns:
        Webhook details
    
    Requirements: 45.3
    """
    user_id = request.current_user['user_id']
    
    webhook = Webhook.query.filter_by(id=webhook_id, user_id=user_id).first()
    if not webhook:
        return jsonify({'error': 'Webhook not found'}), 404
    
    return jsonify(webhook.to_dict()), 200


@webhooks_bp.route('/<webhook_id>', methods=['PUT'])
@token_required
def update_webhook(webhook_id):
    """Update a webhook.
    
    Args:
        webhook_id: The webhook ID
    
    Request body:
        - name: New name (optional)
        - url: New URL (optional)
        - events: New event list (optional)
        - headers: New custom headers (optional)
        - is_active: Enable/disable the webhook (optional)
    
    Returns:
        Updated webhook details
    """
    data = request.get_json() or {}
    user_id = request.current_user['user_id']
    
    webhook = Webhook.query.filter_by(id=webhook_id, user_id=user_id).first()
    if not webhook:
        return jsonify({'error': 'Webhook not found'}), 404
    
    # Update fields
    if 'name' in data:
        name = data['name'].strip()
        if not name:
            return jsonify({'error': 'Name cannot be empty'}), 400
        if len(name) > 255:
            return jsonify({'error': 'Name must be 255 characters or less'}), 400
        webhook.name = name
    
    if 'url' in data:
        url = data['url'].strip()
        if not url:
            return jsonify({'error': 'URL cannot be empty'}), 400
        if len(url) > 2048:
            return jsonify({'error': 'URL must be 2048 characters or less'}), 400
        if not url.startswith(('http://', 'https://')):
            return jsonify({'error': 'URL must start with http:// or https://'}), 400
        webhook.url = url
    
    if 'events' in data:
        events = data['events']
        if not events:
            return jsonify({'error': 'At least one event type is required'}), 400
        if not isinstance(events, list):
            return jsonify({'error': 'Events must be a list'}), 400
        invalid_events = [e for e in events if e not in Webhook.EVENT_TYPES]
        if invalid_events:
            return jsonify({
                'error': f'Invalid event types: {", ".join(invalid_events)}',
                'available_events': list(Webhook.EVENT_TYPES.keys())
            }), 400
        webhook.events = events
    
    if 'headers' in data:
        headers = data['headers']
        if not isinstance(headers, dict):
            return jsonify({'error': 'Headers must be an object'}), 400
        webhook.headers = headers
    
    if 'is_active' in data:
        webhook.is_active = bool(data['is_active'])
    
    db.session.commit()
    
    return jsonify(webhook.to_dict()), 200


@webhooks_bp.route('/<webhook_id>', methods=['DELETE'])
@token_required
def delete_webhook(webhook_id):
    """Delete a webhook.
    
    Args:
        webhook_id: The webhook ID
    
    Returns:
        Success message
    """
    user_id = request.current_user['user_id']
    
    webhook = Webhook.query.filter_by(id=webhook_id, user_id=user_id).first()
    if not webhook:
        return jsonify({'error': 'Webhook not found'}), 404
    
    # Delete delivery logs first
    WebhookDelivery.query.filter_by(webhook_id=webhook_id).delete()
    
    db.session.delete(webhook)
    db.session.commit()
    
    return jsonify({'message': 'Webhook deleted successfully'}), 200


@webhooks_bp.route('/<webhook_id>/regenerate-secret', methods=['POST'])
@token_required
def regenerate_secret(webhook_id):
    """Regenerate the webhook secret.
    
    Args:
        webhook_id: The webhook ID
    
    Returns:
        New secret (only shown once)
    """
    user_id = request.current_user['user_id']
    
    webhook = Webhook.query.filter_by(id=webhook_id, user_id=user_id).first()
    if not webhook:
        return jsonify({'error': 'Webhook not found'}), 404
    
    webhook.secret = Webhook.generate_secret()
    db.session.commit()
    
    return jsonify({
        'id': webhook.id,
        'secret': webhook.secret,
        'warning': 'Save this secret now. It will not be shown again.'
    }), 200


@webhooks_bp.route('/<webhook_id>/test', methods=['POST'])
@token_required
def test_webhook_endpoint(webhook_id):
    """Send a test event to a webhook.
    
    Args:
        webhook_id: The webhook ID
    
    Returns:
        Delivery result
    
    Requirements: 45.2
    """
    user_id = request.current_user['user_id']
    
    webhook = Webhook.query.filter_by(id=webhook_id, user_id=user_id).first()
    if not webhook:
        return jsonify({'error': 'Webhook not found'}), 404
    
    delivery = test_webhook(webhook)
    
    return jsonify({
        'success': delivery.success,
        'delivery': delivery.to_dict()
    }), 200 if delivery.success else 502


@webhooks_bp.route('/<webhook_id>/deliveries', methods=['GET'])
@token_required
def list_deliveries(webhook_id):
    """List delivery history for a webhook.
    
    Args:
        webhook_id: The webhook ID
    
    Query params:
        - limit: Number of deliveries to return (default 50, max 200)
        - offset: Offset for pagination (default 0)
        - success: Filter by success status (optional)
    
    Returns:
        List of delivery records
    """
    user_id = request.current_user['user_id']
    
    webhook = Webhook.query.filter_by(id=webhook_id, user_id=user_id).first()
    if not webhook:
        return jsonify({'error': 'Webhook not found'}), 404
    
    limit = min(int(request.args.get('limit', 50)), 200)
    offset = int(request.args.get('offset', 0))
    
    query = WebhookDelivery.query.filter_by(webhook_id=webhook_id)
    
    # Filter by success status if specified
    success = request.args.get('success')
    if success is not None:
        query = query.filter_by(success=success.lower() == 'true')
    
    total = query.count()
    
    deliveries = query.order_by(
        WebhookDelivery.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    return jsonify({
        'deliveries': [d.to_dict() for d in deliveries],
        'pagination': {
            'total': total,
            'limit': limit,
            'offset': offset
        }
    }), 200
