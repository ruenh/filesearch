"""Share API blueprint.

Implements document sharing via unique links with optional password protection.
Requirements: 51.1, 51.2, 51.3, 65.1, 65.2
"""
import os
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app, send_file

from backend.extensions import db
from backend.models.share_link import ShareLink
from backend.models.document import Document

share_bp = Blueprint('share', __name__)


@share_bp.route('', methods=['POST'])
def create_share_link():
    """Create a new share link for a document.
    
    Accepts JSON body with:
        - document_id (required): ID of the document to share
        - password (optional): Password to protect the link
        - expires_at (optional): ISO format expiration date
    
    Returns:
        201: Created share link object with URL
        400: Missing document_id or invalid data
        404: Document not found
    
    Requirements: 51.1, 51.2, 65.1
    """
    data = request.get_json(silent=True) or {}
    
    document_id = data.get('document_id')
    if not document_id:
        return jsonify({'error': 'document_id is required'}), 400
    
    # Verify document exists and is not deleted
    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if document.is_deleted:
        return jsonify({'error': 'Cannot share a deleted document'}), 400
    
    # Generate unique token
    token = ShareLink.generate_token()
    
    # Create share link
    share_link = ShareLink(
        document_id=document_id,
        token=token
    )
    
    # Set optional password
    password = data.get('password')
    if password:
        share_link.set_password(password)
    
    # Set optional expiration
    expires_at = data.get('expires_at')
    if expires_at:
        try:
            share_link.expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return jsonify({'error': 'Invalid expires_at format. Use ISO format.'}), 400
    
    # Save to database
    db.session.add(share_link)
    db.session.commit()
    
    # Build the share URL
    base_url = request.host_url.rstrip('/')
    share_url = f"{base_url}/share/{token}"
    
    response_data = share_link.to_dict()
    response_data['url'] = share_url
    
    return jsonify(response_data), 201


@share_bp.route('/<string:token>', methods=['GET'])
def get_shared_document(token):
    """Access a shared document via token.
    
    Path parameters:
        - token (str): The share link token
    
    Query parameters:
        - password (optional): Password if the link is protected
    
    Returns:
        200: Document metadata and content info
        401: Password required or incorrect
        404: Share link not found or expired
        410: Share link has expired
    
    Requirements: 51.3, 65.2
    """
    share_link = ShareLink.query.filter_by(token=token).first()
    
    if not share_link:
        return jsonify({'error': 'Share link not found'}), 404
    
    if not share_link.is_active:
        return jsonify({'error': 'Share link is no longer active'}), 404
    
    if share_link.is_expired():
        return jsonify({'error': 'Share link has expired'}), 410
    
    # Check password if required
    if share_link.password_hash:
        password = request.args.get('password') or request.headers.get('X-Share-Password')
        if not password:
            return jsonify({
                'error': 'Password required',
                'password_required': True
            }), 401
        if not share_link.check_password(password):
            return jsonify({'error': 'Incorrect password'}), 401
    
    # Get the document
    document = share_link.document
    if not document or document.is_deleted:
        return jsonify({'error': 'Document no longer available'}), 404
    
    # Record access
    share_link.record_access()
    db.session.commit()
    
    # Return document info (read-only view)
    return jsonify({
        'document': document.to_dict(),
        'share_link': {
            'expires_at': share_link.expires_at.isoformat() if share_link.expires_at else None,
            'access_count': share_link.access_count
        }
    }), 200


@share_bp.route('/<string:token>/content', methods=['GET'])
def get_shared_document_content(token):
    """Get the content of a shared document.
    
    Path parameters:
        - token (str): The share link token
    
    Query parameters:
        - password (optional): Password if the link is protected
    
    Returns:
        200: Document content
        401: Password required or incorrect
        404: Share link not found
        410: Share link has expired
    
    Requirements: 51.3
    """
    import mimetypes
    
    share_link = ShareLink.query.filter_by(token=token).first()
    
    if not share_link:
        return jsonify({'error': 'Share link not found'}), 404
    
    if not share_link.is_active:
        return jsonify({'error': 'Share link is no longer active'}), 404
    
    if share_link.is_expired():
        return jsonify({'error': 'Share link has expired'}), 410
    
    # Check password if required
    if share_link.password_hash:
        password = request.args.get('password') or request.headers.get('X-Share-Password')
        if not password:
            return jsonify({
                'error': 'Password required',
                'password_required': True
            }), 401
        if not share_link.check_password(password):
            return jsonify({'error': 'Incorrect password'}), 401
    
    # Get the document
    document = share_link.document
    if not document or document.is_deleted:
        return jsonify({'error': 'Document no longer available'}), 404
    
    # Get full file path
    upload_folder = current_app.config['UPLOAD_FOLDER']
    full_path = os.path.join(upload_folder, document.file_path)
    
    if not os.path.exists(full_path):
        return jsonify({'error': 'File not found on disk'}), 400
    
    # For text-based files, return content as JSON
    if document.file_type in ['txt', 'md']:
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({
                'content': content,
                'type': document.file_type,
                'name': document.name,
                'size': document.size
            }), 200
        except UnicodeDecodeError:
            try:
                with open(full_path, 'r', encoding='latin-1') as f:
                    content = f.read()
                return jsonify({
                    'content': content,
                    'type': document.file_type,
                    'name': document.name,
                    'size': document.size
                }), 200
            except Exception as e:
                return jsonify({'error': f'Failed to read file: {str(e)}'}), 500
    
    # For binary files, return the file directly
    mime_type = mimetypes.guess_type(document.name)[0] or 'application/octet-stream'
    
    return send_file(
        full_path,
        mimetype=mime_type,
        as_attachment=False,
        download_name=document.name
    )


@share_bp.route('/<string:share_id>', methods=['DELETE'])
def delete_share_link(share_id):
    """Delete a share link.
    
    Path parameters:
        - share_id (str): UUID of the share link
    
    Returns:
        200: Success message
        404: Share link not found
    
    Requirements: 51.1
    """
    share_link = ShareLink.query.get(share_id)
    
    if not share_link:
        return jsonify({'error': 'Share link not found'}), 404
    
    db.session.delete(share_link)
    db.session.commit()
    
    return jsonify({
        'message': 'Share link deleted successfully',
        'id': share_id
    }), 200


@share_bp.route('/document/<string:doc_id>', methods=['GET'])
def list_document_share_links(doc_id):
    """List all share links for a document.
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: List of share link objects
        404: Document not found
    """
    document = Document.query.get(doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    share_links = ShareLink.query.filter_by(document_id=doc_id).order_by(ShareLink.created_at.desc()).all()
    
    # Build URLs for each share link
    base_url = request.host_url.rstrip('/')
    result = []
    for link in share_links:
        link_data = link.to_dict()
        link_data['url'] = f"{base_url}/share/{link.token}"
        result.append(link_data)
    
    return jsonify(result), 200


@share_bp.route('/<string:share_id>', methods=['PUT'])
def update_share_link(share_id):
    """Update a share link.
    
    Path parameters:
        - share_id (str): UUID of the share link
    
    Accepts JSON body with optional fields:
        - password: New password (null to remove)
        - expires_at: New expiration date (null to remove)
        - is_active: Enable/disable the link
    
    Returns:
        200: Updated share link object
        404: Share link not found
    """
    share_link = ShareLink.query.get(share_id)
    
    if not share_link:
        return jsonify({'error': 'Share link not found'}), 404
    
    data = request.get_json(silent=True) or {}
    
    # Update password
    if 'password' in data:
        share_link.set_password(data['password'])
    
    # Update expiration
    if 'expires_at' in data:
        if data['expires_at'] is None:
            share_link.expires_at = None
        else:
            try:
                share_link.expires_at = datetime.fromisoformat(data['expires_at'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                return jsonify({'error': 'Invalid expires_at format. Use ISO format.'}), 400
    
    # Update active status
    if 'is_active' in data:
        share_link.is_active = bool(data['is_active'])
    
    db.session.commit()
    
    # Build URL
    base_url = request.host_url.rstrip('/')
    response_data = share_link.to_dict()
    response_data['url'] = f"{base_url}/share/{share_link.token}"
    
    return jsonify(response_data), 200
