"""ShareLink model for document sharing.

Requirements: 51.1, 51.2, 51.3, 65.1, 65.2
"""
import uuid
import secrets
from datetime import datetime
from backend.extensions import db


class ShareLink(db.Model):
    """ShareLink model for sharing documents via unique URLs."""
    
    __tablename__ = 'share_links'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = db.Column(db.String(36), db.ForeignKey('documents.id'), nullable=False, index=True)
    
    # Unique token for the share URL
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    
    # Optional password protection (stored as hash)
    password_hash = db.Column(db.String(255), nullable=True)
    
    # Optional expiration date
    expires_at = db.Column(db.DateTime, nullable=True)
    
    # Access tracking
    access_count = db.Column(db.Integer, default=0)
    last_accessed_at = db.Column(db.DateTime, nullable=True)
    
    # Creator info
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    document = db.relationship('Document', backref=db.backref('share_links', lazy='dynamic'))
    creator = db.relationship('User', backref=db.backref('share_links', lazy='dynamic'))
    
    def __repr__(self):
        return f'<ShareLink {self.token[:8]}...>'
    
    @staticmethod
    def generate_token():
        """Generate a secure random token for the share link."""
        return secrets.token_urlsafe(32)
    
    def set_password(self, password):
        """Set password for the share link."""
        from werkzeug.security import generate_password_hash
        if password:
            self.password_hash = generate_password_hash(password)
        else:
            self.password_hash = None
    
    def check_password(self, password):
        """Check if the provided password matches."""
        from werkzeug.security import check_password_hash
        if not self.password_hash:
            return True  # No password required
        if not password:
            return False
        return check_password_hash(self.password_hash, password)
    
    def is_expired(self):
        """Check if the share link has expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        """Check if the share link is valid (active and not expired)."""
        return self.is_active and not self.is_expired()
    
    def record_access(self):
        """Record an access to this share link."""
        self.access_count += 1
        self.last_accessed_at = datetime.utcnow()
    
    def to_dict(self, include_document=False):
        """Convert share link to dictionary."""
        data = {
            'id': self.id,
            'document_id': self.document_id,
            'token': self.token,
            'has_password': self.password_hash is not None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'access_count': self.access_count,
            'last_accessed_at': self.last_accessed_at.isoformat() if self.last_accessed_at else None,
            'is_active': self.is_active,
            'is_expired': self.is_expired(),
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_document and self.document:
            data['document'] = self.document.to_dict()
        return data
