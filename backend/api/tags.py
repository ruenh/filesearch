"""Tags API blueprint.

Implements tag management operations.
Requirements: 23.1, 23.2
"""
import uuid
from flask import Blueprint, jsonify, request

from backend.extensions import db
from backend.models.tag import Tag
from backend.models.storage import Storage

tags_bp = Blueprint('tags', __name__)


@tags_bp.route('', methods=['POST'])
def create_tag():
    """Create a new tag.
    
    Accepts JSON body with:
        - name (required): Tag name
        - storage_id (required): ID of the storage this tag belongs to
        - color (optional): Hex color code (default: #3B82F6)
    
    Returns:
        201: Created tag object
        400: Missing required fields or tag already exists
        404: Storage not found
    
    Requirements: 23.1
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    # Validate required fields
    name = data.get('name')
    if not name or not isinstance(name, str) or not name.strip():
        return jsonify({'error': 'name is required'}), 400
    
    storage_id = data.get('storage_id')
    if not storage_id:
        return jsonify({'error': 'storage_id is required'}), 400
    
    # Verify storage exists
    storage = db.session.get(Storage, storage_id)
    if not storage:
        return jsonify({'error': 'Storage not found'}), 404
    
    # Normalize tag name
    name = name.strip().lower()[:100]
    
    # Check if tag already exists in this storage
    existing_tag = Tag.query.filter_by(name=name, storage_id=storage_id).first()
    if existing_tag:
        return jsonify({'error': 'Tag already exists in this storage'}), 400
    
    # Get optional color
    color = data.get('color', '#3B82F6')
    if not isinstance(color, str) or not color.startswith('#'):
        color = '#3B82F6'
    
    # Create tag
    tag = Tag(
        id=str(uuid.uuid4()),
        name=name,
        storage_id=storage_id,
        color=color,
        is_auto_generated=False
    )
    
    db.session.add(tag)
    db.session.commit()
    
    return jsonify(tag.to_dict()), 201


@tags_bp.route('', methods=['GET'])
def list_tags():
    """List all tags for a storage.
    
    Query parameters:
        - storage_id (required): Filter by storage
    
    Returns:
        200: List of tag objects with document counts
        400: Missing storage_id
    
    Requirements: 23.2
    """
    storage_id = request.args.get('storage_id')
    if not storage_id:
        return jsonify({'error': 'storage_id is required'}), 400
    
    # Get all tags for this storage
    tags = Tag.query.filter_by(storage_id=storage_id).order_by(Tag.name).all()
    
    return jsonify([tag.to_dict() for tag in tags]), 200


@tags_bp.route('/<string:tag_id>', methods=['GET'])
def get_tag(tag_id):
    """Get a specific tag.
    
    Path parameters:
        - tag_id (str): UUID of the tag
    
    Returns:
        200: Tag object
        404: Tag not found
    
    Requirements: 23.2
    """
    tag = db.session.get(Tag, tag_id)
    
    if not tag:
        return jsonify({'error': 'Tag not found'}), 404
    
    return jsonify(tag.to_dict()), 200


@tags_bp.route('/<string:tag_id>', methods=['PUT'])
def update_tag(tag_id):
    """Update a tag.
    
    Accepts JSON body with optional fields:
        - name: New tag name
        - color: New hex color code
    
    Path parameters:
        - tag_id (str): UUID of the tag
    
    Returns:
        200: Updated tag object
        400: Invalid request or tag name already exists
        404: Tag not found
    
    Requirements: 23.1
    """
    tag = db.session.get(Tag, tag_id)
    
    if not tag:
        return jsonify({'error': 'Tag not found'}), 404
    
    data = request.get_json(silent=True) or {}
    
    # Update name if provided
    if 'name' in data:
        name = data['name']
        if name and isinstance(name, str) and name.strip():
            name = name.strip().lower()[:100]
            
            # Check if another tag with this name exists in the same storage
            existing = Tag.query.filter(
                Tag.name == name,
                Tag.storage_id == tag.storage_id,
                Tag.id != tag_id
            ).first()
            
            if existing:
                return jsonify({'error': 'Tag with this name already exists'}), 400
            
            tag.name = name
    
    # Update color if provided
    if 'color' in data:
        color = data['color']
        if isinstance(color, str) and color.startswith('#'):
            tag.color = color
    
    db.session.commit()
    
    return jsonify(tag.to_dict()), 200


@tags_bp.route('/<string:tag_id>', methods=['DELETE'])
def delete_tag(tag_id):
    """Delete a tag.
    
    This will remove the tag from all documents that have it.
    
    Path parameters:
        - tag_id (str): UUID of the tag
    
    Returns:
        200: Success message
        404: Tag not found
    
    Requirements: 23.1
    """
    tag = db.session.get(Tag, tag_id)
    
    if not tag:
        return jsonify({'error': 'Tag not found'}), 404
    
    tag_name = tag.name
    
    # Remove tag from all documents (handled by SQLAlchemy cascade)
    db.session.delete(tag)
    db.session.commit()
    
    return jsonify({
        'message': f'Tag "{tag_name}" deleted successfully',
        'tag_id': tag_id
    }), 200
