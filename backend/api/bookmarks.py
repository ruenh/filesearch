"""Bookmarks API blueprint.

Implements bookmark CRUD operations for documents.
Requirements: 39.1, 39.2, 39.3
"""

import uuid
from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models import Document
from backend.models.bookmark import Bookmark

bookmarks_bp = Blueprint('bookmarks', __name__, url_prefix='/api/bookmarks')


@bookmarks_bp.route('', methods=['POST'])
def create_bookmark():
    """Create a new bookmark in a document.
    
    Request body:
        - document_id (required): ID of the document
        - name (required): Custom name for the bookmark
        - position (required): Position in document (offset, page, or line)
        - position_type (optional): Type of position ('offset', 'page', 'line')
        - context_text (optional): Text around the bookmark
    
    Returns:
        201: Created bookmark object
        400: Missing required fields
        404: Document not found
    
    Requirements: 39.1
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    required_fields = ['document_id', 'name', 'position']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    document = db.session.get(Document, data['document_id'])
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    bookmark = Bookmark(
        id=str(uuid.uuid4()),
        document_id=data['document_id'],
        name=data['name'],
        position=data['position'],
        position_type=data.get('position_type', 'offset'),
        context_text=data.get('context_text')
    )

    
    db.session.add(bookmark)
    db.session.commit()
    
    return jsonify(bookmark.to_dict()), 201


@bookmarks_bp.route('/document/<document_id>', methods=['GET'])
def get_document_bookmarks(document_id):
    """Get all bookmarks for a document.
    
    Returns:
        200: List of bookmarks
        404: Document not found
    
    Requirements: 39.2
    """
    document = db.session.get(Document, document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    bookmarks = Bookmark.query.filter_by(document_id=document_id).order_by(Bookmark.position).all()
    
    return jsonify({
        'bookmarks': [b.to_dict() for b in bookmarks],
        'count': len(bookmarks)
    })


@bookmarks_bp.route('/<bookmark_id>', methods=['GET'])
def get_bookmark(bookmark_id):
    """Get a specific bookmark.
    
    Returns:
        200: Bookmark object
        404: Bookmark not found
    """
    bookmark = db.session.get(Bookmark, bookmark_id)
    if not bookmark:
        return jsonify({'error': 'Bookmark not found'}), 404
    
    return jsonify(bookmark.to_dict())


@bookmarks_bp.route('/<bookmark_id>', methods=['PUT'])
def update_bookmark(bookmark_id):
    """Update a bookmark.
    
    Request body:
        - name (optional): Updated name
        - position (optional): Updated position
        - context_text (optional): Updated context
    
    Returns:
        200: Updated bookmark object
        404: Bookmark not found
    """
    bookmark = db.session.get(Bookmark, bookmark_id)
    if not bookmark:
        return jsonify({'error': 'Bookmark not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'name' in data:
        bookmark.name = data['name']
    if 'position' in data:
        bookmark.position = data['position']
    if 'context_text' in data:
        bookmark.context_text = data['context_text']
    
    db.session.commit()
    
    return jsonify(bookmark.to_dict())


@bookmarks_bp.route('/<bookmark_id>', methods=['DELETE'])
def delete_bookmark(bookmark_id):
    """Delete a bookmark.
    
    Returns:
        200: Success message
        404: Bookmark not found
    """
    bookmark = db.session.get(Bookmark, bookmark_id)
    if not bookmark:
        return jsonify({'error': 'Bookmark not found'}), 404
    
    db.session.delete(bookmark)
    db.session.commit()
    
    return jsonify({'message': 'Bookmark deleted successfully'})
