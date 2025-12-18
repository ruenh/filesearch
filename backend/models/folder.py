"""Folder model."""
import uuid
from datetime import datetime
from backend.extensions import db


class Folder(db.Model):
    """Folder model for document organization."""
    
    __tablename__ = 'folders'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    storage_id = db.Column(db.String(36), db.ForeignKey('storages.id'), nullable=False, index=True)
    parent_id = db.Column(db.String(36), db.ForeignKey('folders.id'), nullable=True, index=True)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Self-referential relationship for nested folders
    children = db.relationship(
        'Folder',
        backref=db.backref('parent', remote_side=[id]),
        lazy='dynamic',
        cascade='all, delete-orphan'
    )
    
    # Documents in this folder
    documents = db.relationship('Document', backref='folder', lazy='dynamic')
    
    def __repr__(self):
        return f'<Folder {self.name}>'
    
    def to_dict(self, include_children=False):
        """Convert folder to dictionary."""
        data = {
            'id': self.id,
            'storage_id': self.storage_id,
            'parent_id': self.parent_id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_children:
            data['children'] = [child.to_dict(include_children=True) for child in self.children]
        return data
