"""Analytics utility functions.

Provides helper functions for tracking document views and search queries.
Requirements: 56.1, 60.1
"""
from datetime import datetime, timedelta
from flask import request, g
from sqlalchemy import func

from backend.extensions import db
from backend.models.analytics import DocumentView, SearchAnalytics, StorageStats


def track_document_view(document, user_id=None, session_id=None, duration_seconds=None):
    """Track a document view.
    
    Args:
        document: The Document object being viewed
        user_id: Optional user ID (will try to get from g.current_user if not provided)
        session_id: Optional session identifier
        duration_seconds: Optional time spent viewing
    
    Returns:
        The created DocumentView instance
    
    Requirements: 56.1
    """
    # Try to get user_id from current user if not provided
    if user_id is None:
        user_id = getattr(g, 'current_user_id', None)
        if user_id is None and hasattr(g, 'current_user'):
            user_id = getattr(g.current_user, 'id', None)
    
    # Get request info
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent', '')[:500]
    
    view = DocumentView(
        document_id=document.id,
        storage_id=document.storage_id,
        user_id=user_id,
        session_id=session_id,
        ip_address=ip_address,
        user_agent=user_agent,
        duration_seconds=duration_seconds
    )
    
    db.session.add(view)
    db.session.commit()
    
    # Update storage stats asynchronously (or inline for simplicity)
    _update_storage_view_count(document.storage_id)
    
    return view


def track_search_query(query, storage_id, user_id=None, result_count=0, 
                       filters_used=None, response_time_ms=None):
    """Track a search query for analytics.
    
    Args:
        query: The search query string
        storage_id: The storage ID where search was performed
        user_id: Optional user ID
        result_count: Number of results found
        filters_used: Optional dictionary of filters applied
        response_time_ms: Optional response time in milliseconds
    
    Returns:
        The created SearchAnalytics instance
    
    Requirements: 60.1
    """
    # Try to get user_id from current user if not provided
    if user_id is None:
        user_id = getattr(g, 'current_user_id', None)
        if user_id is None and hasattr(g, 'current_user'):
            user_id = getattr(g.current_user, 'id', None)
    
    analytics = SearchAnalytics(
        query=query,
        query_normalized=SearchAnalytics.normalize_query(query),
        storage_id=storage_id,
        user_id=user_id,
        result_count=result_count,
        filters_used=filters_used or {},
        response_time_ms=response_time_ms
    )
    
    db.session.add(analytics)
    db.session.commit()
    
    # Update storage stats
    _update_storage_search_count(storage_id)
    
    return analytics


def track_search_click(search_analytics_id, document_id):
    """Track when a user clicks on a search result.
    
    Args:
        search_analytics_id: The ID of the SearchAnalytics record
        document_id: The ID of the document clicked
    """
    analytics = db.session.get(SearchAnalytics, search_analytics_id)
    if analytics:
        analytics.clicked_result_id = document_id
        db.session.commit()


def _update_storage_view_count(storage_id):
    """Update the view count in storage stats."""
    stats = StorageStats.query.filter_by(storage_id=storage_id).first()
    if stats:
        stats.total_views = (stats.total_views or 0) + 1
        db.session.commit()


def _update_storage_search_count(storage_id):
    """Update the search count in storage stats."""
    stats = StorageStats.query.filter_by(storage_id=storage_id).first()
    if stats:
        stats.total_searches = (stats.total_searches or 0) + 1
        db.session.commit()


def update_storage_stats(storage_id):
    """Recalculate and update storage statistics.
    
    Args:
        storage_id: The storage ID to update stats for
    """
    from backend.models.document import Document
    
    # Get or create stats record
    stats = StorageStats.query.filter_by(storage_id=storage_id).first()
    if not stats:
        stats = StorageStats(storage_id=storage_id)
        db.session.add(stats)
    
    # Calculate document counts
    docs_query = Document.query.filter_by(storage_id=storage_id, is_deleted=False)
    stats.total_documents = docs_query.count()
    
    # Calculate total size
    size_result = db.session.query(func.sum(Document.size)).filter(
        Document.storage_id == storage_id,
        Document.is_deleted == False
    ).scalar()
    stats.total_size_bytes = size_result or 0
    
    # Calculate file type breakdown
    type_counts = db.session.query(
        Document.file_type,
        func.count(Document.id)
    ).filter(
        Document.storage_id == storage_id,
        Document.is_deleted == False
    ).group_by(Document.file_type).all()
    
    stats.file_type_counts = {ftype: count for ftype, count in type_counts if ftype}
    
    # Calculate view count
    stats.total_views = DocumentView.query.filter_by(storage_id=storage_id).count()
    
    # Calculate search count
    stats.total_searches = SearchAnalytics.query.filter_by(storage_id=storage_id).count()
    
    db.session.commit()
    return stats


def get_document_view_count(document_id, days=None):
    """Get the view count for a document.
    
    Args:
        document_id: The document ID
        days: Optional number of days to limit the count to
    
    Returns:
        The view count
    """
    query = DocumentView.query.filter_by(document_id=document_id)
    
    if days:
        start_date = datetime.utcnow() - timedelta(days=days)
        query = query.filter(DocumentView.viewed_at >= start_date)
    
    return query.count()


def get_popular_documents(storage_id=None, days=7, limit=10):
    """Get the most viewed documents.
    
    Args:
        storage_id: Optional storage ID to filter by
        days: Number of days to consider (default: 7)
        limit: Maximum number of results (default: 10)
    
    Returns:
        List of tuples (document_id, view_count)
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.session.query(
        DocumentView.document_id,
        func.count(DocumentView.id).label('view_count')
    ).filter(
        DocumentView.viewed_at >= start_date
    )
    
    if storage_id:
        query = query.filter(DocumentView.storage_id == storage_id)
    
    results = query.group_by(DocumentView.document_id).order_by(
        func.count(DocumentView.id).desc()
    ).limit(limit).all()
    
    return results


def get_popular_searches(storage_id=None, days=7, limit=10):
    """Get the most popular search queries.
    
    Args:
        storage_id: Optional storage ID to filter by
        days: Number of days to consider (default: 7)
        limit: Maximum number of results (default: 10)
    
    Returns:
        List of tuples (query, search_count)
    
    Requirements: 60.2
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.session.query(
        SearchAnalytics.query_normalized,
        func.count(SearchAnalytics.id).label('search_count')
    ).filter(
        SearchAnalytics.searched_at >= start_date,
        SearchAnalytics.query_normalized != ''
    )
    
    if storage_id:
        query = query.filter(SearchAnalytics.storage_id == storage_id)
    
    results = query.group_by(SearchAnalytics.query_normalized).order_by(
        func.count(SearchAnalytics.id).desc()
    ).limit(limit).all()
    
    return results


def get_search_trends(storage_id=None, days=30):
    """Get search volume trends over time.
    
    Args:
        storage_id: Optional storage ID to filter by
        days: Number of days to analyze (default: 30)
    
    Returns:
        List of dictionaries with date and count
    
    Requirements: 60.2
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Group by date
    query = db.session.query(
        func.date(SearchAnalytics.searched_at).label('date'),
        func.count(SearchAnalytics.id).label('count')
    ).filter(
        SearchAnalytics.searched_at >= start_date
    )
    
    if storage_id:
        query = query.filter(SearchAnalytics.storage_id == storage_id)
    
    results = query.group_by(func.date(SearchAnalytics.searched_at)).order_by(
        func.date(SearchAnalytics.searched_at)
    ).all()
    
    return [{'date': str(date), 'count': count} for date, count in results]


def get_view_trends(storage_id=None, days=30):
    """Get document view trends over time.
    
    Args:
        storage_id: Optional storage ID to filter by
        days: Number of days to analyze (default: 30)
    
    Returns:
        List of dictionaries with date and count
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.session.query(
        func.date(DocumentView.viewed_at).label('date'),
        func.count(DocumentView.id).label('count')
    ).filter(
        DocumentView.viewed_at >= start_date
    )
    
    if storage_id:
        query = query.filter(DocumentView.storage_id == storage_id)
    
    results = query.group_by(func.date(DocumentView.viewed_at)).order_by(
        func.date(DocumentView.viewed_at)
    ).all()
    
    return [{'date': str(date), 'count': count} for date, count in results]
