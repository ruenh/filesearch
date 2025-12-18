"""Activity logging utility functions.

Provides helper functions for logging user actions throughout the application.
Requirements: 53.1, 63.1
"""
from functools import wraps
from flask import g, request
from backend.models.activity_log import ActivityLog


def log_activity(action, resource_type, resource_id=None, resource_name=None, 
                 user_id=None, details=None):
    """Log a user activity.
    
    Args:
        action: The action type (e.g., 'document_upload')
        resource_type: The type of resource (e.g., 'document')
        resource_id: Optional ID of the resource
        resource_name: Optional name of the resource
        user_id: Optional ID of the user (will try to get from g.current_user if not provided)
        details: Optional dictionary with additional details
    
    Returns:
        The created ActivityLog instance
    """
    # Try to get user_id from current user if not provided
    if user_id is None:
        user_id = getattr(g, 'current_user_id', None)
        if user_id is None and hasattr(g, 'current_user'):
            user_id = getattr(g.current_user, 'id', None)
    
    return ActivityLog.log_action(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_name=resource_name,
        user_id=user_id,
        details=details
    )


def log_document_action(action, document, user_id=None, details=None):
    """Log a document-related action.
    
    Args:
        action: The action type (e.g., 'document_upload', 'document_view')
        document: The Document object
        user_id: Optional user ID
        details: Optional additional details
    """
    return log_activity(
        action=action,
        resource_type='document',
        resource_id=document.id,
        resource_name=document.name,
        user_id=user_id,
        details=details
    )


def log_storage_action(action, storage, user_id=None, details=None):
    """Log a storage-related action.
    
    Args:
        action: The action type (e.g., 'storage_create', 'storage_delete')
        storage: The Storage object
        user_id: Optional user ID
        details: Optional additional details
    """
    return log_activity(
        action=action,
        resource_type='storage',
        resource_id=storage.id,
        resource_name=storage.name,
        user_id=user_id,
        details=details
    )


def log_folder_action(action, folder, user_id=None, details=None):
    """Log a folder-related action.
    
    Args:
        action: The action type (e.g., 'folder_create', 'folder_delete')
        folder: The Folder object
        user_id: Optional user ID
        details: Optional additional details
    """
    return log_activity(
        action=action,
        resource_type='folder',
        resource_id=folder.id,
        resource_name=folder.name,
        user_id=user_id,
        details=details
    )


def log_user_action(action, user=None, user_id=None, details=None):
    """Log a user-related action.
    
    Args:
        action: The action type (e.g., 'user_login', 'user_register')
        user: Optional User object
        user_id: Optional user ID
        details: Optional additional details
    """
    resource_id = user.id if user else user_id
    resource_name = user.name if user else None
    
    return log_activity(
        action=action,
        resource_type='user',
        resource_id=resource_id,
        resource_name=resource_name,
        user_id=user_id or resource_id,
        details=details
    )


def log_search_action(query, user_id=None, storage_id=None, results_count=0):
    """Log a search action.
    
    Args:
        query: The search query string
        user_id: Optional user ID
        storage_id: Optional storage ID where search was performed
        results_count: Number of results found
    """
    return log_activity(
        action='search_perform',
        resource_type='search',
        resource_name=query[:100] if query else None,  # Truncate long queries
        user_id=user_id,
        details={
            'query': query,
            'storage_id': storage_id,
            'results_count': results_count
        }
    )


def log_ai_action(action, document_id=None, document_name=None, user_id=None, details=None):
    """Log an AI-related action.
    
    Args:
        action: The action type (e.g., 'ai_chat', 'ai_summarize')
        document_id: Optional document ID
        document_name: Optional document name
        user_id: Optional user ID
        details: Optional additional details
    """
    return log_activity(
        action=action,
        resource_type='document',
        resource_id=document_id,
        resource_name=document_name,
        user_id=user_id,
        details=details
    )


def log_comment_action(action, comment, user_id=None, details=None):
    """Log a comment-related action.
    
    Args:
        action: The action type (e.g., 'comment_add', 'comment_delete')
        comment: The Comment object
        user_id: Optional user ID
        details: Optional additional details
    """
    return log_activity(
        action=action,
        resource_type='comment',
        resource_id=comment.id,
        resource_name=comment.content[:50] if comment.content else None,
        user_id=user_id,
        details=details
    )


def log_share_action(action, share_link=None, document=None, user_id=None, details=None):
    """Log a share-related action.
    
    Args:
        action: The action type (e.g., 'share_create', 'share_access')
        share_link: Optional ShareLink object
        document: Optional Document object
        user_id: Optional user ID
        details: Optional additional details
    """
    resource_id = share_link.id if share_link else (document.id if document else None)
    resource_name = document.name if document else None
    
    return log_activity(
        action=action,
        resource_type='share',
        resource_id=resource_id,
        resource_name=resource_name,
        user_id=user_id,
        details=details
    )
