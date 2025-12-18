"""Flask application factory."""
import os
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from backend.config import config
from backend.extensions import db, migrate, cors, socketio


def create_app(config_name=None):
    """Create and configure the Flask application."""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Import models before initializing extensions
    register_models()
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Initialize Socket.IO with CORS support
    socketio.init_app(app, cors_allowed_origins=[
        "http://localhost:5173",
        "http://localhost:3000"
    ], async_mode='threading')
    
    # Register WebSocket events
    from backend.websocket import register_socket_events
    register_socket_events(socketio)
    
    # Register blueprints
    register_blueprints(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Create upload folder
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    return app


def register_blueprints(app):
    """Register Flask blueprints."""
    from backend.api.storage import storage_bp
    from backend.api.documents import documents_bp
    from backend.api.search import search_bp
    from backend.api.ai import ai_bp
    from backend.api.auth import auth_bp
    from backend.api.folders import folders_bp
    from backend.api.tags import tags_bp
    from backend.api.users import users_bp
    from backend.api.share import share_bp
    from backend.api.comments import comments_bp
    from backend.api.activity import activity_bp
    from backend.api.notifications import notifications_bp
    from backend.api.analytics import analytics_bp
    from backend.api.annotations import annotations_bp
    from backend.api.bookmarks import bookmarks_bp
    from backend.api.api_keys import api_keys_bp
    from backend.api.docs import docs_bp
    from backend.api.webhooks import webhooks_bp
    from backend.api.cloud_import import cloud_import_bp
    
    app.register_blueprint(storage_bp, url_prefix='/api/storage')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(search_bp, url_prefix='/api/search')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(folders_bp, url_prefix='/api/folders')
    app.register_blueprint(tags_bp, url_prefix='/api/tags')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(share_bp, url_prefix='/api/share')
    app.register_blueprint(comments_bp, url_prefix='/api/comments')
    app.register_blueprint(activity_bp, url_prefix='/api/activity')
    app.register_blueprint(notifications_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(annotations_bp)
    app.register_blueprint(bookmarks_bp)
    app.register_blueprint(api_keys_bp, url_prefix='/api/api-keys')
    app.register_blueprint(docs_bp, url_prefix='/api/docs')
    app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')
    app.register_blueprint(cloud_import_bp, url_prefix='/api/cloud')


def register_models():
    """Import models to ensure they are registered with SQLAlchemy."""
    from backend.models import Storage, Document, Version, Folder, Tag, User, SearchHistory, SavedSearch, ChatSession, ChatMessage, ShareLink, Comment, ActivityLog, Notification, DocumentView, SearchAnalytics, StorageStats, Annotation, Bookmark, APIKey, APIKeyUsage, Webhook, WebhookDelivery  # noqa: F401


def register_error_handlers(app):
    """Register error handlers."""
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Handle HTTP exceptions."""
        response = {
            'error': error.name,
            'message': error.description
        }
        return jsonify(response), error.code
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle bad request errors."""
        return jsonify({
            'error': 'Bad Request',
            'message': str(error.description) if hasattr(error, 'description') else 'Invalid request'
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Handle unauthorized errors."""
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication required'
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        """Handle forbidden errors."""
        return jsonify({
            'error': 'Forbidden',
            'message': 'Access denied'
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle not found errors."""
        return jsonify({
            'error': 'Not Found',
            'message': 'Resource not found'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle internal server errors."""
        db.session.rollback()
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred'
        }), 500


class APIError(Exception):
    """Custom API error class."""
    
    def __init__(self, message, status_code=400, payload=None):
        super().__init__()
        self.message = message
        self.status_code = status_code
        self.payload = payload
    
    def to_dict(self):
        """Convert error to dictionary."""
        rv = {'error': self.message}
        if self.payload:
            rv['details'] = self.payload
        return rv
