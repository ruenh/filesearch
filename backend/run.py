"""Run the Flask application."""
import sys
import os

# Add parent directory to path so 'backend' module can be found
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.extensions import socketio

app = create_app()

if __name__ == '__main__':
    # Use socketio.run() for WebSocket support
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
