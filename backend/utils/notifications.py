"""Notification utility functions.

Provides helper functions for creating and sending notifications.
Requirements: 55.1, 55.2, 55.3
"""
from backend.models.notification import Notification
from backend.websocket.events import send_notification_to_user


def create_and_send_notification(user_id, notification_type, title, message=None,
                                  resource_type=None, resource_id=None, resource_name=None):
    """Create a notification and send it via WebSocket.
    
    Args:
        user_id: The ID of the user to notify
        notification_type: The type of notification
        title: The notification title
        message: Optional detailed message
        resource_type: Optional type of related resource
        resource_id: Optional ID of related resource
        resource_name: Optional name of related resource
    
    Returns:
        The created Notification instance
    """
    # Create notification in database
    notification = Notification.create_notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_name=resource_name
    )
    
    # Send via WebSocket
    send_notification_to_user(user_id, {
        'type': 'new_notification',
        'notification': notification.to_dict()
    })
    
    return notification


def notify_document_shared(user_id, document_id, document_name, shared_by_name):
    """Notify a user that a document was shared with them."""
    return create_and_send_notification(
        user_id=user_id,
        notification_type='document_shared',
        title=f'{shared_by_name} shared a document with you',
        message=f'"{document_name}" has been shared with you.',
        resource_type='document',
        resource_id=document_id,
        resource_name=document_name
    )


def notify_document_updated(user_id, document_id, document_name, updated_by_name):
    """Notify a user that a document they're watching was updated."""
    return create_and_send_notification(
        user_id=user_id,
        notification_type='document_updated',
        title=f'Document updated',
        message=f'"{document_name}" was updated by {updated_by_name}.',
        resource_type='document',
        resource_id=document_id,
        resource_name=document_name
    )


def notify_new_comment(user_id, document_id, document_name, commenter_name):
    """Notify a user about a new comment on their document."""
    return create_and_send_notification(
        user_id=user_id,
        notification_type='document_commented',
        title=f'New comment on your document',
        message=f'{commenter_name} commented on "{document_name}".',
        resource_type='document',
        resource_id=document_id,
        resource_name=document_name
    )


def notify_comment_reply(user_id, document_id, document_name, replier_name):
    """Notify a user about a reply to their comment."""
    return create_and_send_notification(
        user_id=user_id,
        notification_type='comment_reply',
        title=f'Reply to your comment',
        message=f'{replier_name} replied to your comment on "{document_name}".',
        resource_type='document',
        resource_id=document_id,
        resource_name=document_name
    )


def notify_mention(user_id, document_id, document_name, mentioner_name):
    """Notify a user that they were mentioned in a comment."""
    return create_and_send_notification(
        user_id=user_id,
        notification_type='document_mentioned',
        title=f'You were mentioned',
        message=f'{mentioner_name} mentioned you in a comment on "{document_name}".',
        resource_type='document',
        resource_id=document_id,
        resource_name=document_name
    )


def notify_ai_task_complete(user_id, task_type, document_id=None, document_name=None):
    """Notify a user that an AI task has completed."""
    task_names = {
        'summarize': 'Summarization',
        'translate': 'Translation',
        'tags': 'Tag generation',
        'similar': 'Similar documents search'
    }
    task_name = task_names.get(task_type, task_type)
    
    return create_and_send_notification(
        user_id=user_id,
        notification_type='ai_task_complete',
        title=f'{task_name} complete',
        message=f'{task_name} for "{document_name}" has completed.' if document_name else f'{task_name} has completed.',
        resource_type='document' if document_id else None,
        resource_id=document_id,
        resource_name=document_name
    )


def notify_system_announcement(user_id, title, message):
    """Send a system announcement notification to a user."""
    return create_and_send_notification(
        user_id=user_id,
        notification_type='system_announcement',
        title=title,
        message=message,
        resource_type='system'
    )
