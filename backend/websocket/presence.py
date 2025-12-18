"""Document presence tracking for real-time collaboration."""
from datetime import datetime, timezone
from typing import Dict, Set, Optional
import threading


class DocumentPresence:
    """
    Manages user presence in documents for real-time collaboration.
    
    Tracks which users are currently viewing/editing each document
    and provides methods to join, leave, and query presence.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """Singleton pattern for presence tracking."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize presence tracking data structures."""
        if self._initialized:
            return
        
        # document_id -> set of (user_id, session_id) tuples
        self._document_users: Dict[str, Set[tuple]] = {}
        
        # session_id -> user info dict
        self._session_info: Dict[str, dict] = {}
        
        # session_id -> set of document_ids
        self._session_documents: Dict[str, Set[str]] = {}
        
        # Lock for thread-safe operations
        self._data_lock = threading.Lock()
        
        self._initialized = True
    
    def join_document(self, document_id: str, user_id: str, session_id: str, 
                      user_name: str = None, user_email: str = None) -> list:
        """
        Add a user to a document's presence list.
        
        Args:
            document_id: The document being joined
            user_id: The user's ID
            session_id: The socket session ID
            user_name: Optional user display name
            user_email: Optional user email
            
        Returns:
            List of other users currently in the document
        """
        with self._data_lock:
            # Initialize document set if needed
            if document_id not in self._document_users:
                self._document_users[document_id] = set()
            
            # Add user to document
            user_tuple = (user_id, session_id)
            self._document_users[document_id].add(user_tuple)
            
            # Store session info
            self._session_info[session_id] = {
                'user_id': user_id,
                'user_name': user_name,
                'user_email': user_email,
                'joined_at': datetime.now(timezone.utc).isoformat()
            }
            
            # Track which documents this session is in
            if session_id not in self._session_documents:
                self._session_documents[session_id] = set()
            self._session_documents[session_id].add(document_id)
            
            # Return list of other users in the document
            return self._get_document_users(document_id, exclude_session=session_id)
    
    def leave_document(self, document_id: str, session_id: str) -> Optional[dict]:
        """
        Remove a user from a document's presence list.
        
        Args:
            document_id: The document being left
            session_id: The socket session ID
            
        Returns:
            User info dict if user was in document, None otherwise
        """
        with self._data_lock:
            user_info = self._session_info.get(session_id)
            
            if document_id in self._document_users:
                # Find and remove the user tuple
                to_remove = None
                for user_tuple in self._document_users[document_id]:
                    if user_tuple[1] == session_id:
                        to_remove = user_tuple
                        break
                
                if to_remove:
                    self._document_users[document_id].discard(to_remove)
                    
                    # Clean up empty document sets
                    if not self._document_users[document_id]:
                        del self._document_users[document_id]
            
            # Update session documents tracking
            if session_id in self._session_documents:
                self._session_documents[session_id].discard(document_id)
                if not self._session_documents[session_id]:
                    del self._session_documents[session_id]
            
            return user_info
    
    def disconnect_session(self, session_id: str) -> list:
        """
        Handle a session disconnection - remove from all documents.
        
        Args:
            session_id: The socket session ID
            
        Returns:
            List of (document_id, user_info) tuples for documents left
        """
        with self._data_lock:
            left_documents = []
            user_info = self._session_info.get(session_id)
            
            # Get all documents this session was in
            documents = self._session_documents.get(session_id, set()).copy()
            
            for document_id in documents:
                if document_id in self._document_users:
                    # Find and remove the user tuple
                    to_remove = None
                    for user_tuple in self._document_users[document_id]:
                        if user_tuple[1] == session_id:
                            to_remove = user_tuple
                            break
                    
                    if to_remove:
                        self._document_users[document_id].discard(to_remove)
                        left_documents.append((document_id, user_info))
                        
                        # Clean up empty document sets
                        if not self._document_users[document_id]:
                            del self._document_users[document_id]
            
            # Clean up session data
            if session_id in self._session_documents:
                del self._session_documents[session_id]
            if session_id in self._session_info:
                del self._session_info[session_id]
            
            return left_documents
    
    def get_document_users(self, document_id: str) -> list:
        """
        Get all users currently in a document.
        
        Args:
            document_id: The document ID
            
        Returns:
            List of user info dicts
        """
        with self._data_lock:
            return self._get_document_users(document_id)
    
    def _get_document_users(self, document_id: str, exclude_session: str = None) -> list:
        """
        Internal method to get document users (must be called with lock held).
        
        Args:
            document_id: The document ID
            exclude_session: Optional session ID to exclude from results
            
        Returns:
            List of user info dicts
        """
        users = []
        if document_id in self._document_users:
            for user_id, session_id in self._document_users[document_id]:
                if exclude_session and session_id == exclude_session:
                    continue
                info = self._session_info.get(session_id, {})
                users.append({
                    'user_id': user_id,
                    'session_id': session_id,
                    'user_name': info.get('user_name'),
                    'user_email': info.get('user_email'),
                    'joined_at': info.get('joined_at')
                })
        return users
    
    def get_user_documents(self, session_id: str) -> list:
        """
        Get all documents a session is currently in.
        
        Args:
            session_id: The socket session ID
            
        Returns:
            List of document IDs
        """
        with self._data_lock:
            return list(self._session_documents.get(session_id, set()))
    
    def is_user_in_document(self, document_id: str, session_id: str) -> bool:
        """
        Check if a session is in a document.
        
        Args:
            document_id: The document ID
            session_id: The socket session ID
            
        Returns:
            True if user is in document, False otherwise
        """
        with self._data_lock:
            if document_id not in self._document_users:
                return False
            return any(s == session_id for _, s in self._document_users[document_id])
    
    def get_document_count(self, document_id: str) -> int:
        """
        Get the number of users in a document.
        
        Args:
            document_id: The document ID
            
        Returns:
            Number of users in the document
        """
        with self._data_lock:
            if document_id not in self._document_users:
                return 0
            return len(self._document_users[document_id])


# Global presence instance
presence = DocumentPresence()
