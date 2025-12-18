"""Document model."""
import uuid
from datetime import datetime
from backend.extensions import db


class Document(db.Model):
    """Document model for uploaded files."""
    
    __tablename__ = 'documents'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    storage_id = db.Column(db.String(36), db.ForeignKey('storages.id'), nullable=False, index=True)
    folder_id = db.Column(db.String(36), db.ForeignKey('folders.id'), nullable=True, index=True)
    name = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    size = db.Column(db.Integer, default=0)
    file_path = db.Column(db.String(500), nullable=True)
    gemini_file_id = db.Column(db.String(255), nullable=True)
    content_hash = db.Column(db.String(64), nullable=True)
    
    # OCR extracted text for images (Requirements: 10.1, 10.2)
    ocr_text = db.Column(db.Text, nullable=True)
    
    # Status flags
    is_favorite = db.Column(db.Boolean, default=False, index=True)
    is_archived = db.Column(db.Boolean, default=False, index=True)
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    deleted_at = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    versions = db.relationship('Version', backref='document', lazy='dynamic', cascade='all, delete-orphan')
    tags = db.relationship('Tag', secondary='document_tags', backref=db.backref('documents', lazy='dynamic'))
    
    # Indexes
    __table_args__ = (
        db.Index('idx_document_storage_deleted', 'storage_id', 'is_deleted'),
        db.Index('idx_document_folder', 'folder_id'),
    )
    
    def __repr__(self):
        return f'<Document {self.name}>'
    
    def to_dict(self, include_versions=False, include_ocr=False):
        """Convert document to dictionary.
        
        Args:
            include_versions: Include version history
            include_ocr: Include OCR extracted text
        """
        data = {
            'id': self.id,
            'storage_id': self.storage_id,
            'folder_id': self.folder_id,
            'name': self.name,
            'file_type': self.file_type,
            'size': self.size,
            'is_favorite': self.is_favorite,
            'is_archived': self.is_archived,
            'is_deleted': self.is_deleted,
            'has_ocr_text': bool(self.ocr_text),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'tags': [tag.to_dict() for tag in self.tags]
        }
        if include_versions:
            data['versions'] = [v.to_dict() for v in self.versions.order_by(db.desc('version_number'))]
        if include_ocr and self.ocr_text:
            data['ocr_text'] = self.ocr_text
        return data
