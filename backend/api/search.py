"""Search API blueprint.

Implements semantic search functionality using Gemini File Search API.
Requirements: 6.1, 6.2, 9.1, 9.2, 9.3, 14.1, 14.2, 15.1, 15.2, 15.3, 16.1, 16.2, 74.1, 74.2, 74.3
"""
import hashlib
import os
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app

from backend.extensions import db
from backend.models.document import Document
from backend.models.storage import Storage
from backend.models.search_history import SearchHistory, SavedSearch
from backend.utils.cache import CacheManager

search_bp = Blueprint('search', __name__)

# Cache timeout for search results (5 minutes)
SEARCH_CACHE_TIMEOUT = 300


def generate_cache_key(query: str, storage_id: str, filters: dict) -> str:
    """Generate a unique cache key for search query.
    
    Args:
        query: Search query string
        storage_id: Storage ID to search in
        filters: Dictionary of filter parameters
    
    Returns:
        Unique cache key string
    """
    # Create a deterministic string from all parameters
    filter_str = "&".join(f"{k}={v}" for k, v in sorted(filters.items()) if v is not None)
    key_content = f"search:{storage_id}:{query}:{filter_str}"
    # Hash to keep key length manageable
    key_hash = hashlib.md5(key_content.encode()).hexdigest()
    return f"search:{storage_id}:{key_hash}"


def invalidate_storage_search_cache(storage_id: str) -> bool:
    """Invalidate all search cache entries for a storage.
    
    Called when documents in a storage are modified.
    
    Args:
        storage_id: Storage ID to invalidate cache for
    
    Returns:
        True if successful, False otherwise
    """
    pattern = f"search:{storage_id}:*"
    return CacheManager.delete_pattern(pattern)


def extract_snippet(content: str, query: str, max_length: int = 200) -> str:
    """Extract a relevant snippet from content around the query match.
    
    Args:
        content: Full document content
        query: Search query to find
        max_length: Maximum snippet length
    
    Returns:
        Snippet string with context around the match
    """
    if not content or not query:
        return ""
    
    content_lower = content.lower()
    query_lower = query.lower()
    
    # Find the first occurrence of any query word
    query_words = query_lower.split()
    best_pos = -1
    
    for word in query_words:
        pos = content_lower.find(word)
        if pos != -1 and (best_pos == -1 or pos < best_pos):
            best_pos = pos
    
    if best_pos == -1:
        # No match found, return beginning of content
        return content[:max_length] + ("..." if len(content) > max_length else "")
    
    # Calculate snippet boundaries
    start = max(0, best_pos - max_length // 3)
    end = min(len(content), start + max_length)
    
    # Adjust to word boundaries
    if start > 0:
        space_pos = content.find(' ', start)
        if space_pos != -1 and space_pos < start + 20:
            start = space_pos + 1
    
    if end < len(content):
        space_pos = content.rfind(' ', start, end)
        if space_pos != -1 and space_pos > end - 20:
            end = space_pos
    
    snippet = content[start:end]
    
    # Add ellipsis if truncated
    if start > 0:
        snippet = "..." + snippet
    if end < len(content):
        snippet = snippet + "..."
    
    return snippet


def search_with_gemini(query: str, storage_id: str) -> list:
    """Perform semantic search using Gemini API.
    
    Args:
        query: Search query string
        storage_id: Storage ID to search in
    
    Returns:
        List of search results with document IDs and relevance scores
    """
    try:
        import google.generativeai as genai
        
        api_key = current_app.config.get('GEMINI_API_KEY')
        if not api_key:
            current_app.logger.warning('Gemini API key not configured')
            return []
        
        genai.configure(api_key=api_key)
        
        # Get storage to check for Gemini store ID
        storage = db.session.get(Storage, storage_id)
        if not storage:
            return []
        
        # Get all documents with Gemini file IDs in this storage
        documents = Document.query.filter(
            Document.storage_id == storage_id,
            Document.is_deleted == False,
            Document.gemini_file_id.isnot(None)
        ).all()
        
        if not documents:
            return []
        
        # Use Gemini to generate embeddings and find relevant documents
        # For now, we'll use a simple approach with the generative model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build context from documents
        doc_contexts = []
        for doc in documents:
            content = None
            # Read document content if it's a text file
            if doc.file_type in ['txt', 'md']:
                try:
                    upload_folder = current_app.config['UPLOAD_FOLDER']
                    full_path = os.path.join(upload_folder, doc.file_path)
                    if os.path.exists(full_path):
                        with open(full_path, 'r', encoding='utf-8') as f:
                            content = f.read()[:5000]  # Limit content size
                except Exception as e:
                    current_app.logger.error(f"Error reading document {doc.id}: {e}")
            # Use OCR text for images (Requirements: 10.3)
            elif doc.ocr_text:
                content = doc.ocr_text[:5000]
            
            if content:
                doc_contexts.append({
                    'id': doc.id,
                    'name': doc.name,
                    'content': content
                })
        
        if not doc_contexts:
            return []
        
        # Create a prompt for relevance scoring
        docs_text = "\n\n".join([
            f"Document ID: {d['id']}\nName: {d['name']}\nContent: {d['content'][:1000]}"
            for d in doc_contexts
        ])
        
        prompt = f"""Given the following documents and a search query, identify which documents are relevant to the query.
Return a JSON array of objects with 'document_id' and 'relevance_score' (0-100) for relevant documents only.
Only include documents with relevance_score > 30.

Documents:
{docs_text}

Search Query: {query}

Return only valid JSON array, no other text. Example format:
[{{"document_id": "uuid-here", "relevance_score": 85}}]
"""
        
        response = model.generate_content(prompt)
        
        # Parse response
        import json
        try:
            # Extract JSON from response
            response_text = response.text.strip()
            # Handle markdown code blocks
            if response_text.startswith('```'):
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1])
            
            results = json.loads(response_text)
            return results
        except json.JSONDecodeError:
            current_app.logger.error(f"Failed to parse Gemini response: {response.text}")
            return []
        
    except Exception as e:
        current_app.logger.error(f"Gemini search error: {str(e)}")
        return []


def search_local(query: str, storage_id: str) -> list:
    """Perform local text search as fallback.
    
    Searches document names, content (for text files), and OCR text (for images).
    
    Args:
        query: Search query string
        storage_id: Storage ID to search in
    
    Returns:
        List of matching documents with basic relevance scoring
    
    Requirements: 10.3 - Include OCR-extracted content in search results
    """
    results = []
    query_lower = query.lower()
    query_words = set(query_lower.split())
    
    # Get all non-deleted documents in storage
    documents = Document.query.filter(
        Document.storage_id == storage_id,
        Document.is_deleted == False
    ).all()
    
    for doc in documents:
        score = 0
        content = ""
        
        # Check filename match
        name_lower = doc.name.lower()
        for word in query_words:
            if word in name_lower:
                score += 30
        
        # Check content for text files
        if doc.file_type in ['txt', 'md']:
            try:
                upload_folder = current_app.config['UPLOAD_FOLDER']
                full_path = os.path.join(upload_folder, doc.file_path)
                if os.path.exists(full_path):
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    content_lower = content.lower()
                    for word in query_words:
                        count = content_lower.count(word)
                        if count > 0:
                            score += min(count * 10, 50)  # Cap content score
            except Exception as e:
                current_app.logger.error(f"Error reading document {doc.id}: {e}")
        
        # Check OCR text for image files (Requirements: 10.3)
        if doc.file_type == 'image' and doc.ocr_text:
            ocr_lower = doc.ocr_text.lower()
            for word in query_words:
                count = ocr_lower.count(word)
                if count > 0:
                    score += min(count * 10, 50)  # Cap OCR score
            # Use OCR text as content for snippet generation
            if not content:
                content = doc.ocr_text
        
        if score > 0:
            results.append({
                'document_id': doc.id,
                'relevance_score': min(score, 100),
                'content': content
            })
    
    # Sort by relevance score
    results.sort(key=lambda x: x['relevance_score'], reverse=True)
    return results


def apply_filters(documents: list, filters: dict) -> list:
    """Apply filters to search results.
    
    Args:
        documents: List of Document objects
        filters: Dictionary with filter parameters:
            - date_from: ISO date string for minimum date
            - date_to: ISO date string for maximum date
            - file_types: Comma-separated list of file types
            - size_min: Minimum file size in bytes
            - size_max: Maximum file size in bytes
    
    Returns:
        Filtered list of documents
    
    Requirements: 9.1, 9.2, 9.3
    """
    filtered = documents
    
    # Date range filter
    if filters.get('date_from'):
        try:
            date_from = datetime.fromisoformat(filters['date_from'].replace('Z', '+00:00'))
            filtered = [d for d in filtered if d.created_at >= date_from]
        except ValueError:
            pass
    
    if filters.get('date_to'):
        try:
            date_to = datetime.fromisoformat(filters['date_to'].replace('Z', '+00:00'))
            filtered = [d for d in filtered if d.created_at <= date_to]
        except ValueError:
            pass
    
    # File type filter
    if filters.get('file_types'):
        allowed_types = [t.strip().lower() for t in filters['file_types'].split(',')]
        filtered = [d for d in filtered if d.file_type.lower() in allowed_types]
    
    # Size filters
    if filters.get('size_min'):
        try:
            size_min = int(filters['size_min'])
            filtered = [d for d in filtered if d.size >= size_min]
        except ValueError:
            pass
    
    if filters.get('size_max'):
        try:
            size_max = int(filters['size_max'])
            filtered = [d for d in filtered if d.size <= size_max]
        except ValueError:
            pass
    
    return filtered


@search_bp.route('', methods=['POST'])
def search():
    """Perform semantic search across documents in a storage.
    
    Accepts JSON body with:
        - query (required): Search query string
        - storage_id (required): ID of storage to search in
        - filters (optional): Object with filter parameters:
            - date_from: ISO date string
            - date_to: ISO date string
            - file_types: Comma-separated file types (e.g., "txt,pdf,md")
            - size_min: Minimum file size in bytes
            - size_max: Maximum file size in bytes
        - use_ai (optional): Whether to use Gemini AI search (default: true)
    
    Returns:
        200: Search results with document info and snippets
        400: Missing required parameters
        404: Storage not found
    
    Requirements: 6.1, 6.2, 9.1, 9.2, 9.3, 74.1, 74.2
    """
    data = request.get_json(silent=True)
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    query = data.get('query', '').strip()
    if not query:
        return jsonify({'error': 'query is required'}), 400
    
    storage_id = data.get('storage_id')
    if not storage_id:
        return jsonify({'error': 'storage_id is required'}), 400
    
    # Verify storage exists
    storage = db.session.get(Storage, storage_id)
    if not storage:
        return jsonify({'error': 'Storage not found'}), 404
    
    # Extract filters
    filters = data.get('filters', {})
    use_ai = data.get('use_ai', True)
    
    # Generate cache key
    cache_key = generate_cache_key(query, storage_id, filters)
    
    # Check cache first
    cached_result = CacheManager.get(cache_key)
    if cached_result is not None:
        return jsonify({
            'results': cached_result,
            'query': query,
            'storage_id': storage_id,
            'cached': True,
            'total': len(cached_result)
        }), 200
    
    # Perform search
    if use_ai:
        search_results = search_with_gemini(query, storage_id)
    else:
        search_results = []
    
    # Fallback to local search if AI search returns no results
    if not search_results:
        search_results = search_local(query, storage_id)
    
    # Get document details for results
    results = []
    doc_ids = [r['document_id'] for r in search_results]
    documents = Document.query.filter(Document.id.in_(doc_ids)).all()
    doc_map = {d.id: d for d in documents}
    
    # Apply filters to documents
    filtered_docs = apply_filters(list(doc_map.values()), filters)
    filtered_ids = {d.id for d in filtered_docs}
    
    for sr in search_results:
        doc_id = sr['document_id']
        if doc_id not in filtered_ids:
            continue
        
        doc = doc_map.get(doc_id)
        if not doc:
            continue
        
        # Get content for snippet
        content = sr.get('content', '')
        if not content and doc.file_type in ['txt', 'md']:
            try:
                upload_folder = current_app.config['UPLOAD_FOLDER']
                full_path = os.path.join(upload_folder, doc.file_path)
                if os.path.exists(full_path):
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
            except Exception:
                pass
        
        snippet = extract_snippet(content, query)
        
        results.append({
            'documentId': doc.id,
            'documentName': doc.name,
            'snippet': snippet,
            'score': sr['relevance_score'],
            'fileType': doc.file_type,
            'size': doc.size,
            'createdAt': doc.created_at.isoformat() if doc.created_at else None,
            'updatedAt': doc.updated_at.isoformat() if doc.updated_at else None
        })
    
    # Cache results
    CacheManager.set(cache_key, results, SEARCH_CACHE_TIMEOUT)
    
    # Record search in history (Requirements: 14.1)
    try:
        history_entry = SearchHistory(
            search_query=query,
            storage_id=storage_id,
            result_count=len(results),
            filters=filters if filters else {}
        )
        db.session.add(history_entry)
        db.session.commit()
    except Exception as e:
        # Don't fail the search if history recording fails
        current_app.logger.error(f"Failed to record search history: {e}")
        db.session.rollback()
    
    return jsonify({
        'results': results,
        'query': query,
        'storage_id': storage_id,
        'cached': False,
        'total': len(results)
    }), 200


@search_bp.route('/history', methods=['GET'])
def get_search_history():
    """Get search history.
    
    Query parameters:
        - storage_id (optional): Filter by storage ID
        - limit (optional): Maximum number of results (default: 20, max: 100)
        - offset (optional): Offset for pagination (default: 0)
    
    Returns:
        200: List of search history entries with timestamps
    
    Requirements: 14.1, 14.2
    """
    storage_id = request.args.get('storage_id')
    limit = min(int(request.args.get('limit', 20)), 100)
    offset = int(request.args.get('offset', 0))
    
    # Build query
    query = SearchHistory.query.order_by(SearchHistory.created_at.desc())
    
    if storage_id:
        # Verify storage exists
        storage = db.session.get(Storage, storage_id)
        if not storage:
            return jsonify({'error': 'Storage not found'}), 404
        query = query.filter(SearchHistory.storage_id == storage_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    history_items = query.offset(offset).limit(limit).all()
    
    return jsonify({
        'history': [item.to_dict() for item in history_items],
        'total': total,
        'limit': limit,
        'offset': offset
    }), 200


@search_bp.route('/history/<history_id>', methods=['DELETE'])
def delete_search_history(history_id):
    """Delete a search history entry.
    
    Args:
        history_id: ID of the search history entry to delete
    
    Returns:
        200: Success message
        404: History entry not found
    
    Requirements: 14.2
    """
    history_item = db.session.get(SearchHistory, history_id)
    if not history_item:
        return jsonify({'error': 'Search history entry not found'}), 404
    
    db.session.delete(history_item)
    db.session.commit()
    
    return jsonify({'message': 'Search history entry deleted'}), 200


@search_bp.route('/history', methods=['DELETE'])
def clear_search_history():
    """Clear all search history.
    
    Query parameters:
        - storage_id (optional): Clear only history for specific storage
    
    Returns:
        200: Success message with count of deleted entries
    
    Requirements: 14.2
    """
    storage_id = request.args.get('storage_id')
    
    query = SearchHistory.query
    if storage_id:
        query = query.filter(SearchHistory.storage_id == storage_id)
    
    count = query.delete()
    db.session.commit()
    
    return jsonify({
        'message': 'Search history cleared',
        'deleted_count': count
    }), 200


@search_bp.route('/save', methods=['POST'])
def save_search():
    """Save a search query for quick access.
    
    Accepts JSON body with:
        - name (required): Name for the saved search
        - query (required): Search query string
        - storage_id (required): Storage ID
        - filters (optional): Filter parameters
    
    Returns:
        201: Created saved search
        400: Missing required parameters
        404: Storage not found
    
    Requirements: 16.1, 16.2
    """
    data = request.get_json(silent=True)
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400
    
    search_query = data.get('query', '').strip()
    if not search_query:
        return jsonify({'error': 'query is required'}), 400
    
    storage_id = data.get('storage_id')
    if not storage_id:
        return jsonify({'error': 'storage_id is required'}), 400
    
    # Verify storage exists
    storage = db.session.get(Storage, storage_id)
    if not storage:
        return jsonify({'error': 'Storage not found'}), 404
    
    filters = data.get('filters', {})
    
    # Create saved search
    saved_search = SavedSearch(
        name=name,
        search_query=search_query,
        storage_id=storage_id,
        filters=filters
    )
    
    db.session.add(saved_search)
    db.session.commit()
    
    return jsonify(saved_search.to_dict()), 201


@search_bp.route('/save', methods=['GET'])
def get_saved_searches():
    """Get all saved searches.
    
    Query parameters:
        - storage_id (optional): Filter by storage ID
    
    Returns:
        200: List of saved searches
    
    Requirements: 16.2
    """
    storage_id = request.args.get('storage_id')
    
    query = SavedSearch.query.order_by(SavedSearch.created_at.desc())
    
    if storage_id:
        # Verify storage exists
        storage = db.session.get(Storage, storage_id)
        if not storage:
            return jsonify({'error': 'Storage not found'}), 404
        query = query.filter(SavedSearch.storage_id == storage_id)
    
    saved_searches = query.all()
    
    return jsonify({
        'saved_searches': [s.to_dict() for s in saved_searches],
        'total': len(saved_searches)
    }), 200


@search_bp.route('/save/<saved_id>', methods=['GET'])
def get_saved_search(saved_id):
    """Get a specific saved search.
    
    Args:
        saved_id: ID of the saved search
    
    Returns:
        200: Saved search details
        404: Saved search not found
    
    Requirements: 16.2
    """
    saved_search = db.session.get(SavedSearch, saved_id)
    if not saved_search:
        return jsonify({'error': 'Saved search not found'}), 404
    
    return jsonify(saved_search.to_dict()), 200


@search_bp.route('/save/<saved_id>', methods=['PUT'])
def update_saved_search(saved_id):
    """Update a saved search.
    
    Args:
        saved_id: ID of the saved search
    
    Accepts JSON body with:
        - name (optional): New name
        - query (optional): New query
        - filters (optional): New filters
    
    Returns:
        200: Updated saved search
        404: Saved search not found
    
    Requirements: 16.2
    """
    saved_search = db.session.get(SavedSearch, saved_id)
    if not saved_search:
        return jsonify({'error': 'Saved search not found'}), 404
    
    data = request.get_json(silent=True) or {}
    
    if 'name' in data:
        saved_search.name = data['name'].strip()
    if 'query' in data:
        saved_search.search_query = data['query'].strip()
    if 'filters' in data:
        saved_search.filters = data['filters']
    
    db.session.commit()
    
    return jsonify(saved_search.to_dict()), 200


@search_bp.route('/save/<saved_id>', methods=['DELETE'])
def delete_saved_search(saved_id):
    """Delete a saved search.
    
    Args:
        saved_id: ID of the saved search to delete
    
    Returns:
        200: Success message
        404: Saved search not found
    
    Requirements: 16.2
    """
    saved_search = db.session.get(SavedSearch, saved_id)
    if not saved_search:
        return jsonify({'error': 'Saved search not found'}), 404
    
    db.session.delete(saved_search)
    db.session.commit()
    
    return jsonify({'message': 'Saved search deleted'}), 200


@search_bp.route('/suggestions', methods=['GET'])
def get_suggestions():
    """Get autocomplete suggestions based on search history and document content.
    
    Query parameters:
        - q (required): Partial query string to get suggestions for
        - storage_id (optional): Limit suggestions to specific storage
        - limit (optional): Maximum number of suggestions (default: 10, max: 20)
    
    Returns:
        200: List of autocomplete suggestions
        400: Missing query parameter
    
    Requirements: 15.1, 15.2, 15.3
    """
    partial_query = request.args.get('q', '').strip()
    if not partial_query:
        return jsonify({'error': 'q parameter is required'}), 400
    
    storage_id = request.args.get('storage_id')
    limit = min(int(request.args.get('limit', 10)), 20)
    
    suggestions = []
    seen_queries = set()
    
    # Get suggestions from search history (matching queries)
    history_query = SearchHistory.query.filter(
        SearchHistory.search_query.ilike(f'%{partial_query}%')
    ).order_by(SearchHistory.created_at.desc())
    
    if storage_id:
        history_query = history_query.filter(SearchHistory.storage_id == storage_id)
    
    for item in history_query.limit(limit * 2).all():
        query_lower = item.search_query.lower()
        if query_lower not in seen_queries:
            suggestions.append({
                'text': item.search_query,
                'type': 'history',
                'result_count': item.result_count
            })
            seen_queries.add(query_lower)
            if len(suggestions) >= limit:
                break
    
    # If we need more suggestions, get from document names
    if len(suggestions) < limit:
        doc_query = Document.query.filter(
            Document.name.ilike(f'%{partial_query}%'),
            Document.is_deleted == False
        )
        
        if storage_id:
            doc_query = doc_query.filter(Document.storage_id == storage_id)
        
        for doc in doc_query.limit(limit - len(suggestions)).all():
            # Extract matching term from document name
            name_lower = doc.name.lower()
            if name_lower not in seen_queries:
                suggestions.append({
                    'text': doc.name,
                    'type': 'document',
                    'document_id': doc.id
                })
                seen_queries.add(name_lower)
    
    # If we still need more, get from saved searches
    if len(suggestions) < limit:
        saved_query = SavedSearch.query.filter(
            SavedSearch.search_query.ilike(f'%{partial_query}%')
        )
        
        if storage_id:
            saved_query = saved_query.filter(SavedSearch.storage_id == storage_id)
        
        for saved in saved_query.limit(limit - len(suggestions)).all():
            query_lower = saved.search_query.lower()
            if query_lower not in seen_queries:
                suggestions.append({
                    'text': saved.search_query,
                    'type': 'saved',
                    'name': saved.name
                })
                seen_queries.add(query_lower)
    
    return jsonify({
        'suggestions': suggestions[:limit],
        'query': partial_query
    }), 200
