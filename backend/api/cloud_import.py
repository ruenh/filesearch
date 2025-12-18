"""Cloud Import API blueprint.

Implements cloud service integration for importing files from Google Drive, Dropbox, OneDrive.
Requirements: 32.1, 32.2, 32.3
"""
import os
import uuid
import hashlib
import tempfile
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app, redirect, session, url_for
from werkzeug.utils import secure_filename

from backend.extensions import db
from backend.models.document import Document
from backend.models.storage import Storage
from backend.models.version import Version
from backend.api.search import invalidate_storage_search_cache

cloud_import_bp = Blueprint('cloud_import', __name__)

# Google Drive OAuth configuration
GOOGLE_OAUTH_SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
]

# Supported file types for import
ALLOWED_EXTENSIONS = {
    'txt': 'text/plain',
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'md': 'text/markdown',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp'
}

# Google Drive MIME type mappings
GOOGLE_MIME_TYPES = {
    'application/vnd.google-apps.document': ('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    'application/vnd.google-apps.spreadsheet': None,  # Not supported
    'application/vnd.google-apps.presentation': None,  # Not supported
}

# Maximum file size: 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024


def get_google_credentials():
    """Get Google OAuth credentials from environment."""
    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:5000/api/cloud/google/callback')
    
    return {
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri
    }


def get_file_extension(filename):
    """Extract file extension from filename."""
    if '.' in filename:
        return filename.rsplit('.', 1)[1].lower()
    return ''


def detect_file_type(filename, mime_type=None):
    """Detect file type from filename and optional MIME type."""
    ext = get_file_extension(filename)
    
    if ext in ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']:
        return 'image'
    elif ext in ALLOWED_EXTENSIONS:
        return ext
    
    # Fallback to MIME type detection
    if mime_type:
        for ext, mime in ALLOWED_EXTENSIONS.items():
            if mime_type == mime:
                if ext in ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']:
                    return 'image'
                return ext
    
    return None


def calculate_file_hash(file_content):
    """Calculate SHA-256 hash of file content."""
    return hashlib.sha256(file_content).hexdigest()


def is_supported_mime_type(mime_type):
    """Check if MIME type is supported for import."""
    # Check direct MIME types
    if mime_type in ALLOWED_EXTENSIONS.values():
        return True
    
    # Check Google Docs types that can be exported
    if mime_type in GOOGLE_MIME_TYPES:
        return GOOGLE_MIME_TYPES[mime_type] is not None
    
    return False


# ============================================================================
# Google Drive OAuth Endpoints
# Requirements: 32.1, 32.2
# ============================================================================

@cloud_import_bp.route('/google/auth', methods=['GET'])
def google_auth():
    """Initiate Google OAuth flow.
    
    Returns:
        200: OAuth authorization URL
        400: Missing Google credentials configuration
    
    Requirements: 32.1
    """
    creds = get_google_credentials()
    
    if not creds['client_id'] or not creds['client_secret']:
        return jsonify({
            'error': 'Google OAuth not configured',
            'message': 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables'
        }), 400
    
    # Build OAuth URL
    oauth_url = (
        'https://accounts.google.com/o/oauth2/v2/auth?'
        f'client_id={creds["client_id"]}&'
        f'redirect_uri={creds["redirect_uri"]}&'
        'response_type=code&'
        f'scope={" ".join(GOOGLE_OAUTH_SCOPES)}&'
        'access_type=offline&'
        'prompt=consent'
    )
    
    return jsonify({
        'auth_url': oauth_url,
        'provider': 'google_drive'
    }), 200


@cloud_import_bp.route('/google/callback', methods=['GET'])
def google_callback():
    """Handle Google OAuth callback.
    
    Query parameters:
        - code: Authorization code from Google
        - error: Error message if authorization failed
    
    Returns:
        Redirect to frontend with token or error
    
    Requirements: 32.1
    """
    import requests
    
    error = request.args.get('error')
    if error:
        # Redirect to frontend with error
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        return redirect(f'{frontend_url}/cloud-import?error={error}')
    
    code = request.args.get('code')
    if not code:
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        return redirect(f'{frontend_url}/cloud-import?error=no_code')
    
    creds = get_google_credentials()
    
    # Exchange code for tokens
    try:
        token_response = requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'client_id': creds['client_id'],
                'client_secret': creds['client_secret'],
                'code': code,
                'grant_type': 'authorization_code',
                'redirect_uri': creds['redirect_uri']
            }
        )
        
        if token_response.status_code != 200:
            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
            return redirect(f'{frontend_url}/cloud-import?error=token_exchange_failed')
        
        tokens = token_response.json()
        access_token = tokens.get('access_token')
        
        # Redirect to frontend with token
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        return redirect(f'{frontend_url}/cloud-import?token={access_token}&provider=google_drive')
        
    except Exception as e:
        current_app.logger.error(f'Google OAuth callback error: {str(e)}')
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        return redirect(f'{frontend_url}/cloud-import?error=callback_failed')


@cloud_import_bp.route('/google/token', methods=['POST'])
def google_token_exchange():
    """Exchange authorization code for access token (for SPA flow).
    
    Accepts JSON body with:
        - code (required): Authorization code from Google
    
    Returns:
        200: Access token and token info
        400: Missing code or exchange failed
    
    Requirements: 32.1
    """
    import requests
    
    data = request.get_json(silent=True)
    if not data or 'code' not in data:
        return jsonify({'error': 'Authorization code is required'}), 400
    
    code = data['code']
    creds = get_google_credentials()
    
    if not creds['client_id'] or not creds['client_secret']:
        return jsonify({
            'error': 'Google OAuth not configured'
        }), 400
    
    try:
        token_response = requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'client_id': creds['client_id'],
                'client_secret': creds['client_secret'],
                'code': code,
                'grant_type': 'authorization_code',
                'redirect_uri': creds['redirect_uri']
            }
        )
        
        if token_response.status_code != 200:
            return jsonify({
                'error': 'Token exchange failed',
                'details': token_response.json()
            }), 400
        
        tokens = token_response.json()
        
        return jsonify({
            'access_token': tokens.get('access_token'),
            'expires_in': tokens.get('expires_in'),
            'token_type': tokens.get('token_type'),
            'provider': 'google_drive'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Token exchange error: {str(e)}')
        return jsonify({'error': 'Token exchange failed'}), 500


# ============================================================================
# Google Drive File Browser Endpoints
# Requirements: 32.2
# ============================================================================

@cloud_import_bp.route('/google/files', methods=['GET'])
def list_google_files():
    """List files from Google Drive.
    
    Query parameters:
        - token (required): Google OAuth access token
        - folder_id (optional): Folder ID to list (default: root)
        - page_token (optional): Token for pagination
    
    Returns:
        200: List of files and folders
        400: Missing token
        401: Invalid or expired token
    
    Requirements: 32.2
    """
    import requests
    
    token = request.args.get('token')
    if not token:
        return jsonify({'error': 'Access token is required'}), 400
    
    folder_id = request.args.get('folder_id', 'root')
    page_token = request.args.get('page_token')
    
    # Build query for files in folder
    query = f"'{folder_id}' in parents and trashed = false"
    
    params = {
        'q': query,
        'fields': 'nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink, thumbnailLink)',
        'pageSize': 50,
        'orderBy': 'folder,name'
    }
    
    if page_token:
        params['pageToken'] = page_token
    
    try:
        response = requests.get(
            'https://www.googleapis.com/drive/v3/files',
            headers={'Authorization': f'Bearer {token}'},
            params=params
        )
        
        if response.status_code == 401:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        if response.status_code != 200:
            return jsonify({
                'error': 'Failed to list files',
                'details': response.json()
            }), response.status_code
        
        data = response.json()
        files = data.get('files', [])
        
        # Transform files to our format
        transformed_files = []
        for file in files:
            mime_type = file.get('mimeType', '')
            is_folder = mime_type == 'application/vnd.google-apps.folder'
            is_supported = is_folder or is_supported_mime_type(mime_type)
            
            transformed_files.append({
                'id': file.get('id'),
                'name': file.get('name'),
                'mime_type': mime_type,
                'size': int(file.get('size', 0)) if file.get('size') else None,
                'modified_at': file.get('modifiedTime'),
                'icon_url': file.get('iconLink'),
                'thumbnail_url': file.get('thumbnailLink'),
                'is_folder': is_folder,
                'is_supported': is_supported
            })
        
        return jsonify({
            'files': transformed_files,
            'next_page_token': data.get('nextPageToken'),
            'folder_id': folder_id
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'List Google files error: {str(e)}')
        return jsonify({'error': 'Failed to list files'}), 500


@cloud_import_bp.route('/google/file/<file_id>', methods=['GET'])
def get_google_file_info(file_id):
    """Get detailed info about a Google Drive file.
    
    Path parameters:
        - file_id: Google Drive file ID
    
    Query parameters:
        - token (required): Google OAuth access token
    
    Returns:
        200: File details
        400: Missing token
        404: File not found
    
    Requirements: 32.2
    """
    import requests
    
    token = request.args.get('token')
    if not token:
        return jsonify({'error': 'Access token is required'}), 400
    
    try:
        response = requests.get(
            f'https://www.googleapis.com/drive/v3/files/{file_id}',
            headers={'Authorization': f'Bearer {token}'},
            params={
                'fields': 'id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink'
            }
        )
        
        if response.status_code == 404:
            return jsonify({'error': 'File not found'}), 404
        
        if response.status_code != 200:
            return jsonify({
                'error': 'Failed to get file info',
                'details': response.json()
            }), response.status_code
        
        file = response.json()
        mime_type = file.get('mimeType', '')
        
        return jsonify({
            'id': file.get('id'),
            'name': file.get('name'),
            'mime_type': mime_type,
            'size': int(file.get('size', 0)) if file.get('size') else None,
            'created_at': file.get('createdTime'),
            'modified_at': file.get('modifiedTime'),
            'parent_ids': file.get('parents', []),
            'web_view_link': file.get('webViewLink'),
            'is_supported': is_supported_mime_type(mime_type)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Get Google file info error: {str(e)}')
        return jsonify({'error': 'Failed to get file info'}), 500


# ============================================================================
# Import Files Endpoint
# Requirements: 32.3
# ============================================================================

@cloud_import_bp.route('/google/import', methods=['POST'])
def import_google_files():
    """Import files from Google Drive to a storage.
    
    Accepts JSON body with:
        - token (required): Google OAuth access token
        - file_ids (required): List of Google Drive file IDs to import
        - storage_id (required): Target storage ID
        - folder_id (optional): Target folder ID within storage
    
    Returns:
        200: Import results with created documents
        400: Missing required fields
        404: Storage not found
    
    Requirements: 32.3
    """
    import requests
    
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    token = data.get('token')
    file_ids = data.get('file_ids', [])
    storage_id = data.get('storage_id')
    folder_id = data.get('folder_id')
    
    if not token:
        return jsonify({'error': 'Access token is required'}), 400
    
    if not file_ids:
        return jsonify({'error': 'At least one file_id is required'}), 400
    
    if not storage_id:
        return jsonify({'error': 'storage_id is required'}), 400
    
    # Verify storage exists
    storage = Storage.query.get(storage_id)
    if not storage:
        return jsonify({'error': 'Storage not found'}), 404
    
    results = []
    success_count = 0
    failed_count = 0
    
    for file_id in file_ids:
        try:
            result = import_single_file(token, file_id, storage_id, folder_id)
            results.append(result)
            if result.get('success'):
                success_count += 1
            else:
                failed_count += 1
        except Exception as e:
            current_app.logger.error(f'Import file {file_id} error: {str(e)}')
            results.append({
                'file_id': file_id,
                'success': False,
                'error': str(e)
            })
            failed_count += 1
    
    # Invalidate search cache for this storage
    if success_count > 0:
        invalidate_storage_search_cache(storage_id)
    
    return jsonify({
        'results': results,
        'total': len(file_ids),
        'success_count': success_count,
        'failed_count': failed_count
    }), 200


def import_single_file(token, file_id, storage_id, folder_id=None):
    """Import a single file from Google Drive.
    
    Returns dict with import result.
    """
    import requests
    
    # Get file metadata
    meta_response = requests.get(
        f'https://www.googleapis.com/drive/v3/files/{file_id}',
        headers={'Authorization': f'Bearer {token}'},
        params={'fields': 'id, name, mimeType, size'}
    )
    
    if meta_response.status_code != 200:
        return {
            'file_id': file_id,
            'success': False,
            'error': 'Failed to get file metadata'
        }
    
    file_meta = meta_response.json()
    file_name = file_meta.get('name', 'unknown')
    mime_type = file_meta.get('mimeType', '')
    file_size = int(file_meta.get('size', 0)) if file_meta.get('size') else 0
    
    # Check if file type is supported
    if not is_supported_mime_type(mime_type):
        return {
            'file_id': file_id,
            'file_name': file_name,
            'success': False,
            'error': f'Unsupported file type: {mime_type}'
        }
    
    # Check file size
    if file_size > MAX_FILE_SIZE:
        return {
            'file_id': file_id,
            'file_name': file_name,
            'success': False,
            'error': f'File too large (max {MAX_FILE_SIZE // (1024*1024)}MB)'
        }
    
    # Determine download URL and export format for Google Docs
    if mime_type in GOOGLE_MIME_TYPES:
        export_info = GOOGLE_MIME_TYPES[mime_type]
        if export_info is None:
            return {
                'file_id': file_id,
                'file_name': file_name,
                'success': False,
                'error': f'Cannot export Google file type: {mime_type}'
            }
        
        ext, export_mime = export_info
        download_url = f'https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType={export_mime}'
        file_name = f'{file_name}.{ext}' if not file_name.endswith(f'.{ext}') else file_name
    else:
        download_url = f'https://www.googleapis.com/drive/v3/files/{file_id}?alt=media'
    
    # Download file content
    download_response = requests.get(
        download_url,
        headers={'Authorization': f'Bearer {token}'},
        stream=True
    )
    
    if download_response.status_code != 200:
        return {
            'file_id': file_id,
            'file_name': file_name,
            'success': False,
            'error': 'Failed to download file'
        }
    
    # Read content
    file_content = download_response.content
    actual_size = len(file_content)
    
    # Check actual size
    if actual_size > MAX_FILE_SIZE:
        return {
            'file_id': file_id,
            'file_name': file_name,
            'success': False,
            'error': f'Downloaded file too large (max {MAX_FILE_SIZE // (1024*1024)}MB)'
        }
    
    # Detect file type
    file_type = detect_file_type(file_name, mime_type)
    if not file_type:
        return {
            'file_id': file_id,
            'file_name': file_name,
            'success': False,
            'error': 'Could not determine file type'
        }
    
    # Generate document ID
    document_id = str(uuid.uuid4())
    
    # Save file to disk
    try:
        upload_folder = current_app.config['UPLOAD_FOLDER']
        storage_folder = os.path.join(upload_folder, storage_id)
        os.makedirs(storage_folder, exist_ok=True)
        
        # Secure the filename
        safe_name = secure_filename(file_name)
        ext = get_file_extension(safe_name)
        
        # Create unique filename with document ID
        unique_filename = f"{document_id}.{ext}" if ext else document_id
        file_path = os.path.join(storage_folder, unique_filename)
        
        # Calculate hash
        content_hash = calculate_file_hash(file_content)
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Relative path from upload folder
        relative_path = os.path.join(storage_id, unique_filename)
        
    except Exception as e:
        current_app.logger.error(f'Failed to save imported file: {str(e)}')
        return {
            'file_id': file_id,
            'file_name': file_name,
            'success': False,
            'error': 'Failed to save file'
        }
    
    # Create document record
    document = Document(
        id=document_id,
        storage_id=storage_id,
        folder_id=folder_id,
        name=safe_name,
        file_type=file_type,
        size=actual_size,
        file_path=relative_path,
        content_hash=content_hash
    )
    
    # Create initial version
    version = Version(
        id=str(uuid.uuid4()),
        document_id=document_id,
        version_number=1,
        file_path=relative_path,
        size=actual_size,
        content_hash=content_hash
    )
    
    # Save to database
    db.session.add(document)
    db.session.add(version)
    db.session.commit()
    
    # Process OCR for image files
    if file_type == 'image':
        try:
            from backend.utils.ocr import process_document_ocr
            process_document_ocr(document_id)
            db.session.refresh(document)
        except Exception as e:
            current_app.logger.error(f'OCR processing failed for imported {document_id}: {str(e)}')
    
    return {
        'file_id': file_id,
        'file_name': file_name,
        'success': True,
        'document': document.to_dict()
    }


# ============================================================================
# Cloud Provider Status Endpoint
# ============================================================================

@cloud_import_bp.route('/providers', methods=['GET'])
def list_cloud_providers():
    """List available cloud import providers and their configuration status.
    
    Returns:
        200: List of providers with configuration status
    """
    creds = get_google_credentials()
    
    providers = [
        {
            'id': 'google_drive',
            'name': 'Google Drive',
            'icon': 'google-drive',
            'configured': bool(creds['client_id'] and creds['client_secret']),
            'supported_types': list(ALLOWED_EXTENSIONS.keys())
        },
        {
            'id': 'dropbox',
            'name': 'Dropbox',
            'icon': 'dropbox',
            'configured': False,  # Not implemented yet
            'supported_types': []
        },
        {
            'id': 'onedrive',
            'name': 'OneDrive',
            'icon': 'onedrive',
            'configured': False,  # Not implemented yet
            'supported_types': []
        }
    ]
    
    return jsonify({
        'providers': providers
    }), 200
