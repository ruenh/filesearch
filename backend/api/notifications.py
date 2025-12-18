"""Notification API endpoints.

Provides endpoints for managing user notifications.
Requirements: 55.1, 55.2, 55.3
"""
from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.notification import Notification
from backend.utils.auth import get_current_user_id

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/notifications', methods=['GET'])
def get_notifications():
    """Get notifications for the current user.
    
    Query params:
        limit: Maximum number of notifications (default 50)
        offset: Number to skip for pagination (default 0)
        unread_only: If 'true', only return unread notifications
    
    Returns:
        JSON with notifications list and metadata
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    
    # Cap limit at 100
    limit = min(limit, 100)
    
    notifications = Notification.get_user_notifications(
        user_id=user_id,
        limit=limit,
        offset=offset,
        unread_only=unread_only
    )
    
    unread_count = Notification.get_unread_count(user_id)
    
    return jsonify({
        'notifications': [n.to_dict() for n in notifications],
        'unread_count': unread_count,
        'limit': limit,
        'offset': offset
    })


@notifications_bp.route('/notifications/unread-count', methods=['GET'])
def get_unread_count():
    """Get count of unread notifications for the current user.
    
    Returns:
        JSON with unread count
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    count = Notification.get_unread_count(user_id)
    return jsonify({'unread_count': count})


@notifications_bp.route('/notifications/<notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    """Mark a specific notification as read.
    
    Args:
        notification_id: The notification ID
    
    Returns:
        JSON with updated notification
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    notification = Notification.query.filter_by(
        id=notification_id,
        user_id=user_id
    ).first()
    
    if not notification:
        return jsonify({'error': 'Notification not found'}), 404
    
    notification.mark_as_read()
    
    return jsonify({
        'notification': notification.to_dict(),
        'unread_count': Notification.get_unread_count(user_id)
    })


@notifications_bp.route('/notifications/read-all', methods=['PUT'])
def mark_all_notifications_read():
    """Mark all notifications as read for the current user.
    
    Returns:
        JSON with success status and new unread count
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    Notification.mark_all_as_read(user_id)
    
    return jsonify({
        'success': True,
        'unread_count': 0
    })


@notifications_bp.route('/notifications/<notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    """Delete a specific notification.
    
    Args:
        notification_id: The notification ID
    
    Returns:
        JSON with success status
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    notification = Notification.query.filter_by(
        id=notification_id,
        user_id=user_id
    ).first()
    
    if not notification:
        return jsonify({'error': 'Notification not found'}), 404
    
    db.session.delete(notification)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'unread_count': Notification.get_unread_count(user_id)
    })


@notifications_bp.route('/notifications/clear', methods=['DELETE'])
def clear_all_notifications():
    """Delete all notifications for the current user.
    
    Returns:
        JSON with success status
    """
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    Notification.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'unread_count': 0
    })
