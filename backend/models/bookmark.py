"""Bookmark model for document bookmarks.

Requirements: 39.1, 39.2, 39.3
"""

from datetime import datetime
from backend.extensions import db


class Bookmark(db.Model):
    """Bookmark model for saving positions in documents.
    
    Requirements:
    - 39.1: Save position with custom name
    - 39.2: Display list for current document
    - 39.3: Scroll to position when clicked
    """
    __tablename__ = 'bookmarks'
    
    id = db.Column(db.String(36), primary_key=True)
    document_id = db.Column(db.String(36), db.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    
    # Bookmark details
    name = db.Column(db.String(255), nullable=False)  # Custom name for the bookmark
    position = db.Column(db.Integer, nullable=False)  # Character offset or page number
    position_type = db.Column(db.String(20), default='offset')  # 'offset', 'page', 'line'
    
    # Optional context
    context_text = db.Column(db.Text, nullable=True)  # Text around the bookmark position
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    document = db.relationship('Document', backref=db.backref('bookmarks', lazy='dynamic', cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('bookmarks', lazy='dynamic'))
    
    def to_dict(self):
        """Convert bookmark to dictionary."""
        return {
            'id': self.id,
            'document_id': self.document_id,
            'user_id': self.user_id,
            'name': self.name,
            'position': self.position,
            'position_type': self.position_type,
            'context_text': self.context_text,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
