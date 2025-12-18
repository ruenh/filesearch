"""Comment model for document comments.

Requirements: 52.1, 52.2, 52.3
"""
import uuid
from datetime import datetime
from backend.extensions import db


class Comment(db.Model):
    """Comment model for document comments with threaded replies."""
    
    __tablename__ = 'comments'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = db.Column(db.String(36), db.ForeignKey('documents.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Comment content
    content = db.Column(db.Text, nullable=False)
    
    # Parent comment for threaded replies (null for top-level comments)
    parent_id = db.Column(db.String(36), db.ForeignKey('comments.id'), nullable=True, index=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    document = db.relationship('Document', backref=db.backref('comments', lazy='dynamic', cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('comments', lazy='dynamic'))
    replies = db.relationship('Comment', backref=db.backref('parent', remote_side=[id]), lazy='dynamic')
    
    # Indexes
    __table_args__ = (
        db.Index('idx_comment_document_parent', 'document_id', 'parent_id'),
    )
    
    def __repr__(self):
        return f'<Comment {self.id[:8]}... by {self.user_id[:8]}...>'
    
    def to_dict(self, include_replies=False, include_user=True):
        """Convert comment to dictionary."""
        data = {
            'id': self.id,
            'document_id': self.document_id,
            'user_id': self.user_id,
            'content': self.content,
            'parent_id': self.parent_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_user and self.user:
            data['user'] = {
                'id': self.user.id,
                'name': self.user.name,
                'email': self.user.email
            }
        
        if include_replies:
            data['replies'] = [reply.to_dict(include_replies=True, include_user=include_user) 
                              for reply in self.replies.order_by(Comment.created_at.asc())]
        
        return data
