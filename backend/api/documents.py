"""Documents API blueprint.

Implements document upload, management, and retrieval operations.
Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 5.1
"""
import os
import uuid
import hashlib
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from werkzeug.utils import secure_filename

from backend.extensions import db
from backend.models.document import Document
from backend.models.storage import Storage
from backend.models.version import Version
from backend.api.search import invalidate_storage_search_cache

documents_bp = Blueprint('documents', __name__)

# Supported file types and their MIME types
ALLOWED_EXTENSIONS = {
    'txt': ['text/plain'],
    'pdf': ['application/pdf'],
    'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'md': ['text/markdown', 'text/plain', 'text/x-markdown'],
    'png': ['image/png'],
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'gif': ['image/gif'],
    'webp': ['image/webp'],
    'bmp': ['image/bmp']
}

# Maximum file size: 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024


def get_file_extension(filename):
    """Extract file extension from filename."""
    if '.' in filename:
        return filename.rsplit('.', 1)[1].lower()
    return ''


def is_allowed_file(filename):
    """Check if file extension is allowed.
    
    Requirements: 3.1 - Support TXT, PDF, DOCX, MD, images
    """
    ext = get_file_extension(filename)
    return ext in ALLOWED_EXTENSIONS


def detect_file_type(filename, content_type=None):
    """Detect file type from filename and optional content type.
    
    Returns the normalized file type (txt, pdf, docx, md, image).
    """
    ext = get_file_extension(filename)
    
    if ext in ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']:
        return 'image'
    elif ext in ALLOWED_EXTENSIONS:
        return ext
    
    # Fallback to content type detection
    if content_type:
        for ext, mime_types in ALLOWED_EXTENSIONS.items():
            if content_type in mime_types:
                if ext in ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']:
                    return 'image'
                return ext
    
    return None


def calculate_file_hash(file_content):
    """Calculate SHA-256 hash of file content."""
    return hashlib.sha256(file_content).hexdigest()


def save_file_to_disk(file, storage_id, document_id):
    """Save uploaded file to disk.
    
    Returns tuple of (file_path, file_size, content_hash).
    """
    upload_folder = current_app.config['UPLOAD_FOLDER']
    storage_folder = os.path.join(upload_folder, storage_id)
    os.makedirs(storage_folder, exist_ok=True)
    
    # Secure the filename
    filename = secure_filename(file.filename)
    ext = get_file_extension(filename)
    
    # Create unique filename with document ID
    unique_filename = f"{document_id}.{ext}" if ext else document_id
    file_path = os.path.join(storage_folder, unique_filename)
    
    # Read file content for hash calculation
    file_content = file.read()
    file_size = len(file_content)
    content_hash = calculate_file_hash(file_content)
    
    # Save file
    with open(file_path, 'wb') as f:
        f.write(file_content)
    
    # Return relative path from upload folder
    relative_path = os.path.join(storage_id, unique_filename)
    
    return relative_path, file_size, content_hash


def upload_to_gemini(file_path, display_name):
    """Upload file to Gemini File API.
    
    Returns the Gemini file ID or None if upload fails.
    """
    try:
        import google.generativeai as genai
        
        api_key = current_app.config.get('GEMINI_API_KEY')
        if not api_key:
            current_app.logger.warning('Gemini API key not configured')
            return None
        
        genai.configure(api_key=api_key)
        
        # Get full file path
        full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_path)
        
        # Upload to Gemini
        gemini_file = genai.upload_file(full_path, display_name=display_name)
        
        return gemini_file.name
    except Exception as e:
        current_app.logger.error(f'Failed to upload to Gemini: {str(e)}')
        return None


@documents_bp.route('', methods=['POST'])
def upload_document():
    """Upload a new document.
    
    Accepts multipart form data with:
        - file (required): The file to upload
        - storage_id (required): ID of the storage to upload to
        - folder_id (optional): ID of the folder within the storage
    
    Returns:
        201: Created document object with metadata
        400: Missing file, invalid file type, or file too large
        404: Storage not found
    
    Requirements: 3.1, 3.2, 3.3
    """
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    # Check if file has a name
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Get storage_id from form data
    storage_id = request.form.get('storage_id')
    if not storage_id:
        return jsonify({'error': 'storage_id is required'}), 400
    
    # Verify storage exists
    storage = db.session.get(Storage, storage_id)
    if not storage:
        return jsonify({'error': 'Storage not found'}), 404
    
    # Validate file type
    if not is_allowed_file(file.filename):
        return jsonify({
            'error': 'File type not allowed',
            'allowed_types': list(ALLOWED_EXTENSIONS.keys())
        }), 400
    
    # Check file size (read content length from request)
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if file_size > MAX_FILE_SIZE:
        return jsonify({
            'error': 'File too large',
            'max_size_mb': MAX_FILE_SIZE // (1024 * 1024)
        }), 400
    
    # Detect file type
    file_type = detect_file_type(file.filename, file.content_type)
    if not file_type:
        return jsonify({'error': 'Could not determine file type'}), 400
    
    # Generate document ID
    document_id = str(uuid.uuid4())
    
    # Save file to disk
    try:
        file_path, actual_size, content_hash = save_file_to_disk(file, storage_id, document_id)
    except Exception as e:
        current_app.logger.error(f'Failed to save file: {str(e)}')
        return jsonify({'error': 'Failed to save file'}), 500
    
    # Get optional folder_id
    folder_id = request.form.get('folder_id')
    
    # Create document record
    document = Document(
        id=document_id,
        storage_id=storage_id,
        folder_id=folder_id,
        name=secure_filename(file.filename),
        file_type=file_type,
        size=actual_size,
        file_path=file_path,
        content_hash=content_hash
    )
    
    # Upload to Gemini File API (non-blocking, failure doesn't stop document creation)
    gemini_file_id = upload_to_gemini(file_path, document.name)
    if gemini_file_id:
        document.gemini_file_id = gemini_file_id
    
    # Create initial version
    version = Version(
        id=str(uuid.uuid4()),
        document_id=document_id,
        version_number=1,
        file_path=file_path,
        size=actual_size,
        content_hash=content_hash
    )
    
    # Save to database
    db.session.add(document)
    db.session.add(version)
    db.session.commit()
    
    # Process OCR for image files (Requirements: 10.1, 10.2)
    if file_type == 'image':
        try:
            from backend.utils.ocr import process_document_ocr
            process_document_ocr(document_id)
            # Refresh document to get updated ocr_text
            db.session.refresh(document)
        except Exception as e:
            current_app.logger.error(f'OCR processing failed for {document_id}: {str(e)}')
            # OCR failure doesn't stop document creation
    
    # Invalidate search cache for this storage
    invalidate_storage_search_cache(storage_id)
    
    return jsonify(document.to_dict(include_versions=True)), 201


@documents_bp.route('', methods=['GET'])
def list_documents():
    """List documents with optional filters.
    
    Query parameters:
        - storage_id (required): Filter by storage
        - folder_id (optional): Filter by folder
        - tag (optional): Filter by tag name
        - favorite (optional): Filter by favorite status (true/false)
        - archived (optional): Filter by archived status (true/false)
        - include_deleted (optional): Include deleted documents (default: false)
        - sort_by (optional): Field to sort by (name, created_at, updated_at, size). Default: created_at
        - order (optional): Sort order (asc, desc). Default: desc
    
    Returns:
        200: List of document objects
        400: Missing storage_id
    
    Requirements: 8.3, 19.3, 23.3, 24.2, 30.2
    """
    from backend.models.tag import Tag
    
    storage_id = request.args.get('storage_id')
    if not storage_id:
        return jsonify({'error': 'storage_id is required'}), 400
    
    # Build query
    query = Document.query.filter_by(storage_id=storage_id)
    
    # Filter by folder
    folder_id = request.args.get('folder_id')
    if folder_id:
        query = query.filter_by(folder_id=folder_id)
    
    # Filter deleted documents (must be done before tag join to avoid ambiguity)
    include_deleted = request.args.get('include_deleted', 'false').lower() == 'true'
    if not include_deleted:
        query = query.filter(Document.is_deleted == False)
    
    # Filter by favorite status (Requirements: 24.2)
    favorite = request.args.get('favorite')
    if favorite is not None:
        is_favorite = favorite.lower() == 'true'
        query = query.filter(Document.is_favorite == is_favorite)
    
    # Filter by archived status (Requirements: 30.2)
    archived = request.args.get('archived')
    if archived is not None:
        is_archived = archived.lower() == 'true'
        query = query.filter(Document.is_archived == is_archived)
    
    # Filter by tag (Requirements: 19.3, 23.3)
    tag_name = request.args.get('tag')
    if tag_name:
        # Join with tags and filter by tag name
        query = query.join(Document.tags).filter(Tag.name == tag_name.lower())
    
    # Sorting
    sort_by = request.args.get('sort_by', 'created_at')
    order = request.args.get('order', 'desc')
    
    valid_sort_fields = ['name', 'created_at', 'updated_at', 'size', 'file_type']
    if sort_by not in valid_sort_fields:
        sort_by = 'created_at'
    
    sort_column = getattr(Document, sort_by)
    if order == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    
    documents = query.all()
    
    return jsonify([doc.to_dict() for doc in documents]), 200


@documents_bp.route('/<string:doc_id>', methods=['GET'])
def get_document(doc_id):
    """Get document details.
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Query parameters:
        - include_versions (optional): Include version history (default: false)
    
    Returns:
        200: Document object
        404: Document not found
    
    Requirements: 4.1, 4.3
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    include_versions = request.args.get('include_versions', 'false').lower() == 'true'
    
    return jsonify(document.to_dict(include_versions=include_versions)), 200


@documents_bp.route('/<string:doc_id>', methods=['PUT'])
def update_document(doc_id):
    """Update a document.
    
    Accepts JSON body with optional fields:
        - name: New document name
        - folder_id: Move to different folder
        - is_favorite: Toggle favorite status
        - is_archived: Toggle archive status
    
    Returns:
        200: Updated document object
        404: Document not found
    
    Requirements: 5.1
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    data = request.get_json(silent=True) or {}
    
    # Update allowed fields
    if 'name' in data:
        name = data['name']
        if name and isinstance(name, str) and name.strip():
            document.name = secure_filename(name.strip())
    
    if 'folder_id' in data:
        document.folder_id = data['folder_id']
    
    if 'is_favorite' in data:
        document.is_favorite = bool(data['is_favorite'])
    
    if 'is_archived' in data:
        document.is_archived = bool(data['is_archived'])
    
    # updated_at is automatically updated by SQLAlchemy
    db.session.commit()
    
    return jsonify(document.to_dict()), 200


@documents_bp.route('/<string:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    """Soft delete a document (move to trash).
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: Success message
        404: Document not found
    
    Requirements: 3.4, 25.1
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    # Soft delete - move to trash
    document.is_deleted = True
    document.deleted_at = datetime.utcnow()
    
    db.session.commit()
    
    # Invalidate search cache for this storage
    invalidate_storage_search_cache(document.storage_id)
    
    return jsonify({
        'message': f'Document "{document.name}" moved to trash',
        'document_id': doc_id,
        'deleted_at': document.deleted_at.isoformat()
    }), 200


@documents_bp.route('/<string:doc_id>/restore', methods=['POST'])
def restore_document(doc_id):
    """Restore document from trash.
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: Restored document object
        404: Document not found
        400: Document is not in trash
    
    Requirements: 25.3
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if not document.is_deleted:
        return jsonify({'error': 'Document is not in trash'}), 400
    
    # Restore from trash
    document.is_deleted = False
    document.deleted_at = None
    
    db.session.commit()
    
    # Invalidate search cache for this storage
    invalidate_storage_search_cache(document.storage_id)
    
    return jsonify(document.to_dict()), 200


# ============================================================================
# Version Management Endpoints
# Requirements: 5.2, 26.1, 26.2, 26.3
# ============================================================================

@documents_bp.route('/<string:doc_id>/versions', methods=['GET'])
def list_versions(doc_id):
    """List all versions of a document.
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: List of version objects ordered by version_number descending
        404: Document not found
    
    Requirements: 26.2
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    versions = Version.query.filter_by(document_id=doc_id)\
        .order_by(Version.version_number.desc())\
        .all()
    
    return jsonify([v.to_dict() for v in versions]), 200


@documents_bp.route('/<string:doc_id>/versions', methods=['POST'])
def create_version(doc_id):
    """Create a new version of a document by uploading a new file.
    
    Accepts multipart form data with:
        - file (required): The new file version to upload
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        201: Created version object with updated document
        400: Missing file or invalid file type
        404: Document not found
    
    Requirements: 5.2, 26.1
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    # Check if file has a name
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Validate file type
    if not is_allowed_file(file.filename):
        return jsonify({
            'error': 'File type not allowed',
            'allowed_types': list(ALLOWED_EXTENSIONS.keys())
        }), 400
    
    # Check file size
    file.seek(0, 2)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        return jsonify({
            'error': 'File too large',
            'max_size_mb': MAX_FILE_SIZE // (1024 * 1024)
        }), 400
    
    # Detect file type
    file_type = detect_file_type(file.filename, file.content_type)
    if not file_type:
        return jsonify({'error': 'Could not determine file type'}), 400
    
    # Get the next version number
    max_version = db.session.query(db.func.max(Version.version_number))\
        .filter(Version.document_id == doc_id)\
        .scalar() or 0
    new_version_number = max_version + 1
    
    # Generate new version ID
    version_id = str(uuid.uuid4())
    
    # Save file to disk with version-specific filename
    try:
        upload_folder = current_app.config['UPLOAD_FOLDER']
        storage_folder = os.path.join(upload_folder, document.storage_id)
        os.makedirs(storage_folder, exist_ok=True)
        
        # Secure the filename
        filename = secure_filename(file.filename)
        ext = get_file_extension(filename)
        
        # Create unique filename with version ID
        unique_filename = f"{version_id}.{ext}" if ext else version_id
        file_path = os.path.join(storage_folder, unique_filename)
        
        # Read file content for hash calculation
        file_content = file.read()
        actual_size = len(file_content)
        content_hash = calculate_file_hash(file_content)
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Relative path from upload folder
        relative_path = os.path.join(document.storage_id, unique_filename)
        
    except Exception as e:
        current_app.logger.error(f'Failed to save version file: {str(e)}')
        return jsonify({'error': 'Failed to save file'}), 500
    
    # Create new version record
    version = Version(
        id=version_id,
        document_id=doc_id,
        version_number=new_version_number,
        file_path=relative_path,
        size=actual_size,
        content_hash=content_hash
    )
    
    # Update document metadata
    document.name = secure_filename(file.filename)
    document.file_type = file_type
    document.size = actual_size
    document.file_path = relative_path
    document.content_hash = content_hash
    # updated_at is automatically updated by SQLAlchemy
    
    # Upload to Gemini File API (non-blocking)
    gemini_file_id = upload_to_gemini(relative_path, document.name)
    if gemini_file_id:
        document.gemini_file_id = gemini_file_id
    
    # Save to database
    db.session.add(version)
    db.session.commit()
    
    # Invalidate search cache for this storage
    invalidate_storage_search_cache(document.storage_id)
    
    return jsonify({
        'version': version.to_dict(),
        'document': document.to_dict()
    }), 201


@documents_bp.route('/<string:doc_id>/versions/<string:version_id>', methods=['GET'])
def get_version(doc_id, version_id):
    """Get a specific version of a document.
    
    Path parameters:
        - doc_id (str): UUID of the document
        - version_id (str): UUID of the version
    
    Returns:
        200: Version object with file metadata
        404: Document or version not found
    
    Requirements: 26.3
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    version = Version.query.filter_by(
        id=version_id,
        document_id=doc_id
    ).first()
    
    if not version:
        return jsonify({'error': 'Version not found'}), 404
    
    # Return version with additional context
    version_data = version.to_dict()
    version_data['document_name'] = document.name
    version_data['is_current'] = (document.file_path == version.file_path)
    
    return jsonify(version_data), 200


# ============================================================================
# Document Content Endpoints
# Requirements: 4.1, 4.2
# ============================================================================

@documents_bp.route('/<string:doc_id>/content', methods=['GET'])
def get_document_content(doc_id):
    """Get document content for viewing.
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: Document content (text for text files, base64 for binary)
        404: Document not found
        400: File not found on disk
    
    Requirements: 4.1, 4.2
    """
    from flask import send_file
    import mimetypes
    
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
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
            # Try with different encoding
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
    
    # For binary files (PDF, images, docx), return the file directly
    mime_type = mimetypes.guess_type(document.name)[0] or 'application/octet-stream'
    
    return send_file(
        full_path,
        mimetype=mime_type,
        as_attachment=False,
        download_name=document.name
    )


@documents_bp.route('/<string:doc_id>/download', methods=['GET'])
def download_document(doc_id):
    """Download document file.
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: File download
        404: Document not found
        400: File not found on disk
    
    Requirements: 4.1
    """
    from flask import send_file
    import mimetypes
    
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    # Get full file path
    upload_folder = current_app.config['UPLOAD_FOLDER']
    full_path = os.path.join(upload_folder, document.file_path)
    
    if not os.path.exists(full_path):
        return jsonify({'error': 'File not found on disk'}), 400
    
    mime_type = mimetypes.guess_type(document.name)[0] or 'application/octet-stream'
    
    return send_file(
        full_path,
        mimetype=mime_type,
        as_attachment=True,
        download_name=document.name
    )



@documents_bp.route('/<string:doc_id>/content', methods=['PUT'])
def update_document_content(doc_id):
    """Update document content (for text files only).
    
    Creates a new version when content is updated.
    
    Accepts JSON body with:
        - content (required): New text content
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: Updated document with new version info
        400: Invalid request or unsupported file type
        404: Document not found
    
    Requirements: 34.3, 5.2
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    # Only allow editing text-based files
    if document.file_type not in ['txt', 'md']:
        return jsonify({
            'error': 'Only text files (txt, md) can be edited',
            'file_type': document.file_type
        }), 400
    
    data = request.get_json(silent=True)
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    new_content = data['content']
    if not isinstance(new_content, str):
        return jsonify({'error': 'content must be a string'}), 400
    
    # Get the next version number
    max_version = db.session.query(db.func.max(Version.version_number))\
        .filter(Version.document_id == doc_id)\
        .scalar() or 0
    new_version_number = max_version + 1
    
    # Generate new version ID
    version_id = str(uuid.uuid4())
    
    # Save new content to disk
    try:
        upload_folder = current_app.config['UPLOAD_FOLDER']
        storage_folder = os.path.join(upload_folder, document.storage_id)
        os.makedirs(storage_folder, exist_ok=True)
        
        # Get file extension from current document
        ext = get_file_extension(document.name)
        
        # Create unique filename with version ID
        unique_filename = f"{version_id}.{ext}" if ext else version_id
        file_path = os.path.join(storage_folder, unique_filename)
        
        # Encode content and calculate hash
        content_bytes = new_content.encode('utf-8')
        actual_size = len(content_bytes)
        content_hash = calculate_file_hash(content_bytes)
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(content_bytes)
        
        # Relative path from upload folder
        relative_path = os.path.join(document.storage_id, unique_filename)
        
    except Exception as e:
        current_app.logger.error(f'Failed to save content: {str(e)}')
        return jsonify({'error': 'Failed to save content'}), 500
    
    # Create new version record
    version = Version(
        id=version_id,
        document_id=doc_id,
        version_number=new_version_number,
        file_path=relative_path,
        size=actual_size,
        content_hash=content_hash
    )
    
    # Update document metadata
    document.size = actual_size
    document.file_path = relative_path
    document.content_hash = content_hash
    # updated_at is automatically updated by SQLAlchemy
    
    # Save to database
    db.session.add(version)
    db.session.commit()
    
    # Invalidate search cache for this storage
    invalidate_storage_search_cache(document.storage_id)
    
    return jsonify({
        'message': 'Content updated successfully',
        'version': version.to_dict(),
        'document': document.to_dict()
    }), 200


# ============================================================================
# Tag Management Endpoints
# Requirements: 19.3, 23.1, 23.2, 23.3
# ============================================================================

@documents_bp.route('/<string:doc_id>/tags', methods=['GET'])
def get_document_tags(doc_id):
    """Get all tags for a document.
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: List of tag objects
        404: Document not found
    
    Requirements: 23.2
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    return jsonify([tag.to_dict() for tag in document.tags]), 200


@documents_bp.route('/<string:doc_id>/tags', methods=['PUT'])
def update_document_tags(doc_id):
    """Update tags for a document.
    
    Accepts JSON body with:
        - tags (required): List of tag names to set on the document
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: Updated document with tags
        400: Invalid request
        404: Document not found
    
    Requirements: 23.1, 23.2
    """
    from backend.models.tag import Tag
    
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    data = request.get_json(silent=True)
    if not data or 'tags' not in data:
        return jsonify({'error': 'tags is required'}), 400
    
    tag_names = data['tags']
    if not isinstance(tag_names, list):
        return jsonify({'error': 'tags must be a list'}), 400
    
    # Clear existing tags
    document.tags = []
    
    # Add new tags
    for tag_name in tag_names:
        if not isinstance(tag_name, str) or not tag_name.strip():
            continue
        
        tag_name = tag_name.strip().lower()[:100]  # Normalize and limit length
        
        # Find or create tag
        tag = Tag.query.filter_by(name=tag_name, storage_id=document.storage_id).first()
        if not tag:
            tag = Tag(
                name=tag_name,
                storage_id=document.storage_id,
                is_auto_generated=False
            )
            db.session.add(tag)
        
        if tag not in document.tags:
            document.tags.append(tag)
    
    db.session.commit()
    
    return jsonify(document.to_dict()), 200


@documents_bp.route('/<string:doc_id>/tags/<string:tag_name>', methods=['POST'])
def add_document_tag(doc_id, tag_name):
    """Add a single tag to a document.
    
    Path parameters:
        - doc_id (str): UUID of the document
        - tag_name (str): Name of the tag to add
    
    Returns:
        200: Updated document with tags
        404: Document not found
    
    Requirements: 23.1
    """
    from backend.models.tag import Tag
    
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    tag_name = tag_name.strip().lower()[:100]
    
    if not tag_name:
        return jsonify({'error': 'Tag name is required'}), 400
    
    # Find or create tag
    tag = Tag.query.filter_by(name=tag_name, storage_id=document.storage_id).first()
    if not tag:
        tag = Tag(
            name=tag_name,
            storage_id=document.storage_id,
            is_auto_generated=False
        )
        db.session.add(tag)
    
    if tag not in document.tags:
        document.tags.append(tag)
        db.session.commit()
    
    return jsonify(document.to_dict()), 200


@documents_bp.route('/<string:doc_id>/tags/<string:tag_name>', methods=['DELETE'])
def remove_document_tag(doc_id, tag_name):
    """Remove a tag from a document.
    
    Path parameters:
        - doc_id (str): UUID of the document
        - tag_name (str): Name of the tag to remove
    
    Returns:
        200: Updated document with tags
        404: Document not found
    
    Requirements: 23.1
    """
    from backend.models.tag import Tag
    
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    tag_name = tag_name.strip().lower()
    
    # Find tag
    tag = Tag.query.filter_by(name=tag_name, storage_id=document.storage_id).first()
    if tag and tag in document.tags:
        document.tags.remove(tag)
        db.session.commit()
    
    return jsonify(document.to_dict()), 200


# ============================================================================
# Favorites Management Endpoints
# Requirements: 24.1, 24.2, 24.3
# ============================================================================

@documents_bp.route('/<string:doc_id>/favorite', methods=['PUT'])
def toggle_favorite(doc_id):
    """Toggle favorite status of a document.
    
    Accepts optional JSON body with:
        - is_favorite (optional): Explicitly set favorite status (true/false)
          If not provided, toggles the current status.
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: Updated document with new favorite status
        404: Document not found
    
    Requirements: 24.1, 24.3
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    data = request.get_json(silent=True) or {}
    
    # If is_favorite is explicitly provided, use it; otherwise toggle
    if 'is_favorite' in data:
        document.is_favorite = bool(data['is_favorite'])
    else:
        document.is_favorite = not document.is_favorite
    
    db.session.commit()
    
    return jsonify({
        'message': f'Document {"added to" if document.is_favorite else "removed from"} favorites',
        'document': document.to_dict()
    }), 200


@documents_bp.route('/favorites', methods=['GET'])
def list_favorites():
    """List all favorite documents across all storages or within a specific storage.
    
    Query parameters:
        - storage_id (optional): Filter by storage
        - include_deleted (optional): Include deleted documents (default: false)
        - sort_by (optional): Field to sort by (name, created_at, updated_at, size). Default: updated_at
        - order (optional): Sort order (asc, desc). Default: desc
    
    Returns:
        200: List of favorite document objects
    
    Requirements: 24.2
    """
    # Build query for favorites
    query = Document.query.filter_by(is_favorite=True)
    
    # Filter by storage if provided
    storage_id = request.args.get('storage_id')
    if storage_id:
        query = query.filter_by(storage_id=storage_id)
    
    # Filter deleted documents
    include_deleted = request.args.get('include_deleted', 'false').lower() == 'true'
    if not include_deleted:
        query = query.filter(Document.is_deleted == False)
    
    # Sorting
    sort_by = request.args.get('sort_by', 'updated_at')
    order = request.args.get('order', 'desc')
    
    valid_sort_fields = ['name', 'created_at', 'updated_at', 'size', 'file_type']
    if sort_by not in valid_sort_fields:
        sort_by = 'updated_at'
    
    sort_column = getattr(Document, sort_by)
    if order == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    
    documents = query.all()
    
    return jsonify([doc.to_dict() for doc in documents]), 200


# ============================================================================
# Archive Management Endpoints
# Requirements: 30.1, 30.2, 30.3
# ============================================================================

@documents_bp.route('/<string:doc_id>/archive', methods=['PUT'])
def toggle_archive(doc_id):
    """Toggle archive status of a document.
    
    Accepts optional JSON body with:
        - is_archived (optional): Explicitly set archive status (true/false)
          If not provided, toggles the current status.
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: Updated document with new archive status
        404: Document not found
    
    Requirements: 30.1, 30.3
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    data = request.get_json(silent=True) or {}
    
    # If is_archived is explicitly provided, use it; otherwise toggle
    if 'is_archived' in data:
        document.is_archived = bool(data['is_archived'])
    else:
        document.is_archived = not document.is_archived
    
    db.session.commit()
    
    return jsonify({
        'message': f'Document {"archived" if document.is_archived else "unarchived"}',
        'document': document.to_dict()
    }), 200


@documents_bp.route('/archived', methods=['GET'])
def list_archived():
    """List all archived documents across all storages or within a specific storage.
    
    Query parameters:
        - storage_id (optional): Filter by storage
        - include_deleted (optional): Include deleted documents (default: false)
        - sort_by (optional): Field to sort by (name, created_at, updated_at, size). Default: updated_at
        - order (optional): Sort order (asc, desc). Default: desc
    
    Returns:
        200: List of archived document objects
    
    Requirements: 30.2
    """
    # Build query for archived documents
    query = Document.query.filter_by(is_archived=True)
    
    # Filter by storage if provided
    storage_id = request.args.get('storage_id')
    if storage_id:
        query = query.filter_by(storage_id=storage_id)
    
    # Filter deleted documents
    include_deleted = request.args.get('include_deleted', 'false').lower() == 'true'
    if not include_deleted:
        query = query.filter(Document.is_deleted == False)
    
    # Sorting
    sort_by = request.args.get('sort_by', 'updated_at')
    order = request.args.get('order', 'desc')
    
    valid_sort_fields = ['name', 'created_at', 'updated_at', 'size', 'file_type']
    if sort_by not in valid_sort_fields:
        sort_by = 'updated_at'
    
    sort_column = getattr(Document, sort_by)
    if order == 'asc':
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    
    documents = query.all()
    
    return jsonify([doc.to_dict() for doc in documents]), 200


# ============================================================================
# Bulk Operations Endpoints
# Requirements: 27.1, 27.2, 27.3
# ============================================================================

@documents_bp.route('/bulk/delete', methods=['POST'])
def bulk_delete():
    """Bulk delete documents (move to trash).
    
    Accepts JSON body with:
        - document_ids (required): List of document IDs to delete
    
    Returns:
        200: Success message with count of deleted documents
        400: Invalid request
    
    Requirements: 27.1, 27.2, 27.3
    """
    data = request.get_json(silent=True)
    if not data or 'document_ids' not in data:
        return jsonify({'error': 'document_ids is required'}), 400
    
    document_ids = data['document_ids']
    if not isinstance(document_ids, list) or len(document_ids) == 0:
        return jsonify({'error': 'document_ids must be a non-empty list'}), 400
    
    # Validate all IDs are strings
    if not all(isinstance(doc_id, str) for doc_id in document_ids):
        return jsonify({'error': 'All document_ids must be strings'}), 400
    
    deleted_count = 0
    storage_ids = set()
    now = datetime.utcnow()
    
    for doc_id in document_ids:
        document = db.session.get(Document, doc_id)
        if document and not document.is_deleted:
            document.is_deleted = True
            document.deleted_at = now
            storage_ids.add(document.storage_id)
            deleted_count += 1
    
    db.session.commit()
    
    # Invalidate search cache for affected storages
    for storage_id in storage_ids:
        invalidate_storage_search_cache(storage_id)
    
    return jsonify({
        'message': f'{deleted_count} documents moved to trash',
        'deleted_count': deleted_count,
        'requested_count': len(document_ids)
    }), 200


@documents_bp.route('/bulk/move', methods=['POST'])
def bulk_move():
    """Bulk move documents to a different folder.
    
    Accepts JSON body with:
        - document_ids (required): List of document IDs to move
        - folder_id (required): Target folder ID (null for root)
    
    Returns:
        200: Success message with count of moved documents
        400: Invalid request
    
    Requirements: 27.1, 27.2, 27.3
    """
    data = request.get_json(silent=True)
    if not data or 'document_ids' not in data:
        return jsonify({'error': 'document_ids is required'}), 400
    
    document_ids = data['document_ids']
    if not isinstance(document_ids, list) or len(document_ids) == 0:
        return jsonify({'error': 'document_ids must be a non-empty list'}), 400
    
    # folder_id can be null (move to root) or a string
    folder_id = data.get('folder_id')
    if folder_id is not None and not isinstance(folder_id, str):
        return jsonify({'error': 'folder_id must be a string or null'}), 400
    
    # Validate all IDs are strings
    if not all(isinstance(doc_id, str) for doc_id in document_ids):
        return jsonify({'error': 'All document_ids must be strings'}), 400
    
    # Verify folder exists if specified
    if folder_id:
        from backend.models.folder import Folder
        folder = db.session.get(Folder, folder_id)
        if not folder:
            return jsonify({'error': 'Target folder not found'}), 404
    
    moved_count = 0
    
    for doc_id in document_ids:
        document = db.session.get(Document, doc_id)
        if document and not document.is_deleted:
            document.folder_id = folder_id
            moved_count += 1
    
    db.session.commit()
    
    return jsonify({
        'message': f'{moved_count} documents moved',
        'moved_count': moved_count,
        'requested_count': len(document_ids),
        'target_folder_id': folder_id
    }), 200


@documents_bp.route('/bulk/tag', methods=['POST'])
def bulk_tag():
    """Bulk add tags to documents.
    
    Accepts JSON body with:
        - document_ids (required): List of document IDs to tag
        - tags (required): List of tag names to add
        - action (optional): 'add' (default) or 'replace'
    
    Returns:
        200: Success message with count of tagged documents
        400: Invalid request
    
    Requirements: 27.1, 27.2, 27.3
    """
    from backend.models.tag import Tag
    
    data = request.get_json(silent=True)
    if not data or 'document_ids' not in data:
        return jsonify({'error': 'document_ids is required'}), 400
    
    if 'tags' not in data:
        return jsonify({'error': 'tags is required'}), 400
    
    document_ids = data['document_ids']
    if not isinstance(document_ids, list) or len(document_ids) == 0:
        return jsonify({'error': 'document_ids must be a non-empty list'}), 400
    
    tag_names = data['tags']
    if not isinstance(tag_names, list):
        return jsonify({'error': 'tags must be a list'}), 400
    
    action = data.get('action', 'add')
    if action not in ['add', 'replace']:
        return jsonify({'error': 'action must be "add" or "replace"'}), 400
    
    # Validate all IDs are strings
    if not all(isinstance(doc_id, str) for doc_id in document_ids):
        return jsonify({'error': 'All document_ids must be strings'}), 400
    
    tagged_count = 0
    
    for doc_id in document_ids:
        document = db.session.get(Document, doc_id)
        if document and not document.is_deleted:
            # Clear existing tags if replacing
            if action == 'replace':
                document.tags = []
            
            # Add new tags
            for tag_name in tag_names:
                if not isinstance(tag_name, str) or not tag_name.strip():
                    continue
                
                tag_name = tag_name.strip().lower()[:100]
                
                # Find or create tag
                tag = Tag.query.filter_by(name=tag_name, storage_id=document.storage_id).first()
                if not tag:
                    tag = Tag(
                        name=tag_name,
                        storage_id=document.storage_id,
                        is_auto_generated=False
                    )
                    db.session.add(tag)
                
                if tag not in document.tags:
                    document.tags.append(tag)
            
            tagged_count += 1
    
    db.session.commit()
    
    return jsonify({
        'message': f'{tagged_count} documents tagged',
        'tagged_count': tagged_count,
        'requested_count': len(document_ids),
        'tags': tag_names,
        'action': action
    }), 200


@documents_bp.route('/bulk/archive', methods=['POST'])
def bulk_archive():
    """Bulk archive documents.
    
    Accepts JSON body with:
        - document_ids (required): List of document IDs to archive
        - is_archived (optional): True to archive, False to unarchive (default: True)
    
    Returns:
        200: Success message with count of archived documents
        400: Invalid request
    
    Requirements: 27.1, 27.2, 27.3
    """
    data = request.get_json(silent=True)
    if not data or 'document_ids' not in data:
        return jsonify({'error': 'document_ids is required'}), 400
    
    document_ids = data['document_ids']
    if not isinstance(document_ids, list) or len(document_ids) == 0:
        return jsonify({'error': 'document_ids must be a non-empty list'}), 400
    
    # Validate all IDs are strings
    if not all(isinstance(doc_id, str) for doc_id in document_ids):
        return jsonify({'error': 'All document_ids must be strings'}), 400
    
    is_archived = data.get('is_archived', True)
    
    archived_count = 0
    
    for doc_id in document_ids:
        document = db.session.get(Document, doc_id)
        if document and not document.is_deleted:
            document.is_archived = bool(is_archived)
            archived_count += 1
    
    db.session.commit()
    
    action_word = 'archived' if is_archived else 'unarchived'
    return jsonify({
        'message': f'{archived_count} documents {action_word}',
        'count': archived_count,
        'requested_count': len(document_ids),
        'is_archived': is_archived
    }), 200


@documents_bp.route('/bulk/favorite', methods=['POST'])
def bulk_favorite():
    """Bulk favorite/unfavorite documents.
    
    Accepts JSON body with:
        - document_ids (required): List of document IDs
        - is_favorite (optional): True to favorite, False to unfavorite (default: True)
    
    Returns:
        200: Success message with count of updated documents
        400: Invalid request
    
    Requirements: 27.1, 27.2, 27.3
    """
    data = request.get_json(silent=True)
    if not data or 'document_ids' not in data:
        return jsonify({'error': 'document_ids is required'}), 400
    
    document_ids = data['document_ids']
    if not isinstance(document_ids, list) or len(document_ids) == 0:
        return jsonify({'error': 'document_ids must be a non-empty list'}), 400
    
    # Validate all IDs are strings
    if not all(isinstance(doc_id, str) for doc_id in document_ids):
        return jsonify({'error': 'All document_ids must be strings'}), 400
    
    is_favorite = data.get('is_favorite', True)
    
    updated_count = 0
    
    for doc_id in document_ids:
        document = db.session.get(Document, doc_id)
        if document and not document.is_deleted:
            document.is_favorite = bool(is_favorite)
            updated_count += 1
    
    db.session.commit()
    
    action_word = 'added to favorites' if is_favorite else 'removed from favorites'
    return jsonify({
        'message': f'{updated_count} documents {action_word}',
        'count': updated_count,
        'requested_count': len(document_ids),
        'is_favorite': is_favorite
    }), 200


# ============================================================================
# OCR Endpoints
# Requirements: 10.1, 10.2, 10.3
# ============================================================================

@documents_bp.route('/<string:doc_id>/ocr', methods=['GET'])
def get_document_ocr(doc_id):
    """Get OCR extracted text for a document.
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: OCR text and metadata
        404: Document not found
        400: Document is not an image
    
    Requirements: 10.2
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if document.file_type != 'image':
        return jsonify({
            'error': 'OCR is only available for image files',
            'file_type': document.file_type
        }), 400
    
    return jsonify({
        'document_id': doc_id,
        'document_name': document.name,
        'has_ocr_text': bool(document.ocr_text),
        'ocr_text': document.ocr_text or '',
        'text_length': len(document.ocr_text) if document.ocr_text else 0
    }), 200


@documents_bp.route('/<string:doc_id>/ocr', methods=['POST'])
def process_document_ocr_endpoint(doc_id):
    """Process or re-process OCR for a document.
    
    Extracts text from an image document using Gemini Vision API.
    
    Path parameters:
        - doc_id (str): UUID of the document
    
    Returns:
        200: OCR processing result
        404: Document not found
        400: Document is not an image
        500: OCR processing failed
    
    Requirements: 10.1, 10.2
    """
    document = db.session.get(Document, doc_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if document.file_type != 'image':
        return jsonify({
            'error': 'OCR is only available for image files',
            'file_type': document.file_type
        }), 400
    
    try:
        from backend.utils.ocr import process_document_ocr
        success = process_document_ocr(doc_id)
        
        if not success:
            return jsonify({'error': 'OCR processing failed'}), 500
        
        # Refresh document to get updated ocr_text
        db.session.refresh(document)
        
        return jsonify({
            'document_id': doc_id,
            'document_name': document.name,
            'success': True,
            'has_ocr_text': bool(document.ocr_text),
            'ocr_text': document.ocr_text or '',
            'text_length': len(document.ocr_text) if document.ocr_text else 0
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'OCR endpoint error for {doc_id}: {str(e)}')
        return jsonify({'error': f'OCR processing failed: {str(e)}'}), 500


@documents_bp.route('/bulk/ocr', methods=['POST'])
def bulk_process_ocr():
    """Process OCR for multiple image documents.
    
    Accepts JSON body with:
        - document_ids (required): List of document IDs to process
    
    Returns:
        200: Processing results for each document
        400: Invalid request
    
    Requirements: 10.1, 10.2
    """
    data = request.get_json(silent=True)
    if not data or 'document_ids' not in data:
        return jsonify({'error': 'document_ids is required'}), 400
    
    document_ids = data['document_ids']
    if not isinstance(document_ids, list) or len(document_ids) == 0:
        return jsonify({'error': 'document_ids must be a non-empty list'}), 400
    
    from backend.utils.ocr import process_document_ocr
    
    results = []
    success_count = 0
    
    for doc_id in document_ids:
        document = db.session.get(Document, doc_id)
        
        if not document:
            results.append({
                'document_id': doc_id,
                'success': False,
                'error': 'Document not found'
            })
            continue
        
        if document.file_type != 'image':
            results.append({
                'document_id': doc_id,
                'success': False,
                'error': 'Not an image file'
            })
            continue
        
        try:
            success = process_document_ocr(doc_id)
            if success:
                db.session.refresh(document)
                results.append({
                    'document_id': doc_id,
                    'document_name': document.name,
                    'success': True,
                    'has_ocr_text': bool(document.ocr_text),
                    'text_length': len(document.ocr_text) if document.ocr_text else 0
                })
                success_count += 1
            else:
                results.append({
                    'document_id': doc_id,
                    'success': False,
                    'error': 'OCR processing failed'
                })
        except Exception as e:
            results.append({
                'document_id': doc_id,
                'success': False,
                'error': str(e)
            })
    
    return jsonify({
        'results': results,
        'total': len(document_ids),
        'success_count': success_count,
        'failed_count': len(document_ids) - success_count
    }), 200
