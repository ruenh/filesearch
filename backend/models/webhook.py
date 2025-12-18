"""Webhook model for external integrations.

Requirements: 45.1, 45.2, 45.3
"""
import uuid
import secrets
from datetime import datetime
from backend.extensions import db


class Webhook(db.Model):
    """Webhook model for sending HTTP callbacks to external systems."""
    
    __tablename__ = 'webhooks'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(2048), nullable=False)
    secret = db.Column(db.String(64), nullable=True)  # For signature verification
    events = db.Column(db.JSON, nullable=False, default=list)  # List of event types to trigger on
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    headers = db.Column(db.JSON, default=dict)  # Custom headers to send
    last_triggered_at = db.Column(db.DateTime, nullable=True)
    last_status_code = db.Column(db.Integer, nullable=True)
    last_error = db.Column(db.Text, nullable=True)
    success_count = db.Column(db.Integer, default=0, nullable=False)
    failure_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('webhooks', lazy='dynamic'))
    
    # Supported event types
    EVENT_TYPES = {
        # Document events
        'document.created': 'Document uploaded',
        'document.updated': 'Document updated',
        'document.deleted': 'Document deleted',
        'document.restored': 'Document restored from trash',
        'document.moved': 'Document moved to folder',
        
        # Storage events
        'storage.created': 'Storage created',
        'storage.deleted': 'Storage deleted',
        
        # Folder events
        'folder.created': 'Folder created',
        'folder.deleted': 'Folder deleted',
        
        # Tag events
        'tag.added': 'Tag added to document',
        'tag.removed': 'Tag removed from document',
        
        # Comment events
        'comment.created': 'Comment added',
        'comment.deleted': 'Comment deleted',
        
        # Share events
        'share.created': 'Share link created',
        'share.accessed': 'Shared document accessed',
    }
    
    def __repr__(self):
        return f'<Webhook {self.name} ({self.url[:50]}...)>'
    
    @staticmethod
    def generate_secret():
        """Generate a webhook secret for signature verification."""
        return secrets.token_hex(32)
    
    def is_subscribed_to(self, event_type: str) -> bool:
        """Check if webhook is subscribed to a specific event type."""
        return event_type in (self.events or [])
    
    def record_success(self, status_code: int):
        """Record a successful webhook delivery."""
        self.last_triggered_at = datetime.utcnow()
        self.last_status_code = status_code
        self.last_error = None
        self.success_count += 1
    
    def record_failure(self, status_code: int = None, error: str = None):
        """Record a failed webhook delivery."""
        self.last_triggered_at = datetime.utcnow()
        self.last_status_code = status_code
        self.last_error = error
        self.failure_count += 1
    
    def to_dict(self, include_secret: bool = False):
        """Convert webhook to dictionary."""
        result = {
            'id': self.id,
            'name': self.name,
            'url': self.url,
            'events': self.events or [],
            'is_active': self.is_active,
            'headers': self.headers or {},
            'last_triggered_at': self.last_triggered_at.isoformat() if self.last_triggered_at else None,
            'last_status_code': self.last_status_code,
            'last_error': self.last_error,
            'success_count': self.success_count,
            'failure_count': self.failure_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_secret and self.secret:
            result['secret'] = self.secret
        elif self.secret:
            result['has_secret'] = True
        
        return result


class WebhookDelivery(db.Model):
    """Track webhook delivery attempts."""
    
    __tablename__ = 'webhook_deliveries'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    webhook_id = db.Column(db.String(36), db.ForeignKey('webhooks.id'), nullable=False, index=True)
    event_type = db.Column(db.String(100), nullable=False, index=True)
    payload = db.Column(db.JSON, nullable=False)
    status_code = db.Column(db.Integer, nullable=True)
    response_body = db.Column(db.Text, nullable=True)
    error = db.Column(db.Text, nullable=True)
    success = db.Column(db.Boolean, default=False, nullable=False)
    duration_ms = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationship
    webhook = db.relationship('Webhook', backref=db.backref('deliveries', lazy='dynamic'))
    
    # Index for cleanup queries
    __table_args__ = (
        db.Index('idx_delivery_webhook_created', 'webhook_id', 'created_at'),
    )
    
    def __repr__(self):
        return f'<WebhookDelivery {self.webhook_id} {self.event_type}>'
    
    def to_dict(self):
        """Convert delivery to dictionary."""
        return {
            'id': self.id,
            'webhook_id': self.webhook_id,
            'event_type': self.event_type,
            'payload': self.payload,
            'status_code': self.status_code,
            'response_body': self.response_body[:500] if self.response_body else None,
            'error': self.error,
            'success': self.success,
            'duration_ms': self.duration_ms,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
