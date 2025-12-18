"""Version model."""
import uuid
from datetime import datetime
from backend.extensions import db


class Version(db.Model):
    """Version model for document history."""
    
    __tablename__ = 'versions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = db.Column(db.String(36), db.ForeignKey('documents.id'), nullable=False, index=True)
    version_number = db.Column(db.Integer, nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    size = db.Column(db.Integer, default=0)
    content_hash = db.Column(db.String(64), nullable=True)
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Indexes
    __table_args__ = (
        db.Index('idx_version_document_number', 'document_id', 'version_number'),
    )
    
    def __repr__(self):
        return f'<Version {self.document_id}:{self.version_number}>'
    
    def to_dict(self):
        """Convert version to dictionary."""
        return {
            'id': self.id,
            'document_id': self.document_id,
            'version_number': self.version_number,
            'size': self.size,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
