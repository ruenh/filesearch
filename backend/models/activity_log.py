"""Activity Log model.

Stores all user actions for activity tracking and audit trail.
Requirements: 53.1, 63.1
"""
import uuid
from datetime import datetime
from backend.extensions import db


class ActivityLog(db.Model):
    """Activity log model for tracking user actions."""
    
    __tablename__ = 'activity_logs'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True, index=True)
    action = db.Column(db.String(100), nullable=False, index=True)
    resource_type = db.Column(db.String(50), nullable=False, index=True)
    resource_id = db.Column(db.String(36), nullable=True, index=True)
    resource_name = db.Column(db.String(255), nullable=True)
    details = db.Column(db.JSON, default=dict)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationship to user
    user = db.relationship('User', backref=db.backref('activities', lazy='dynamic'))
    
    # Indexes for common queries
    __table_args__ = (
        db.Index('idx_activity_user_timestamp', 'user_id', 'timestamp'),
        db.Index('idx_activity_resource', 'resource_type', 'resource_id'),
        db.Index('idx_activity_action_timestamp', 'action', 'timestamp'),
    )
    
    # Action types
    ACTION_TYPES = {
        # Document actions
        'document_upload': 'Document uploaded',
        'document_view': 'Document viewed',
        'document_update': 'Document updated',
        'document_delete': 'Document deleted',
        'document_restore': 'Document restored',
        'document_favorite': 'Document favorited',
        'document_unfavorite': 'Document unfavorited',
        'document_archive': 'Document archived',
        'document_unarchive': 'Document unarchived',
        'document_move': 'Document moved',
        'document_duplicate': 'Document duplicated',
        
        # Storage actions
        'storage_create': 'Storage created',
        'storage_delete': 'Storage deleted',
        'storage_export': 'Storage exported',
        
        # Folder actions
        'folder_create': 'Folder created',
        'folder_rename': 'Folder renamed',
        'folder_delete': 'Folder deleted',
        
        # Tag actions
        'tag_create': 'Tag created',
        'tag_add': 'Tag added to document',
        'tag_remove': 'Tag removed from document',
        
        # Search actions
        'search_perform': 'Search performed',
        'search_save': 'Search saved',
        
        # AI actions
        'ai_chat': 'AI chat query',
        'ai_summarize': 'Document summarized',
        'ai_translate': 'Document translated',
        'ai_compare': 'Documents compared',
        'ai_tags': 'Tags generated',
        'ai_similar': 'Similar documents found',
        
        # Collaboration actions
        'comment_add': 'Comment added',
        'comment_delete': 'Comment deleted',
        'share_create': 'Share link created',
        'share_access': 'Shared document accessed',
        
        # User actions
        'user_login': 'User logged in',
        'user_logout': 'User logged out',
        'user_register': 'User registered',
        'user_update': 'User updated',
    }
    
    # Resource types
    RESOURCE_TYPES = [
        'document',
        'storage',
        'folder',
        'tag',
        'search',
        'user',
        'comment',
        'share',
        'system'
    ]
    
    def __repr__(self):
        return f'<ActivityLog {self.action} by {self.user_id}>'
    
    def to_dict(self, include_user=False):
        """Convert activity log to dictionary."""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'action_description': self.ACTION_TYPES.get(self.action, self.action),
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'resource_name': self.resource_name,
            'details': self.details or {},
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
        
        if include_user and self.user:
            data['user'] = {
                'id': self.user.id,
                'name': self.user.name,
                'email': self.user.email
            }
        
        return data
    
    @classmethod
    def log_action(cls, action, resource_type, resource_id=None, resource_name=None, 
                   user_id=None, details=None):
        """Create and save an activity log entry.
        
        Args:
            action: The action type (e.g., 'document_upload')
            resource_type: The type of resource (e.g., 'document')
            resource_id: Optional ID of the resource
            resource_name: Optional name of the resource
            user_id: Optional ID of the user performing the action
            details: Optional dictionary with additional details
        
        Returns:
            The created ActivityLog instance
        """
        log = cls(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            user_id=user_id,
            details=details or {}
        )
        db.session.add(log)
        db.session.commit()
        return log
