"""Tag model."""
import uuid
from datetime import datetime
from backend.extensions import db


# Association table for many-to-many relationship between documents and tags
document_tags = db.Table(
    'document_tags',
    db.Column('document_id', db.String(36), db.ForeignKey('documents.id'), primary_key=True),
    db.Column('tag_id', db.String(36), db.ForeignKey('tags.id'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.utcnow)
)


class Tag(db.Model):
    """Tag model for document categorization."""
    
    __tablename__ = 'tags'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False, index=True)
    color = db.Column(db.String(7), default='#3B82F6')  # Default blue color
    is_auto_generated = db.Column(db.Boolean, default=False)
    storage_id = db.Column(db.String(36), db.ForeignKey('storages.id'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Unique constraint on name within a storage
    __table_args__ = (
        db.UniqueConstraint('name', 'storage_id', name='uq_tag_name_storage'),
    )
    
    def __repr__(self):
        return f'<Tag {self.name}>'
    
    @property
    def document_count(self):
        """Get count of documents with this tag."""
        return len(self.documents.all())
    
    def to_dict(self):
        """Convert tag to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'color': self.color,
            'is_auto_generated': self.is_auto_generated,
            'document_count': self.document_count
        }
