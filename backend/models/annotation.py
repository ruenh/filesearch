"""Annotation model for document annotations.

Requirements: 38.1, 38.2, 38.3
"""

from datetime import datetime
from backend.extensions import db


class Annotation(db.Model):
    """Annotation model for storing text annotations on documents.
    
    Requirements:
    - 38.1: Show annotation option when text is selected
    - 38.2: Save annotation with selected text reference
    - 38.3: Highlight annotated sections when viewing document
    """
    __tablename__ = 'annotations'
    
    id = db.Column(db.String(36), primary_key=True)
    document_id = db.Column(db.String(36), db.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    
    # Selected text and position
    selected_text = db.Column(db.Text, nullable=False)
    start_offset = db.Column(db.Integer, nullable=False)  # Character offset from start
    end_offset = db.Column(db.Integer, nullable=False)    # Character offset from start
    
    # Annotation content
    note = db.Column(db.Text, nullable=True)  # User's note/comment
    color = db.Column(db.String(20), default='yellow')  # Highlight color
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    document = db.relationship('Document', backref=db.backref('annotations', lazy='dynamic', cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('annotations', lazy='dynamic'))
    
    def to_dict(self):
        """Convert annotation to dictionary."""
        return {
            'id': self.id,
            'document_id': self.document_id,
            'user_id': self.user_id,
            'selected_text': self.selected_text,
            'start_offset': self.start_offset,
            'end_offset': self.end_offset,
            'note': self.note,
            'color': self.color,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
