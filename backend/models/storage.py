"""Storage model."""
import uuid
from datetime import datetime
from backend.extensions import db


class Storage(db.Model):
    """Storage model for document collections."""
    
    __tablename__ = 'storages'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    gemini_store_id = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    documents = db.relationship('Document', backref='storage', lazy='dynamic', cascade='all, delete-orphan')
    folders = db.relationship('Folder', backref='storage', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Storage {self.name}>'
    
    @property
    def document_count(self):
        """Get count of non-deleted documents."""
        return self.documents.filter_by(is_deleted=False).count()
    
    @property
    def total_size(self):
        """Get total size of all non-deleted documents."""
        from backend.models.document import Document
        result = db.session.query(db.func.sum(Document.size)).filter(
            Document.storage_id == self.id,
            Document.is_deleted == False
        ).scalar()
        return result or 0
    
    def to_dict(self):
        """Convert storage to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'document_count': self.document_count,
            'total_size': self.total_size,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
