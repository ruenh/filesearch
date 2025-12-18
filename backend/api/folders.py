"""Folders API blueprint.

Implements CRUD operations for document folders.
Requirements: 22.1, 22.2
"""
from flask import Blueprint, jsonify, request
from backend.extensions import db
from backend.models.folder import Folder
from backend.models.storage import Storage
from backend.models.document import Document

folders_bp = Blueprint('folders', __name__)


@folders_bp.route('', methods=['POST'])
def create_folder():
    """Create a new folder.
    
    Request body:
        - name (str, required): Name of the folder
        - storage_id (str, required): ID of the storage
        - parent_id (str, optional): ID of the parent folder
    
    Returns:
        201: Created folder object
        400: Missing or invalid parameters
        404: Storage or parent folder not found
    
    Requirements: 22.1
    """
    data = request.get_json(silent=True)
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    name = data.get('name')
    if not name or not isinstance(name, str) or not name.strip():
        return jsonify({'error': 'Folder name is required and must be a non-empty string'}), 400
    
    name = name.strip()
    if len(name) > 255:
        return jsonify({'error': 'Folder name must not exceed 255 characters'}), 400
    
    storage_id = data.get('storage_id')
    if not storage_id:
        return jsonify({'error': 'storage_id is required'}), 400
    
    # Verify storage exists
    storage = db.session.get(Storage, storage_id)
    if not storage:
        return jsonify({'error': 'Storage not found'}), 404
    
    # Verify parent folder if provided
    parent_id = data.get('parent_id')
    if parent_id:
        parent_folder = db.session.get(Folder, parent_id)
        if not parent_folder:
            return jsonify({'error': 'Parent folder not found'}), 404
        if parent_folder.storage_id != storage_id:
            return jsonify({'error': 'Parent folder must be in the same storage'}), 400
    
    folder = Folder(
        name=name,
        storage_id=storage_id,
        parent_id=parent_id
    )
    
    db.session.add(folder)
    db.session.commit()
    
    return jsonify(folder.to_dict()), 201


@folders_bp.route('', methods=['GET'])
def list_folders():
    """List folders with optional filters.
    
    Query parameters:
        - storage_id (required): Filter by storage
        - parent_id (optional): Filter by parent folder (null for root folders)
        - include_children (optional): Include nested children (default: false)
    
    Returns:
        200: List of folder objects
        400: Missing storage_id
    
    Requirements: 22.2
    """
    storage_id = request.args.get('storage_id')
    if not storage_id:
        return jsonify({'error': 'storage_id is required'}), 400
    
    # Build query
    query = Folder.query.filter_by(storage_id=storage_id)
    
    # Filter by parent
    parent_id = request.args.get('parent_id')
    if parent_id == 'null' or parent_id == '':
        # Get root folders only
        query = query.filter(Folder.parent_id.is_(None))
    elif parent_id:
        query = query.filter_by(parent_id=parent_id)
    
    # Order by name
    query = query.order_by(Folder.name.asc())
    
    folders = query.all()
    
    include_children = request.args.get('include_children', 'false').lower() == 'true'
    
    return jsonify([folder.to_dict(include_children=include_children) for folder in folders]), 200


@folders_bp.route('/<string:folder_id>', methods=['GET'])
def get_folder(folder_id):
    """Get folder details.
    
    Path parameters:
        - folder_id (str): UUID of the folder
    
    Query parameters:
        - include_children (optional): Include nested children (default: false)
    
    Returns:
        200: Folder object with details
        404: Folder not found
    """
    folder = db.session.get(Folder, folder_id)
    
    if not folder:
        return jsonify({'error': 'Folder not found'}), 404
    
    include_children = request.args.get('include_children', 'false').lower() == 'true'
    
    return jsonify(folder.to_dict(include_children=include_children)), 200


@folders_bp.route('/<string:folder_id>', methods=['PUT'])
def update_folder(folder_id):
    """Update a folder.
    
    Accepts JSON body with optional fields:
        - name: New folder name
        - parent_id: Move to different parent folder (null for root)
    
    Path parameters:
        - folder_id (str): UUID of the folder
    
    Returns:
        200: Updated folder object
        400: Invalid parameters
        404: Folder not found
    
    Requirements: 22.2
    """
    folder = db.session.get(Folder, folder_id)
    
    if not folder:
        return jsonify({'error': 'Folder not found'}), 404
    
    data = request.get_json(silent=True) or {}
    
    # Update name
    if 'name' in data:
        name = data['name']
        if name and isinstance(name, str) and name.strip():
            name = name.strip()
            if len(name) > 255:
                return jsonify({'error': 'Folder name must not exceed 255 characters'}), 400
            folder.name = name
        else:
            return jsonify({'error': 'Folder name must be a non-empty string'}), 400
    
    # Update parent
    if 'parent_id' in data:
        new_parent_id = data['parent_id']
        
        if new_parent_id is None:
            # Move to root
            folder.parent_id = None
        else:
            # Verify new parent exists and is in the same storage
            new_parent = db.session.get(Folder, new_parent_id)
            if not new_parent:
                return jsonify({'error': 'Parent folder not found'}), 404
            if new_parent.storage_id != folder.storage_id:
                return jsonify({'error': 'Parent folder must be in the same storage'}), 400
            
            # Prevent circular reference
            if new_parent_id == folder.id:
                return jsonify({'error': 'Folder cannot be its own parent'}), 400
            
            # Check if new parent is a descendant of this folder
            if _is_descendant(new_parent_id, folder.id):
                return jsonify({'error': 'Cannot move folder into its own descendant'}), 400
            
            folder.parent_id = new_parent_id
    
    db.session.commit()
    
    return jsonify(folder.to_dict()), 200


def _is_descendant(folder_id, potential_ancestor_id):
    """Check if folder_id is a descendant of potential_ancestor_id."""
    folder = db.session.get(Folder, folder_id)
    while folder:
        if folder.parent_id == potential_ancestor_id:
            return True
        folder = folder.parent
    return False


@folders_bp.route('/<string:folder_id>', methods=['DELETE'])
def delete_folder(folder_id):
    """Delete a folder and all its contents.
    
    Path parameters:
        - folder_id (str): UUID of the folder
    
    Query parameters:
        - cascade (optional): If 'true', delete all documents in folder. 
                             If 'false', move documents to parent folder. Default: 'true'
    
    Returns:
        200: Success message
        404: Folder not found
    
    Requirements: 22.2
    """
    folder = db.session.get(Folder, folder_id)
    
    if not folder:
        return jsonify({'error': 'Folder not found'}), 404
    
    cascade = request.args.get('cascade', 'true').lower() == 'true'
    folder_name = folder.name
    parent_id = folder.parent_id
    
    if cascade:
        # Delete folder and all contents (cascade is configured in model)
        db.session.delete(folder)
    else:
        # Move documents to parent folder before deleting
        Document.query.filter_by(folder_id=folder_id).update({'folder_id': parent_id})
        
        # Move child folders to parent
        Folder.query.filter_by(parent_id=folder_id).update({'parent_id': parent_id})
        
        db.session.delete(folder)
    
    db.session.commit()
    
    return jsonify({
        'message': f'Folder "{folder_name}" has been deleted',
        'deleted_id': folder_id
    }), 200


@folders_bp.route('/<string:folder_id>/documents', methods=['GET'])
def get_folder_documents(folder_id):
    """Get all documents in a folder.
    
    Path parameters:
        - folder_id (str): UUID of the folder
    
    Query parameters:
        - include_deleted (optional): Include deleted documents (default: false)
    
    Returns:
        200: List of document objects
        404: Folder not found
    """
    folder = db.session.get(Folder, folder_id)
    
    if not folder:
        return jsonify({'error': 'Folder not found'}), 404
    
    include_deleted = request.args.get('include_deleted', 'false').lower() == 'true'
    
    query = Document.query.filter_by(folder_id=folder_id)
    
    if not include_deleted:
        query = query.filter(Document.is_deleted == False)
    
    documents = query.order_by(Document.name.asc()).all()
    
    return jsonify([doc.to_dict() for doc in documents]), 200


@folders_bp.route('/<string:folder_id>/breadcrumb', methods=['GET'])
def get_folder_breadcrumb(folder_id):
    """Get breadcrumb path for a folder.
    
    Path parameters:
        - folder_id (str): UUID of the folder
    
    Returns:
        200: List of folder objects from root to current folder
        404: Folder not found
    
    Requirements: 22.3
    """
    folder = db.session.get(Folder, folder_id)
    
    if not folder:
        return jsonify({'error': 'Folder not found'}), 404
    
    breadcrumb = []
    current = folder
    
    while current:
        breadcrumb.insert(0, {
            'id': current.id,
            'name': current.name,
            'parent_id': current.parent_id
        })
        current = current.parent
    
    return jsonify(breadcrumb), 200


@folders_bp.route('/tree', methods=['GET'])
def get_folder_tree():
    """Get complete folder tree for a storage.
    
    Query parameters:
        - storage_id (required): ID of the storage
    
    Returns:
        200: Hierarchical folder tree
        400: Missing storage_id
    
    Requirements: 22.2
    """
    storage_id = request.args.get('storage_id')
    if not storage_id:
        return jsonify({'error': 'storage_id is required'}), 400
    
    # Get all root folders with their children
    root_folders = Folder.query.filter_by(
        storage_id=storage_id,
        parent_id=None
    ).order_by(Folder.name.asc()).all()
    
    return jsonify([folder.to_dict(include_children=True) for folder in root_folders]), 200
