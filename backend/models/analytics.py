"""Analytics models for tracking document views and search queries.

Requirements: 56.1, 60.1
"""
import uuid
from datetime import datetime
from backend.extensions import db


class DocumentView(db.Model):
    """Model for tracking document views.
    
    Requirements: 56.1
    """
    
    __tablename__ = 'document_views'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = db.Column(db.String(36), db.ForeignKey('documents.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True, index=True)
    storage_id = db.Column(db.String(36), db.ForeignKey('storages.id'), nullable=False, index=True)
    session_id = db.Column(db.String(100), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
    duration_seconds = db.Column(db.Integer, nullable=True)  # Time spent viewing
    viewed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    document = db.relationship('Document', backref=db.backref('views', lazy='dynamic'))
    user = db.relationship('User', backref=db.backref('document_views', lazy='dynamic'))
    storage = db.relationship('Storage', backref=db.backref('document_views', lazy='dynamic'))
    
    # Indexes for analytics queries
    __table_args__ = (
        db.Index('idx_docview_document_date', 'document_id', 'viewed_at'),
        db.Index('idx_docview_storage_date', 'storage_id', 'viewed_at'),
        db.Index('idx_docview_user_date', 'user_id', 'viewed_at'),
    )
    
    def __repr__(self):
        return f'<DocumentView {self.document_id} at {self.viewed_at}>'
    
    def to_dict(self):
        """Convert document view to dictionary."""
        return {
            'id': self.id,
            'document_id': self.document_id,
            'user_id': self.user_id,
            'storage_id': self.storage_id,
            'duration_seconds': self.duration_seconds,
            'viewed_at': self.viewed_at.isoformat() if self.viewed_at else None
        }


class SearchAnalytics(db.Model):
    """Model for tracking search queries for analytics.
    
    Requirements: 60.1
    """
    
    __tablename__ = 'search_analytics'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    query = db.Column(db.String(500), nullable=False, index=True)
    query_normalized = db.Column(db.String(500), nullable=True, index=True)  # Lowercase, trimmed
    storage_id = db.Column(db.String(36), db.ForeignKey('storages.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True, index=True)
    result_count = db.Column(db.Integer, default=0)
    clicked_result_id = db.Column(db.String(36), nullable=True)  # Document clicked from results
    filters_used = db.Column(db.JSON, default=dict)
    response_time_ms = db.Column(db.Integer, nullable=True)  # Search response time
    searched_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    storage = db.relationship('Storage', backref=db.backref('search_analytics', lazy='dynamic'))
    user = db.relationship('User', backref=db.backref('search_analytics', lazy='dynamic'))
    
    # Indexes for analytics queries
    __table_args__ = (
        db.Index('idx_search_query_date', 'query_normalized', 'searched_at'),
        db.Index('idx_search_storage_date', 'storage_id', 'searched_at'),
        db.Index('idx_search_user_date', 'user_id', 'searched_at'),
    )
    
    def __repr__(self):
        return f'<SearchAnalytics "{self.query[:30]}" at {self.searched_at}>'
    
    def to_dict(self):
        """Convert search analytics to dictionary."""
        return {
            'id': self.id,
            'query': self.query,
            'storage_id': self.storage_id,
            'user_id': self.user_id,
            'result_count': self.result_count,
            'clicked_result_id': self.clicked_result_id,
            'filters_used': self.filters_used,
            'response_time_ms': self.response_time_ms,
            'searched_at': self.searched_at.isoformat() if self.searched_at else None
        }
    
    @classmethod
    def normalize_query(cls, query):
        """Normalize a search query for comparison."""
        if not query:
            return ''
        return query.lower().strip()


class StorageStats(db.Model):
    """Model for caching storage statistics.
    
    This is a denormalized table for faster analytics queries.
    """
    
    __tablename__ = 'storage_stats'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    storage_id = db.Column(db.String(36), db.ForeignKey('storages.id'), nullable=False, unique=True, index=True)
    total_documents = db.Column(db.Integer, default=0)
    total_size_bytes = db.Column(db.BigInteger, default=0)
    total_views = db.Column(db.Integer, default=0)
    total_searches = db.Column(db.Integer, default=0)
    
    # File type breakdown
    file_type_counts = db.Column(db.JSON, default=dict)  # {'pdf': 10, 'txt': 5, ...}
    
    # Last updated
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    storage = db.relationship('Storage', backref=db.backref('stats', uselist=False))
    
    def __repr__(self):
        return f'<StorageStats for {self.storage_id}>'
    
    def to_dict(self):
        """Convert storage stats to dictionary."""
        return {
            'storage_id': self.storage_id,
            'total_documents': self.total_documents,
            'total_size_bytes': self.total_size_bytes,
            'total_views': self.total_views,
            'total_searches': self.total_searches,
            'file_type_counts': self.file_type_counts or {},
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
