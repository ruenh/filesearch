"""Annotations API blueprint.

Implements annotation CRUD operations for documents.
Requirements: 38.1, 38.2, 38.3
"""

import uuid
from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models import Annotation, Document

annotations_bp = Blueprint('annotations', __name__, url_prefix='/api/annotations')


@annotations_bp.route('', methods=['POST'])
def create_annotation():
    """Create a new annotation on a document.
    
    Request body:
        - document_id (required): ID of the document
        - selected_text (required): The text that was selected
        - start_offset (required): Start character offset
        - end_offset (required): End character offset
        - note (optional): User's note/comment
        - color (optional): Highlight color (default: yellow)
    
    Returns:
        201: Created annotation object
        400: Missing required fields
        404: Document not found
    
    Requirements: 38.1, 38.2
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Validate required fields
    required_fields = ['document_id', 'selected_text', 'start_offset', 'end_offset']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    # Verify document exists
    document = db.session.get(Document, data['document_id'])
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    # Create annotation
    annotation = Annotation(
        id=str(uuid.uuid4()),
        document_id=data['document_id'],
        selected_text=data['selected_text'],
        start_offset=data['start_offset'],
        end_offset=data['end_offset'],
        note=data.get('note'),
        color=data.get('color', 'yellow')
    )
    
    db.session.add(annotation)
    db.session.commit()
    
    return jsonify(annotation.to_dict()), 201



@annotations_bp.route('/document/<document_id>', methods=['GET'])
def get_document_annotations(document_id):
    """Get all annotations for a document.
    
    Returns:
        200: List of annotations
        404: Document not found
    
    Requirements: 38.3
    """
    # Verify document exists
    document = db.session.get(Document, document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    annotations = Annotation.query.filter_by(document_id=document_id).order_by(Annotation.start_offset).all()
    
    return jsonify({
        'annotations': [a.to_dict() for a in annotations],
        'count': len(annotations)
    })


@annotations_bp.route('/<annotation_id>', methods=['GET'])
def get_annotation(annotation_id):
    """Get a specific annotation.
    
    Returns:
        200: Annotation object
        404: Annotation not found
    """
    annotation = db.session.get(Annotation, annotation_id)
    if not annotation:
        return jsonify({'error': 'Annotation not found'}), 404
    
    return jsonify(annotation.to_dict())


@annotations_bp.route('/<annotation_id>', methods=['PUT'])
def update_annotation(annotation_id):
    """Update an annotation.
    
    Request body:
        - note (optional): Updated note
        - color (optional): Updated color
    
    Returns:
        200: Updated annotation object
        404: Annotation not found
    """
    annotation = db.session.get(Annotation, annotation_id)
    if not annotation:
        return jsonify({'error': 'Annotation not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'note' in data:
        annotation.note = data['note']
    if 'color' in data:
        annotation.color = data['color']
    
    db.session.commit()
    
    return jsonify(annotation.to_dict())


@annotations_bp.route('/<annotation_id>', methods=['DELETE'])
def delete_annotation(annotation_id):
    """Delete an annotation.
    
    Returns:
        200: Success message
        404: Annotation not found
    """
    annotation = db.session.get(Annotation, annotation_id)
    if not annotation:
        return jsonify({'error': 'Annotation not found'}), 404
    
    db.session.delete(annotation)
    db.session.commit()
    
    return jsonify({'message': 'Annotation deleted successfully'})
