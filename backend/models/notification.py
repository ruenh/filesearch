"""Notification model.

Stores in-app notifications for users.
Requirements: 55.1, 55.2, 55.3
"""
import uuid
from datetime import datetime
from backend.extensions import db


class Notification(db.Model):
    """Notification model for in-app notifications."""
    
    __tablename__ = 'notifications'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=True)
    resource_type = db.Column(db.String(50), nullable=True)
    resource_id = db.Column(db.String(36), nullable=True)
    resource_name = db.Column(db.String(255), nullable=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    read_at = db.Column(db.DateTime, nullable=True)
    
    # Relationship to user
    user = db.relationship('User', backref=db.backref('notifications', lazy='dynamic'))
    
    # Indexes for common queries
    __table_args__ = (
        db.Index('idx_notification_user_read', 'user_id', 'is_read'),
        db.Index('idx_notification_user_created', 'user_id', 'created_at'),
    )
    
    # Notification types
    NOTIFICATION_TYPES = {
        # Document notifications
        'document_shared': 'Document shared with you',
        'document_updated': 'Document updated',
        'document_commented': 'New comment on document',
        'document_mentioned': 'You were mentioned in a comment',
        
        # Collaboration notifications
        'user_joined': 'User joined document',
        'comment_reply': 'Reply to your comment',
        
        # System notifications
        'system_announcement': 'System announcement',
        'storage_limit': 'Storage limit warning',
        
        # AI notifications
        'ai_task_complete': 'AI task completed',
        'ai_tags_generated': 'Tags generated for document',
    }
    
    def __repr__(self):
        return f'<Notification {self.type} for {self.user_id}>'
    
    def to_dict(self):
        """Convert notification to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'type_description': self.NOTIFICATION_TYPES.get(self.type, self.type),
            'title': self.title,
            'message': self.message,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'resource_name': self.resource_name,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None
        }
    
    @classmethod
    def create_notification(cls, user_id, notification_type, title, message=None,
                           resource_type=None, resource_id=None, resource_name=None):
        """Create and save a notification.
        
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
        notification = cls(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name
        )
        db.session.add(notification)
        db.session.commit()
        return notification
    
    def mark_as_read(self):
        """Mark this notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()
            db.session.commit()
    
    @classmethod
    def mark_all_as_read(cls, user_id):
        """Mark all notifications for a user as read."""
        now = datetime.utcnow()
        cls.query.filter_by(user_id=user_id, is_read=False).update({
            'is_read': True,
            'read_at': now
        })
        db.session.commit()
    
    @classmethod
    def get_unread_count(cls, user_id):
        """Get count of unread notifications for a user."""
        return cls.query.filter_by(user_id=user_id, is_read=False).count()
    
    @classmethod
    def get_user_notifications(cls, user_id, limit=50, offset=0, unread_only=False):
        """Get notifications for a user.
        
        Args:
            user_id: The user ID
            limit: Maximum number of notifications to return
            offset: Number of notifications to skip
            unread_only: If True, only return unread notifications
        
        Returns:
            List of Notification instances
        """
        query = cls.query.filter_by(user_id=user_id)
        if unread_only:
            query = query.filter_by(is_read=False)
        return query.order_by(cls.created_at.desc()).offset(offset).limit(limit).all()
