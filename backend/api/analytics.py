"""Analytics API blueprint.

Provides endpoints for analytics dashboard, trends, and reports.
Requirements: 57.1, 58.1, 60.2
"""
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from sqlalchemy import func, desc

from backend.extensions import db
from backend.models.document import Document
from backend.models.storage import Storage
from backend.models.analytics import DocumentView, SearchAnalytics, StorageStats
from backend.models.activity_log import ActivityLog
from backend.utils.analytics import (
    get_popular_documents,
    get_popular_searches,
    get_search_trends,
    get_view_trends,
    update_storage_stats
)

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    """Get analytics dashboard data.
    
    Query parameters:
        - storage_id (optional): Filter by storage ID
        - days (optional): Number of days to include (default: 30, max: 90)
    
    Returns:
        200: Dashboard analytics data including:
            - Storage usage statistics
            - File type breakdown
            - Activity timeline
            - Popular documents
            - Recent activity
    
    Requirements: 57.1, 57.2
    """
    storage_id = request.args.get('storage_id')
    
    try:
        days = min(int(request.args.get('days', 30)), 90)
    except (ValueError, TypeError):
        days = 30
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get storage statistics
    storage_stats = _get_storage_statistics(storage_id)
    
    # Get file type breakdown
    file_type_breakdown = _get_file_type_breakdown(storage_id)
    
    # Get activity timeline (views and searches per day)
    view_timeline = get_view_trends(storage_id, days)
    search_timeline = get_search_trends(storage_id, days)
    
    # Get popular documents
    popular_docs = get_popular_documents(storage_id, days, limit=10)
    popular_documents = _enrich_popular_documents(popular_docs)
    
    # Get popular searches
    popular_searches = get_popular_searches(storage_id, days, limit=10)
    
    # Get recent activity summary
    recent_activity = _get_recent_activity_summary(storage_id, days)
    
    return jsonify({
        'period_days': days,
        'storage_id': storage_id,
        'storage_stats': storage_stats,
        'file_type_breakdown': file_type_breakdown,
        'view_timeline': view_timeline,
        'search_timeline': search_timeline,
        'popular_documents': popular_documents,
        'popular_searches': [
            {'query': query, 'count': count} 
            for query, count in popular_searches
        ],
        'recent_activity': recent_activity,
        'generated_at': datetime.utcnow().isoformat()
    }), 200


@analytics_bp.route('/trends', methods=['GET'])
def get_trends():
    """Get search and view trends.
    
    Query parameters:
        - storage_id (optional): Filter by storage ID
        - days (optional): Number of days to analyze (default: 30, max: 90)
        - type (optional): 'search', 'view', or 'all' (default: 'all')
    
    Returns:
        200: Trend data including:
            - Search volume over time
            - View volume over time
            - Popular search terms
            - Top viewed documents
    
    Requirements: 60.2
    """
    storage_id = request.args.get('storage_id')
    trend_type = request.args.get('type', 'all')
    
    try:
        days = min(int(request.args.get('days', 30)), 90)
    except (ValueError, TypeError):
        days = 30
    
    result = {
        'period_days': days,
        'storage_id': storage_id
    }
    
    if trend_type in ('search', 'all'):
        result['search_trends'] = get_search_trends(storage_id, days)
        result['popular_searches'] = [
            {'query': query, 'count': count}
            for query, count in get_popular_searches(storage_id, days, limit=20)
        ]
        
        # Get search statistics
        start_date = datetime.utcnow() - timedelta(days=days)
        search_query = SearchAnalytics.query.filter(
            SearchAnalytics.searched_at >= start_date
        )
        if storage_id:
            search_query = search_query.filter(SearchAnalytics.storage_id == storage_id)
        
        result['search_stats'] = {
            'total_searches': search_query.count(),
            'avg_results': db.session.query(
                func.avg(SearchAnalytics.result_count)
            ).filter(
                SearchAnalytics.searched_at >= start_date,
                SearchAnalytics.storage_id == storage_id if storage_id else True
            ).scalar() or 0,
            'avg_response_time_ms': db.session.query(
                func.avg(SearchAnalytics.response_time_ms)
            ).filter(
                SearchAnalytics.searched_at >= start_date,
                SearchAnalytics.response_time_ms.isnot(None),
                SearchAnalytics.storage_id == storage_id if storage_id else True
            ).scalar() or 0
        }
    
    if trend_type in ('view', 'all'):
        result['view_trends'] = get_view_trends(storage_id, days)
        
        popular_docs = get_popular_documents(storage_id, days, limit=20)
        result['popular_documents'] = _enrich_popular_documents(popular_docs)
        
        # Get view statistics
        start_date = datetime.utcnow() - timedelta(days=days)
        view_query = DocumentView.query.filter(
            DocumentView.viewed_at >= start_date
        )
        if storage_id:
            view_query = view_query.filter(DocumentView.storage_id == storage_id)
        
        result['view_stats'] = {
            'total_views': view_query.count(),
            'unique_documents': db.session.query(
                func.count(func.distinct(DocumentView.document_id))
            ).filter(
                DocumentView.viewed_at >= start_date,
                DocumentView.storage_id == storage_id if storage_id else True
            ).scalar() or 0
        }
    
    return jsonify(result), 200


@analytics_bp.route('/report', methods=['GET'])
def get_report():
    """Generate an analytics report.
    
    Query parameters:
        - storage_id (optional): Filter by storage ID
        - start_date (optional): Start date (ISO format)
        - end_date (optional): End date (ISO format)
        - format (optional): 'json' or 'csv' (default: 'json')
    
    Returns:
        200: Comprehensive analytics report
    
    Requirements: 58.1
    """
    storage_id = request.args.get('storage_id')
    report_format = request.args.get('format', 'json')
    
    # Parse dates
    try:
        start_date_str = request.args.get('start_date')
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
        else:
            start_date = datetime.utcnow() - timedelta(days=30)
    except (ValueError, TypeError):
        start_date = datetime.utcnow() - timedelta(days=30)
    
    try:
        end_date_str = request.args.get('end_date')
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        else:
            end_date = datetime.utcnow()
    except (ValueError, TypeError):
        end_date = datetime.utcnow()
    
    # Build report data
    report = {
        'report_period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        },
        'storage_id': storage_id,
        'generated_at': datetime.utcnow().isoformat()
    }
    
    # Storage summary
    report['storage_summary'] = _get_storage_statistics(storage_id)
    
    # Document statistics
    report['document_stats'] = _get_document_statistics(storage_id, start_date, end_date)
    
    # Search statistics
    report['search_stats'] = _get_search_statistics(storage_id, start_date, end_date)
    
    # View statistics
    report['view_stats'] = _get_view_statistics(storage_id, start_date, end_date)
    
    # Activity breakdown
    report['activity_breakdown'] = _get_activity_breakdown(storage_id, start_date, end_date)
    
    # Top content
    days = (end_date - start_date).days or 30
    report['top_documents'] = _enrich_popular_documents(
        get_popular_documents(storage_id, days, limit=20)
    )
    report['top_searches'] = [
        {'query': query, 'count': count}
        for query, count in get_popular_searches(storage_id, days, limit=20)
    ]
    
    if report_format == 'csv':
        return _generate_csv_report(report)
    
    return jsonify(report), 200


@analytics_bp.route('/document/<string:document_id>', methods=['GET'])
def get_document_analytics(document_id):
    """Get analytics for a specific document.
    
    Path parameters:
        - document_id: UUID of the document
    
    Query parameters:
        - days (optional): Number of days to analyze (default: 30)
    
    Returns:
        200: Document-specific analytics
        404: Document not found
    """
    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    try:
        days = min(int(request.args.get('days', 30)), 90)
    except (ValueError, TypeError):
        days = 30
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get view count
    total_views = DocumentView.query.filter_by(document_id=document_id).count()
    recent_views = DocumentView.query.filter(
        DocumentView.document_id == document_id,
        DocumentView.viewed_at >= start_date
    ).count()
    
    # Get view timeline
    view_timeline = db.session.query(
        func.date(DocumentView.viewed_at).label('date'),
        func.count(DocumentView.id).label('count')
    ).filter(
        DocumentView.document_id == document_id,
        DocumentView.viewed_at >= start_date
    ).group_by(func.date(DocumentView.viewed_at)).order_by(
        func.date(DocumentView.viewed_at)
    ).all()
    
    # Get unique viewers
    unique_viewers = db.session.query(
        func.count(func.distinct(DocumentView.user_id))
    ).filter(
        DocumentView.document_id == document_id,
        DocumentView.user_id.isnot(None)
    ).scalar() or 0
    
    return jsonify({
        'document_id': document_id,
        'document_name': document.name,
        'period_days': days,
        'total_views': total_views,
        'recent_views': recent_views,
        'unique_viewers': unique_viewers,
        'view_timeline': [
            {'date': str(date), 'count': count}
            for date, count in view_timeline
        ]
    }), 200


@analytics_bp.route('/storage/<string:storage_id>/refresh', methods=['POST'])
def refresh_storage_stats(storage_id):
    """Refresh storage statistics.
    
    Path parameters:
        - storage_id: UUID of the storage
    
    Returns:
        200: Updated storage statistics
        404: Storage not found
    """
    storage = Storage.query.get(storage_id)
    if not storage:
        return jsonify({'error': 'Storage not found'}), 404
    
    stats = update_storage_stats(storage_id)
    
    return jsonify({
        'message': 'Storage statistics refreshed',
        'stats': stats.to_dict()
    }), 200


# Helper functions

def _get_storage_statistics(storage_id=None):
    """Get storage statistics."""
    if storage_id:
        storage = Storage.query.get(storage_id)
        if not storage:
            return {}
        
        # Try to get cached stats
        stats = StorageStats.query.filter_by(storage_id=storage_id).first()
        if stats:
            return stats.to_dict()
        
        # Calculate on the fly
        return {
            'storage_id': storage_id,
            'total_documents': storage.document_count,
            'total_size_bytes': storage.total_size,
            'total_views': DocumentView.query.filter_by(storage_id=storage_id).count(),
            'total_searches': SearchAnalytics.query.filter_by(storage_id=storage_id).count()
        }
    else:
        # Aggregate across all storages
        total_docs = Document.query.filter_by(is_deleted=False).count()
        total_size = db.session.query(func.sum(Document.size)).filter(
            Document.is_deleted == False
        ).scalar() or 0
        total_views = DocumentView.query.count()
        total_searches = SearchAnalytics.query.count()
        
        return {
            'total_documents': total_docs,
            'total_size_bytes': total_size,
            'total_views': total_views,
            'total_searches': total_searches,
            'storage_count': Storage.query.count()
        }


def _get_file_type_breakdown(storage_id=None):
    """Get file type breakdown."""
    query = db.session.query(
        Document.file_type,
        func.count(Document.id).label('count'),
        func.sum(Document.size).label('total_size')
    ).filter(Document.is_deleted == False)
    
    if storage_id:
        query = query.filter(Document.storage_id == storage_id)
    
    results = query.group_by(Document.file_type).all()
    
    return [
        {
            'file_type': ftype or 'unknown',
            'count': count,
            'total_size': total_size or 0
        }
        for ftype, count, total_size in results
    ]


def _enrich_popular_documents(popular_docs):
    """Enrich popular documents with document details."""
    enriched = []
    for doc_id, view_count in popular_docs:
        doc = Document.query.get(doc_id)
        if doc:
            enriched.append({
                'document_id': doc_id,
                'name': doc.name,
                'file_type': doc.file_type,
                'view_count': view_count
            })
    return enriched


def _get_recent_activity_summary(storage_id=None, days=30):
    """Get recent activity summary."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = ActivityLog.query.filter(ActivityLog.timestamp >= start_date)
    
    if storage_id:
        query = query.filter(ActivityLog.resource_id == storage_id)
    
    # Get counts by action type
    action_counts = db.session.query(
        ActivityLog.action,
        func.count(ActivityLog.id).label('count')
    ).filter(ActivityLog.timestamp >= start_date)
    
    if storage_id:
        action_counts = action_counts.filter(ActivityLog.resource_id == storage_id)
    
    action_counts = action_counts.group_by(ActivityLog.action).all()
    
    return {
        'total_activities': query.count(),
        'by_action': {action: count for action, count in action_counts}
    }


def _get_document_statistics(storage_id, start_date, end_date):
    """Get document statistics for the report period."""
    query = Document.query.filter(
        Document.created_at >= start_date,
        Document.created_at <= end_date
    )
    
    if storage_id:
        query = query.filter(Document.storage_id == storage_id)
    
    new_documents = query.count()
    
    # Documents deleted in period
    deleted_query = Document.query.filter(
        Document.is_deleted == True,
        Document.deleted_at >= start_date,
        Document.deleted_at <= end_date
    )
    if storage_id:
        deleted_query = deleted_query.filter(Document.storage_id == storage_id)
    
    deleted_documents = deleted_query.count()
    
    return {
        'new_documents': new_documents,
        'deleted_documents': deleted_documents
    }


def _get_search_statistics(storage_id, start_date, end_date):
    """Get search statistics for the report period."""
    query = SearchAnalytics.query.filter(
        SearchAnalytics.searched_at >= start_date,
        SearchAnalytics.searched_at <= end_date
    )
    
    if storage_id:
        query = query.filter(SearchAnalytics.storage_id == storage_id)
    
    total_searches = query.count()
    
    # Average results per search
    avg_results = db.session.query(
        func.avg(SearchAnalytics.result_count)
    ).filter(
        SearchAnalytics.searched_at >= start_date,
        SearchAnalytics.searched_at <= end_date
    )
    if storage_id:
        avg_results = avg_results.filter(SearchAnalytics.storage_id == storage_id)
    avg_results = avg_results.scalar() or 0
    
    # Searches with no results
    zero_results = query.filter(SearchAnalytics.result_count == 0).count()
    
    # Unique queries
    unique_queries = db.session.query(
        func.count(func.distinct(SearchAnalytics.query_normalized))
    ).filter(
        SearchAnalytics.searched_at >= start_date,
        SearchAnalytics.searched_at <= end_date
    )
    if storage_id:
        unique_queries = unique_queries.filter(SearchAnalytics.storage_id == storage_id)
    unique_queries = unique_queries.scalar() or 0
    
    return {
        'total_searches': total_searches,
        'unique_queries': unique_queries,
        'avg_results_per_search': round(float(avg_results), 2),
        'zero_result_searches': zero_results,
        'zero_result_rate': round(zero_results / total_searches * 100, 2) if total_searches > 0 else 0
    }


def _get_view_statistics(storage_id, start_date, end_date):
    """Get view statistics for the report period."""
    query = DocumentView.query.filter(
        DocumentView.viewed_at >= start_date,
        DocumentView.viewed_at <= end_date
    )
    
    if storage_id:
        query = query.filter(DocumentView.storage_id == storage_id)
    
    total_views = query.count()
    
    # Unique documents viewed
    unique_docs = db.session.query(
        func.count(func.distinct(DocumentView.document_id))
    ).filter(
        DocumentView.viewed_at >= start_date,
        DocumentView.viewed_at <= end_date
    )
    if storage_id:
        unique_docs = unique_docs.filter(DocumentView.storage_id == storage_id)
    unique_docs = unique_docs.scalar() or 0
    
    # Unique users
    unique_users = db.session.query(
        func.count(func.distinct(DocumentView.user_id))
    ).filter(
        DocumentView.viewed_at >= start_date,
        DocumentView.viewed_at <= end_date,
        DocumentView.user_id.isnot(None)
    )
    if storage_id:
        unique_users = unique_users.filter(DocumentView.storage_id == storage_id)
    unique_users = unique_users.scalar() or 0
    
    return {
        'total_views': total_views,
        'unique_documents_viewed': unique_docs,
        'unique_users': unique_users,
        'avg_views_per_document': round(total_views / unique_docs, 2) if unique_docs > 0 else 0
    }


def _get_activity_breakdown(storage_id, start_date, end_date):
    """Get activity breakdown for the report period."""
    query = db.session.query(
        ActivityLog.action,
        func.count(ActivityLog.id).label('count')
    ).filter(
        ActivityLog.timestamp >= start_date,
        ActivityLog.timestamp <= end_date
    )
    
    if storage_id:
        # Filter by storage-related activities
        query = query.filter(
            db.or_(
                ActivityLog.resource_id == storage_id,
                ActivityLog.details['storage_id'].astext == storage_id
            )
        )
    
    results = query.group_by(ActivityLog.action).order_by(desc('count')).all()
    
    return [
        {
            'action': action,
            'description': ActivityLog.ACTION_TYPES.get(action, action),
            'count': count
        }
        for action, count in results
    ]


def _generate_csv_report(report):
    """Generate CSV format report."""
    import csv
    import io
    from flask import Response
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['Analytics Report'])
    writer.writerow(['Generated', report['generated_at']])
    writer.writerow(['Period', f"{report['report_period']['start_date']} to {report['report_period']['end_date']}"])
    writer.writerow([])
    
    # Storage summary
    writer.writerow(['Storage Summary'])
    for key, value in report['storage_summary'].items():
        writer.writerow([key, value])
    writer.writerow([])
    
    # Document stats
    writer.writerow(['Document Statistics'])
    for key, value in report['document_stats'].items():
        writer.writerow([key, value])
    writer.writerow([])
    
    # Search stats
    writer.writerow(['Search Statistics'])
    for key, value in report['search_stats'].items():
        writer.writerow([key, value])
    writer.writerow([])
    
    # View stats
    writer.writerow(['View Statistics'])
    for key, value in report['view_stats'].items():
        writer.writerow([key, value])
    writer.writerow([])
    
    # Top documents
    writer.writerow(['Top Documents'])
    writer.writerow(['Name', 'Type', 'Views'])
    for doc in report['top_documents']:
        writer.writerow([doc['name'], doc['file_type'], doc['view_count']])
    writer.writerow([])
    
    # Top searches
    writer.writerow(['Top Searches'])
    writer.writerow(['Query', 'Count'])
    for search in report['top_searches']:
        writer.writerow([search['query'], search['count']])
    
    output.seek(0)
    
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=analytics_report.csv'}
    )
