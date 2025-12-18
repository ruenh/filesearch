"""Comments API blueprint.

Implements document comments with threaded replies.
Requirements: 52.1, 52.2, 52.3
"""
from flask import Blueprint, jsonify, request

from backend.extensions import db
from backend.models.comment import Comment
from backend.models.document import Document
from backend.models.user import User

comments_bp = Blueprint('comments', __name__)


@comments_bp.route('', methods=['POST'])
def create_comment():
    """Create a new comment on a document.
    
    Accepts JSON body with:
        - document_id (required): ID of the document to comment on
        - user_id (required): ID of the user creating the comment
        - content (required): Comment text content
        - parent_id (optional): ID of parent comment for threaded replies
    
    Returns:
        201: Created comment object
        400: Missing required fields or invalid data
        404: Document, user, or parent comment not found
    
    Requirements: 52.1, 52.3
    """
    data = request.get_json(silent=True) or {}
    
    # Validate required fields
    document_id = data.get('document_id')
    if not document_id:
        return jsonify({'error': 'document_id is required'}), 400
    
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'content is required and cannot be empty'}), 400
    
    # Verify document exists and is not deleted
    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if document.is_deleted:
        return jsonify({'error': 'Cannot comment on a deleted document'}), 400
    
    # Verify user exists
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Verify parent comment if provided (for threaded replies)
    parent_id = data.get('parent_id')
    if parent_id:
        parent_comment = Comment.query.get(parent_id)
        if not parent_comment:
            return jsonify({'error': 'Parent comment not found'}), 404
        if parent_comment.document_id != document_id:
            return jsonify({'error': 'Parent comment belongs to a different document'}), 400
    
    # Create comment
    comment = Comment(
        document_id=document_id,
        user_id=user_id,
        content=content,
        parent_id=parent_id
    )
    
    db.session.add(comment)
    db.session.commit()
    
    return jsonify(comment.to_dict(include_user=True)), 201


@comments_bp.route('/<string:doc_id>', methods=['GET'])
def get_document_comments(doc_id):
    """Get all comments for a document.
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Query parameters:
        - threaded (optional): If 'true', return comments in threaded structure
    
    Returns:
        200: List of comment objects
        404: Document not found
    
    Requirements: 52.2
    """
    document = Document.query.get(doc_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    threaded = request.args.get('threaded', 'true').lower() == 'true'
    
    if threaded:
        # Get only top-level comments (no parent) and include replies recursively
        comments = Comment.query.filter_by(
            document_id=doc_id,
            parent_id=None
        ).order_by(Comment.created_at.asc()).all()
        
        return jsonify([c.to_dict(include_replies=True, include_user=True) for c in comments]), 200
    else:
        # Get all comments flat
        comments = Comment.query.filter_by(
            document_id=doc_id
        ).order_by(Comment.created_at.asc()).all()
        
        return jsonify([c.to_dict(include_user=True) for c in comments]), 200


@comments_bp.route('/comment/<string:comment_id>', methods=['GET'])
def get_comment(comment_id):
    """Get a single comment by ID.
    
    Path parameters:
        - comment_id (str): UUID of the comment
    
    Returns:
        200: Comment object
        404: Comment not found
    """
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404
    
    return jsonify(comment.to_dict(include_replies=True, include_user=True)), 200


@comments_bp.route('/comment/<string:comment_id>', methods=['PUT'])
def update_comment(comment_id):
    """Update a comment's content.
    
    Path parameters:
        - comment_id (str): UUID of the comment
    
    Accepts JSON body with:
        - content (required): New comment text content
    
    Returns:
        200: Updated comment object
        400: Missing content or empty content
        404: Comment not found
    
    Requirements: 52.1
    """
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404
    
    data = request.get_json(silent=True) or {}
    
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'content is required and cannot be empty'}), 400
    
    comment.content = content
    db.session.commit()
    
    return jsonify(comment.to_dict(include_user=True)), 200


@comments_bp.route('/comment/<string:comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    """Delete a comment.
    
    Path parameters:
        - comment_id (str): UUID of the comment
    
    Returns:
        200: Success message
        404: Comment not found
    
    Requirements: 52.1
    """
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'error': 'Comment not found'}), 404
    
    # Delete the comment (cascade will handle replies due to relationship)
    db.session.delete(comment)
    db.session.commit()
    
    return jsonify({
        'message': 'Comment deleted successfully',
        'id': comment_id
    }), 200
