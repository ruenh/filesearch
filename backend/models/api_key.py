"""API Key model for external API access."""
import uuid
import secrets
import hashlib
from datetime import datetime
from backend.extensions import db


class APIKey(db.Model):
    """API Key model for authenticating external API requests."""
    
    __tablename__ = 'api_keys'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    key_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    key_prefix = db.Column(db.String(8), nullable=False)  # First 8 chars for identification
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_used_at = db.Column(db.DateTime, nullable=True)
    request_count = db.Column(db.Integer, default=0, nullable=False)
    rate_limit = db.Column(db.Integer, default=1000, nullable=False)  # Requests per hour
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('api_keys', lazy='dynamic'))
    
    def __repr__(self):
        return f'<APIKey {self.key_prefix}... ({self.name})>'
    
    @staticmethod
    def generate_key():
        """Generate a new API key.
        
        Returns:
            tuple: (raw_key, key_hash, key_prefix)
        """
        raw_key = f"fsr_{secrets.token_urlsafe(32)}"  # fsr = file search rag
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        key_prefix = raw_key[:8]
        return raw_key, key_hash, key_prefix
    
    @staticmethod
    def hash_key(raw_key: str) -> str:
        """Hash an API key for storage/lookup."""
        return hashlib.sha256(raw_key.encode()).hexdigest()
    
    def is_valid(self) -> bool:
        """Check if the API key is valid (active and not expired)."""
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False
        return True
    
    def update_usage(self):
        """Update the last used timestamp and increment request count."""
        self.last_used_at = datetime.utcnow()
        self.request_count += 1
    
    def to_dict(self, include_key=False):
        """Convert API key to dictionary.
        
        Args:
            include_key: If True, includes the key prefix (never the full key)
        """
        result = {
            'id': self.id,
            'name': self.name,
            'key_prefix': f"{self.key_prefix}...",
            'is_active': self.is_active,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'request_count': self.request_count,
            'rate_limit': self.rate_limit,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        return result


class APIKeyUsage(db.Model):
    """Track API key usage for rate limiting."""
    
    __tablename__ = 'api_key_usage'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    api_key_id = db.Column(db.String(36), db.ForeignKey('api_keys.id'), nullable=False, index=True)
    endpoint = db.Column(db.String(255), nullable=False)
    method = db.Column(db.String(10), nullable=False)
    status_code = db.Column(db.Integer, nullable=True)
    response_time_ms = db.Column(db.Integer, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationship
    api_key = db.relationship('APIKey', backref=db.backref('usage_logs', lazy='dynamic'))
    
    def __repr__(self):
        return f'<APIKeyUsage {self.api_key_id} {self.endpoint}>'
