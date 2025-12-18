"""Search history and saved search models.

Requirements: 14.1, 14.2, 16.1, 16.2
"""
import uuid
from datetime import datetime
from backend.extensions import db


class SearchHistory(db.Model):
    """Model for storing search history.
    
    Requirements: 14.1, 14.2
    """
    
    __tablename__ = 'search_history'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    search_query = db.Column(db.String(500), nullable=False, index=True)
    storage_id = db.Column(db.String(36), db.ForeignKey('storages.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True, index=True)
    result_count = db.Column(db.Integer, default=0)
    filters = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    storage = db.relationship('Storage', backref=db.backref('search_history', lazy='dynamic'))
    user = db.relationship('User', backref=db.backref('search_history', lazy='dynamic'))
    
    def __repr__(self):
        return f'<SearchHistory {self.search_query[:30]}>'
    
    def to_dict(self):
        """Convert search history to dictionary."""
        return {
            'id': self.id,
            'query': self.search_query,
            'storage_id': self.storage_id,
            'user_id': self.user_id,
            'result_count': self.result_count,
            'filters': self.filters,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class SavedSearch(db.Model):
    """Model for saved/bookmarked searches.
    
    Requirements: 16.1, 16.2
    """
    
    __tablename__ = 'saved_searches'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    search_query = db.Column(db.String(500), nullable=False)
    storage_id = db.Column(db.String(36), db.ForeignKey('storages.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True, index=True)
    filters = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    storage = db.relationship('Storage', backref=db.backref('saved_searches', lazy='dynamic'))
    user = db.relationship('User', backref=db.backref('saved_searches', lazy='dynamic'))
    
    def __repr__(self):
        return f'<SavedSearch {self.name}>'
    
    def to_dict(self):
        """Convert saved search to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'query': self.search_query,
            'storage_id': self.storage_id,
            'user_id': self.user_id,
            'filters': self.filters,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
