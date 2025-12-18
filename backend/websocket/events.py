"""WebSocket event handlers for real-time collaboration."""
from flask import request
from flask_socketio import emit, join_room, leave_room
from backend.extensions import socketio
from backend.websocket.presence import presence


def register_socket_events(socketio_instance):
    """
    Register all Socket.IO event handlers.
    
    Args:
        socketio_instance: The Flask-SocketIO instance
    """
    
    @socketio_instance.on('connect')
    def handle_connect():
        """Handle client connection."""
        session_id = request.sid
        print(f'Client connected: {session_id}')
        emit('connected', {'session_id': session_id})
    
    @socketio_instance.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection."""
        session_id = request.sid
        print(f'Client disconnected: {session_id}')
        
        # Remove user from all documents they were in
        left_documents = presence.disconnect_session(session_id)
        
        # Notify other users in each document
        for document_id, user_info in left_documents:
            room = f'document:{document_id}'
            emit('user_left', {
                'document_id': document_id,
                'user_id': user_info.get('user_id') if user_info else None,
                'user_name': user_info.get('user_name') if user_info else None,
                'session_id': session_id
            }, room=room)
            
            # Also unregister from notifications if we have user info
            if user_info and user_info.get('user_id'):
                unregister_user_session(user_info['user_id'], session_id)
    
    @socketio_instance.on('join_document')
    def handle_join_document(data):
        """
        Handle user joining a document room.
        
        Expected data:
            document_id: str - The document ID to join
            user_id: str - The user's ID
            user_name: str - The user's display name (optional)
            user_email: str - The user's email (optional)
        """
        session_id = request.sid
        document_id = data.get('document_id')
        user_id = data.get('user_id')
        user_name = data.get('user_name')
        user_email = data.get('user_email')
        
        if not document_id or not user_id:
            emit('error', {'message': 'document_id and user_id are required'})
            return
        
        room = f'document:{document_id}'
        
        # Join the Socket.IO room
        join_room(room)
        
        # Add to presence tracking
        other_users = presence.join_document(
            document_id=document_id,
            user_id=user_id,
            session_id=session_id,
            user_name=user_name,
            user_email=user_email
        )
        
        # Notify the joining user of who else is in the document
        emit('document_joined', {
            'document_id': document_id,
            'users': other_users
        })
        
        # Notify other users in the room
        emit('user_joined', {
            'document_id': document_id,
            'user_id': user_id,
            'user_name': user_name,
            'user_email': user_email,
            'session_id': session_id
        }, room=room, include_self=False)
        
        print(f'User {user_id} joined document {document_id}')
    
    @socketio_instance.on('leave_document')
    def handle_leave_document(data):
        """
        Handle user leaving a document room.
        
        Expected data:
            document_id: str - The document ID to leave
        """
        session_id = request.sid
        document_id = data.get('document_id')
        
        if not document_id:
            emit('error', {'message': 'document_id is required'})
            return
        
        room = f'document:{document_id}'
        
        # Remove from presence tracking
        user_info = presence.leave_document(document_id, session_id)
        
        # Leave the Socket.IO room
        leave_room(room)
        
        # Notify other users in the room
        if user_info:
            emit('user_left', {
                'document_id': document_id,
                'user_id': user_info.get('user_id'),
                'user_name': user_info.get('user_name'),
                'session_id': session_id
            }, room=room)
        
        # Confirm to the leaving user
        emit('document_left', {'document_id': document_id})
        
        print(f'User left document {document_id}')
    
    @socketio_instance.on('cursor_move')
    def handle_cursor_move(data):
        """
        Handle cursor position updates for collaborative editing.
        
        Expected data:
            document_id: str - The document ID
            position: dict - Cursor position {line, column}
            selection: dict - Selection range (optional)
        """
        session_id = request.sid
        document_id = data.get('document_id')
        position = data.get('position')
        selection = data.get('selection')
        
        if not document_id or not position:
            return
        
        room = f'document:{document_id}'
        
        # Broadcast cursor position to other users in the document
        emit('cursor_update', {
            'document_id': document_id,
            'session_id': session_id,
            'position': position,
            'selection': selection
        }, room=room, include_self=False)
    
    @socketio_instance.on('edit_content')
    def handle_edit_content(data):
        """
        Handle content edit operations for collaborative editing.
        
        Expected data:
            document_id: str - The document ID
            operation: dict - The edit operation (insert, delete, replace)
            version: int - The document version this edit is based on
        """
        session_id = request.sid
        document_id = data.get('document_id')
        operation = data.get('operation')
        version = data.get('version')
        
        if not document_id or not operation:
            emit('error', {'message': 'document_id and operation are required'})
            return
        
        room = f'document:{document_id}'
        
        # Broadcast the edit to other users in the document
        emit('content_update', {
            'document_id': document_id,
            'session_id': session_id,
            'operation': operation,
            'version': version
        }, room=room, include_self=False)
    
    @socketio_instance.on('get_document_users')
    def handle_get_document_users(data):
        """
        Get list of users currently in a document.
        
        Expected data:
            document_id: str - The document ID
        """
        document_id = data.get('document_id')
        
        if not document_id:
            emit('error', {'message': 'document_id is required'})
            return
        
        users = presence.get_document_users(document_id)
        emit('document_users', {
            'document_id': document_id,
            'users': users
        })
    
    @socketio_instance.on('ping')
    def handle_ping():
        """Handle ping for connection keep-alive."""
        emit('pong')
    
    @socketio_instance.on('register_user')
    def handle_register_user(data):
        """
        Register a user session for receiving notifications.
        
        Expected data:
            user_id: str - The user's ID
        """
        session_id = request.sid
        user_id = data.get('user_id')
        
        if not user_id:
            emit('error', {'message': 'user_id is required'})
            return
        
        register_user_session(user_id, session_id)
        emit('user_registered', {'user_id': user_id, 'session_id': session_id})
        print(f'User {user_id} registered for notifications (session: {session_id})')
    
    @socketio_instance.on('unregister_user')
    def handle_unregister_user(data):
        """
        Unregister a user session from notifications.
        
        Expected data:
            user_id: str - The user's ID
        """
        session_id = request.sid
        user_id = data.get('user_id')
        
        if user_id:
            unregister_user_session(user_id, session_id)
            emit('user_unregistered', {'user_id': user_id})
            print(f'User {user_id} unregistered from notifications')
    
    @socketio_instance.on('request_sync')
    def handle_request_sync(data):
        """
        Handle sync request from a client.
        Returns the current document content and version.
        
        Expected data:
            document_id: str - The document ID
            current_version: int - Client's current version
        """
        from backend.models.document import Document
        
        document_id = data.get('document_id')
        current_version = data.get('current_version', 0)
        
        if not document_id:
            emit('error', {'message': 'document_id is required'})
            return
        
        try:
            # Get document from database
            document = Document.query.get(document_id)
            if not document:
                emit('error', {'message': 'Document not found'})
                return
            
            # Read document content
            content = ''
            if document.file_path:
                import os
                if os.path.exists(document.file_path):
                    with open(document.file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
            
            # Get version from document (use updated_at timestamp as version)
            version = int(document.updated_at.timestamp()) if document.updated_at else 0
            
            emit('sync_response', {
                'document_id': document_id,
                'content': content,
                'version': version
            })
        except Exception as e:
            print(f'Error handling sync request: {e}')
            emit('error', {'message': 'Failed to sync document'})


def broadcast_to_document(document_id: str, event: str, data: dict, skip_sid: str = None):
    """
    Broadcast an event to all users in a document.
    
    Args:
        document_id: The document ID
        event: The event name
        data: The event data
        skip_sid: Optional session ID to skip
    """
    room = f'document:{document_id}'
    socketio.emit(event, data, room=room, skip_sid=skip_sid)


def notify_document_change(document_id: str, change_type: str, change_data: dict):
    """
    Notify all users in a document about a change.
    
    Args:
        document_id: The document ID
        change_type: Type of change (update, delete, etc.)
        change_data: Data about the change
    """
    broadcast_to_document(document_id, 'document_changed', {
        'document_id': document_id,
        'change_type': change_type,
        'data': change_data
    })


# User session tracking for notifications
user_sessions = {}  # Maps user_id to set of session_ids


def register_user_session(user_id: str, session_id: str):
    """Register a user's session for notifications."""
    if user_id not in user_sessions:
        user_sessions[user_id] = set()
    user_sessions[user_id].add(session_id)


def unregister_user_session(user_id: str, session_id: str):
    """Unregister a user's session."""
    if user_id in user_sessions:
        user_sessions[user_id].discard(session_id)
        if not user_sessions[user_id]:
            del user_sessions[user_id]


def get_user_sessions(user_id: str) -> set:
    """Get all active sessions for a user."""
    return user_sessions.get(user_id, set())


def send_notification_to_user(user_id: str, notification_data: dict):
    """
    Send a notification to a specific user via WebSocket.
    
    Args:
        user_id: The user ID to notify
        notification_data: The notification data to send
    """
    sessions = get_user_sessions(user_id)
    for session_id in sessions:
        socketio.emit('notification', notification_data, room=session_id)


def broadcast_notification(notification_data: dict, exclude_user_id: str = None):
    """
    Broadcast a notification to all connected users.
    
    Args:
        notification_data: The notification data to send
        exclude_user_id: Optional user ID to exclude from broadcast
    """
    for user_id, sessions in user_sessions.items():
        if user_id != exclude_user_id:
            for session_id in sessions:
                socketio.emit('notification', notification_data, room=session_id)
