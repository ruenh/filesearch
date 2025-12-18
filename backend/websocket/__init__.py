"""WebSocket module for real-time collaboration."""
from backend.websocket.events import register_socket_events
from backend.websocket.presence import DocumentPresence

__all__ = ['register_socket_events', 'DocumentPresence']
