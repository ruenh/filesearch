"""Chat models for RAG conversations.

Requirements: 7.1, 7.2, 7.3, 20.1, 20.2, 20.4
"""
import uuid
from datetime import datetime
from backend.extensions import db


class ChatSession(db.Model):
    """Chat session model for multi-turn conversations."""
    
    __tablename__ = 'chat_sessions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    storage_id = db.Column(db.String(36), db.ForeignKey('storages.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True, index=True)
    title = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    messages = db.relationship('ChatMessage', backref='session', lazy='dynamic', 
                               cascade='all, delete-orphan', order_by='ChatMessage.created_at')
    
    def __repr__(self):
        return f'<ChatSession {self.id}>'
    
    def to_dict(self, include_messages=False):
        """Convert chat session to dictionary."""
        data = {
            'id': self.id,
            'storage_id': self.storage_id,
            'user_id': self.user_id,
            'title': self.title,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'message_count': self.messages.count()
        }
        if include_messages:
            data['messages'] = [msg.to_dict() for msg in self.messages.all()]
        return data


class ChatMessage(db.Model):
    """Chat message model for individual messages in a conversation."""
    
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = db.Column(db.String(36), db.ForeignKey('chat_sessions.id'), nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    sources = db.Column(db.JSON, nullable=True)  # List of document references
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Index for efficient message retrieval
    __table_args__ = (
        db.Index('idx_chat_message_session_created', 'session_id', 'created_at'),
    )
    
    def __repr__(self):
        return f'<ChatMessage {self.id} ({self.role})>'
    
    def to_dict(self):
        """Convert chat message to dictionary."""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'role': self.role,
            'content': self.content,
            'sources': self.sources or [],
            'timestamp': self.created_at.isoformat() if self.created_at else None
        }
