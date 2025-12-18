"""Activity API blueprint.

Provides endpoints for retrieving activity logs and history.
Requirements: 53.1, 53.2, 53.3, 63.1
"""
from flask import Blueprint, jsonify, request
from sqlalchemy import desc

from backend.extensions import db
from backend.models.activity_log import ActivityLog
from backend.models.user import User

activity_bp = Blueprint('activity', __name__)


@activity_bp.route('', methods=['GET'])
def get_activity():
    """Get activity logs with optional filtering.
    
    Query parameters:
        - filter (optional): Filter by action type (e.g., 'document_upload')
        - resource_type (optional): Filter by resource type (e.g., 'document')
        - resource_id (optional): Filter by specific resource ID
        - user_id (optional): Filter by user ID
        - limit (optional): Maximum number of results (default: 50, max: 200)
        - offset (optional): Offset for pagination (default: 0)
        - start_date (optional): Filter activities after this date (ISO format)
        - end_date (optional): Filter activities before this date (ISO format)
    
    Returns:
        200: List of activity log objects with pagination info
    
    Requirements: 53.2, 53.3
    """
    # Get query parameters
    action_filter = request.args.get('filter')
    resource_type = request.args.get('resource_type')
    resource_id = request.args.get('resource_id')
    user_id = request.args.get('user_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Pagination
    try:
        limit = min(int(request.args.get('limit', 50)), 200)
    except (ValueError, TypeError):
        limit = 50
    
    try:
        offset = max(int(request.args.get('offset', 0)), 0)
    except (ValueError, TypeError):
        offset = 0
    
    # Build query
    query = ActivityLog.query
    
    # Apply filters
    if action_filter:
        query = query.filter(ActivityLog.action == action_filter)
    
    if resource_type:
        query = query.filter(ActivityLog.resource_type == resource_type)
    
    if resource_id:
        query = query.filter(ActivityLog.resource_id == resource_id)
    
    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    
    if start_date:
        try:
            from datetime import datetime
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(ActivityLog.timestamp >= start_dt)
        except (ValueError, TypeError):
            pass
    
    if end_date:
        try:
            from datetime import datetime
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(ActivityLog.timestamp <= end_dt)
        except (ValueError, TypeError):
            pass
    
    # Get total count before pagination
    total = query.count()
    
    # Order by timestamp descending (most recent first) and apply pagination
    activities = query.order_by(desc(ActivityLog.timestamp)).offset(offset).limit(limit).all()
    
    return jsonify({
        'activities': [a.to_dict(include_user=True) for a in activities],
        'total': total,
        'limit': limit,
        'offset': offset,
        'has_more': offset + len(activities) < total
    }), 200


@activity_bp.route('/types', methods=['GET'])
def get_action_types():
    """Get all available action types.
    
    Returns:
        200: Dictionary of action types with descriptions
    """
    return jsonify({
        'action_types': ActivityLog.ACTION_TYPES,
        'resource_types': ActivityLog.RESOURCE_TYPES
    }), 200


@activity_bp.route('/user/<string:user_id>', methods=['GET'])
def get_user_activity(user_id):
    """Get activity logs for a specific user.
    
    Path parameters:
        - user_id (str): UUID of the user
    
    Query parameters:
        - limit (optional): Maximum number of results (default: 50, max: 200)
        - offset (optional): Offset for pagination (default: 0)
    
    Returns:
        200: List of activity log objects
        404: User not found
    
    Requirements: 53.2
    """
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Pagination
    try:
        limit = min(int(request.args.get('limit', 50)), 200)
    except (ValueError, TypeError):
        limit = 50
    
    try:
        offset = max(int(request.args.get('offset', 0)), 0)
    except (ValueError, TypeError):
        offset = 0
    
    # Get activities for user
    query = ActivityLog.query.filter_by(user_id=user_id)
    total = query.count()
    
    activities = query.order_by(desc(ActivityLog.timestamp)).offset(offset).limit(limit).all()
    
    return jsonify({
        'activities': [a.to_dict(include_user=False) for a in activities],
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email
        },
        'total': total,
        'limit': limit,
        'offset': offset,
        'has_more': offset + len(activities) < total
    }), 200


@activity_bp.route('/resource/<string:resource_type>/<string:resource_id>', methods=['GET'])
def get_resource_activity(resource_type, resource_id):
    """Get activity logs for a specific resource.
    
    Path parameters:
        - resource_type (str): Type of resource (e.g., 'document', 'storage')
        - resource_id (str): UUID of the resource
    
    Query parameters:
        - limit (optional): Maximum number of results (default: 50, max: 200)
        - offset (optional): Offset for pagination (default: 0)
    
    Returns:
        200: List of activity log objects
        400: Invalid resource type
    
    Requirements: 53.2
    """
    if resource_type not in ActivityLog.RESOURCE_TYPES:
        return jsonify({
            'error': f'Invalid resource type. Must be one of: {", ".join(ActivityLog.RESOURCE_TYPES)}'
        }), 400
    
    # Pagination
    try:
        limit = min(int(request.args.get('limit', 50)), 200)
    except (ValueError, TypeError):
        limit = 50
    
    try:
        offset = max(int(request.args.get('offset', 0)), 0)
    except (ValueError, TypeError):
        offset = 0
    
    # Get activities for resource
    query = ActivityLog.query.filter_by(
        resource_type=resource_type,
        resource_id=resource_id
    )
    total = query.count()
    
    activities = query.order_by(desc(ActivityLog.timestamp)).offset(offset).limit(limit).all()
    
    return jsonify({
        'activities': [a.to_dict(include_user=True) for a in activities],
        'resource_type': resource_type,
        'resource_id': resource_id,
        'total': total,
        'limit': limit,
        'offset': offset,
        'has_more': offset + len(activities) < total
    }), 200


@activity_bp.route('/recent', methods=['GET'])
def get_recent_activity():
    """Get the most recent activity across all users.
    
    Query parameters:
        - limit (optional): Maximum number of results (default: 20, max: 100)
    
    Returns:
        200: List of recent activity log objects
    
    Requirements: 53.2
    """
    try:
        limit = min(int(request.args.get('limit', 20)), 100)
    except (ValueError, TypeError):
        limit = 20
    
    activities = ActivityLog.query.order_by(
        desc(ActivityLog.timestamp)
    ).limit(limit).all()
    
    return jsonify({
        'activities': [a.to_dict(include_user=True) for a in activities]
    }), 200


@activity_bp.route('/stats', methods=['GET'])
def get_activity_stats():
    """Get activity statistics.
    
    Query parameters:
        - user_id (optional): Filter stats by user
        - days (optional): Number of days to include (default: 7, max: 30)
    
    Returns:
        200: Activity statistics
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    user_id = request.args.get('user_id')
    
    try:
        days = min(int(request.args.get('days', 7)), 30)
    except (ValueError, TypeError):
        days = 7
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Build base query
    query = ActivityLog.query.filter(ActivityLog.timestamp >= start_date)
    
    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    
    # Get total count
    total_activities = query.count()
    
    # Get counts by action type
    action_counts = db.session.query(
        ActivityLog.action,
        func.count(ActivityLog.id).label('count')
    ).filter(
        ActivityLog.timestamp >= start_date
    )
    
    if user_id:
        action_counts = action_counts.filter(ActivityLog.user_id == user_id)
    
    action_counts = action_counts.group_by(ActivityLog.action).all()
    
    # Get counts by resource type
    resource_counts = db.session.query(
        ActivityLog.resource_type,
        func.count(ActivityLog.id).label('count')
    ).filter(
        ActivityLog.timestamp >= start_date
    )
    
    if user_id:
        resource_counts = resource_counts.filter(ActivityLog.user_id == user_id)
    
    resource_counts = resource_counts.group_by(ActivityLog.resource_type).all()
    
    return jsonify({
        'total_activities': total_activities,
        'days': days,
        'by_action': {action: count for action, count in action_counts},
        'by_resource_type': {rtype: count for rtype, count in resource_counts}
    }), 200
