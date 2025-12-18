"""Storage API blueprint.

Implements CRUD operations for document storages.
Requirements: 2.1, 2.2, 2.3, 2.4, 33.1, 33.2, 33.3
"""
import os
import io
import zipfile
import tempfile
from flask import Blueprint, jsonify, request, abort, send_file, current_app
from backend.extensions import db
from backend.models.storage import Storage
from backend.models.document import Document
from backend.models.folder import Folder

storage_bp = Blueprint('storage', __name__)


@storage_bp.route('', methods=['POST'])
def create_storage():
    """Create a new storage.
    
    Request body:
        - name (str, required): Name of the storage
    
    Returns:
        201: Created storage object
        400: Missing or invalid name
    
    Requirements: 2.1
    """
    data = request.get_json(silent=True)
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    name = data.get('name')
    if not name or not isinstance(name, str) or not name.strip():
        return jsonify({'error': 'Storage name is required and must be a non-empty string'}), 400
    
    name = name.strip()
    if len(name) > 255:
        return jsonify({'error': 'Storage name must not exceed 255 characters'}), 400
    
    storage = Storage(name=name)
    db.session.add(storage)
    db.session.commit()
    
    return jsonify(storage.to_dict()), 201


@storage_bp.route('', methods=['GET'])
def list_storages():
    """List all storages.
    
    Query parameters:
        - sort_by (str, optional): Field to sort by (name, created_at, updated_at). Default: created_at
        - order (str, optional): Sort order (asc, desc). Default: desc
    
    Returns:
        200: List of storage objects
    
    Requirements: 2.2
    """
    sort_by = request.args.get('sort_by', 'created_at')
    order = request.args.get('order', 'desc')
    
    # Validate sort_by field
    valid_sort_fields = ['name', 'created_at', 'updated_at']
    if sort_by not in valid_sort_fields:
        sort_by = 'created_at'
    
    # Build query with sorting
    query = Storage.query
    
    sort_column = getattr(Storage, sort_by)
    if order == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    
    storages = query.all()
    
    return jsonify([storage.to_dict() for storage in storages]), 200


@storage_bp.route('/<string:storage_id>', methods=['GET'])
def get_storage(storage_id):
    """Get storage details.
    
    Path parameters:
        - storage_id (str): UUID of the storage
    
    Returns:
        200: Storage object with details
        404: Storage not found
    
    Requirements: 2.3
    """
    storage = Storage.query.get(storage_id)
    
    if not storage:
        return jsonify({'error': 'Storage not found'}), 404
    
    return jsonify(storage.to_dict()), 200


@storage_bp.route('/<string:storage_id>', methods=['DELETE'])
def delete_storage(storage_id):
    """Delete a storage and all associated documents.
    
    Path parameters:
        - storage_id (str): UUID of the storage
    
    Returns:
        200: Success message
        404: Storage not found
    
    Requirements: 2.4
    Note: Cascade delete is configured in the Storage model,
          so all associated documents and folders will be deleted.
    """
    storage = Storage.query.get(storage_id)
    
    if not storage:
        return jsonify({'error': 'Storage not found'}), 404
    
    storage_name = storage.name
    db.session.delete(storage)
    db.session.commit()
    
    return jsonify({
        'message': f'Storage "{storage_name}" and all associated documents have been deleted',
        'deleted_id': storage_id
    }), 200


@storage_bp.route('/<string:storage_id>/export', methods=['POST'])
def export_storage(storage_id):
    """Export storage as ZIP archive with folder structure.
    
    Path parameters:
        - storage_id (str): UUID of the storage
    
    Returns:
        200: ZIP file download
        404: Storage not found
    
    Requirements: 33.1, 33.2, 33.3
    """
    storage = Storage.query.get(storage_id)
    
    if not storage:
        return jsonify({'error': 'Storage not found'}), 404
    
    # Get all non-deleted documents in this storage
    documents = Document.query.filter_by(
        storage_id=storage_id,
        is_deleted=False
    ).all()
    
    # Get all folders for building the folder structure
    folders = Folder.query.filter_by(storage_id=storage_id).all()
    
    # Build folder path lookup
    folder_paths = {}
    
    def get_folder_path(folder_id):
        """Recursively build folder path."""
        if folder_id is None:
            return ''
        if folder_id in folder_paths:
            return folder_paths[folder_id]
        
        folder = next((f for f in folders if f.id == folder_id), None)
        if not folder:
            return ''
        
        parent_path = get_folder_path(folder.parent_id)
        if parent_path:
            path = f"{parent_path}/{folder.name}"
        else:
            path = folder.name
        
        folder_paths[folder_id] = path
        return path
    
    # Pre-compute all folder paths
    for folder in folders:
        get_folder_path(folder.id)
    
    # Create ZIP archive in memory
    zip_buffer = io.BytesIO()
    
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Add each document to the archive
        for doc in documents:
            # Build the path within the ZIP
            folder_path = get_folder_path(doc.folder_id)
            if folder_path:
                zip_path = f"{folder_path}/{doc.name}"
            else:
                zip_path = doc.name
            
            # Get the actual file content
            if doc.file_path:
                file_path = os.path.join(upload_folder, doc.file_path)
                if os.path.exists(file_path):
                    # Add file from disk
                    zip_file.write(file_path, zip_path)
                else:
                    # File not found on disk, add placeholder
                    zip_file.writestr(
                        zip_path,
                        f"[File not found: {doc.name}]".encode('utf-8')
                    )
            else:
                # No file path, add placeholder
                zip_file.writestr(
                    zip_path,
                    f"[No content available for: {doc.name}]".encode('utf-8')
                )
        
        # Create empty folders that have no documents
        for folder in folders:
            folder_path = get_folder_path(folder.id)
            # Check if any document is in this folder
            has_documents = any(
                get_folder_path(doc.folder_id) == folder_path or
                get_folder_path(doc.folder_id).startswith(f"{folder_path}/")
                for doc in documents
            )
            if not has_documents:
                # Add empty folder by creating a placeholder file
                zip_file.writestr(f"{folder_path}/.gitkeep", "")
    
    # Seek to beginning of buffer
    zip_buffer.seek(0)
    
    # Generate filename
    safe_name = "".join(c for c in storage.name if c.isalnum() or c in (' ', '-', '_')).strip()
    filename = f"{safe_name}_export.zip"
    
    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name=filename
    )
