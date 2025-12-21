"""Add missing tables for notifications, analytics, bookmarks, annotations, api_keys, comments, shares

Revision ID: add_missing_001
Revises: add_webhooks_001
Create Date: 2025-12-21
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_missing_001'
down_revision = 'add_webhooks_001'
branch_labels = None
depends_on = None


def upgrade():
    # Activity logs table
    op.create_table('activity_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('action', sa.String(100), nullable=False, index=True),
        sa.Column('resource_type', sa.String(50), nullable=False, index=True),
        sa.Column('resource_id', sa.String(36), nullable=True, index=True),
        sa.Column('resource_name', sa.String(255), nullable=True),
        sa.Column('details', sa.JSON, default=dict),
        sa.Column('timestamp', sa.DateTime, nullable=False, index=True),
    )
    
    # Notifications table
    op.create_table('notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('type', sa.String(50), nullable=False, index=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text, nullable=True),
        sa.Column('resource_type', sa.String(50), nullable=True),
        sa.Column('resource_id', sa.String(36), nullable=True),
        sa.Column('resource_name', sa.String(255), nullable=True),
        sa.Column('is_read', sa.Boolean, default=False, nullable=False, index=True),
        sa.Column('created_at', sa.DateTime, nullable=False, index=True),
        sa.Column('read_at', sa.DateTime, nullable=True),
    )
    
    # Document views table
    op.create_table('document_views',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id'), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('storage_id', sa.String(36), sa.ForeignKey('storages.id'), nullable=False, index=True),
        sa.Column('session_id', sa.String(100), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('duration_seconds', sa.Integer, nullable=True),
        sa.Column('viewed_at', sa.DateTime, nullable=False, index=True),
    )
    
    # Search analytics table
    op.create_table('search_analytics',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('query', sa.String(500), nullable=False, index=True),
        sa.Column('query_normalized', sa.String(500), nullable=True, index=True),
        sa.Column('storage_id', sa.String(36), sa.ForeignKey('storages.id'), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('result_count', sa.Integer, default=0),
        sa.Column('clicked_result_id', sa.String(36), nullable=True),
        sa.Column('filters_used', sa.JSON, default=dict),
        sa.Column('response_time_ms', sa.Integer, nullable=True),
        sa.Column('searched_at', sa.DateTime, nullable=False, index=True),
    )
    
    # Storage stats table
    op.create_table('storage_stats',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('storage_id', sa.String(36), sa.ForeignKey('storages.id'), nullable=False, unique=True, index=True),
        sa.Column('total_documents', sa.Integer, default=0),
        sa.Column('total_size_bytes', sa.BigInteger, default=0),
        sa.Column('total_views', sa.Integer, default=0),
        sa.Column('total_searches', sa.Integer, default=0),
        sa.Column('file_type_counts', sa.JSON, default=dict),
        sa.Column('updated_at', sa.DateTime),
    )
    
    # Bookmarks table
    op.create_table('bookmarks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id'), nullable=False, index=True),
        sa.Column('page_number', sa.Integer, nullable=True),
        sa.Column('position', sa.JSON, nullable=True),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('note', sa.Text, nullable=True),
        sa.Column('color', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime),
    )
    
    # Annotations table
    op.create_table('annotations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id'), nullable=False, index=True),
        sa.Column('page_number', sa.Integer, nullable=True),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('content', sa.Text, nullable=True),
        sa.Column('position', sa.JSON, nullable=True),
        sa.Column('color', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime),
    )
    
    # API keys table
    op.create_table('api_keys',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('key_hash', sa.String(255), nullable=False, unique=True),
        sa.Column('key_prefix', sa.String(10), nullable=False),
        sa.Column('scopes', sa.JSON, default=list),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('last_used_at', sa.DateTime, nullable=True),
        sa.Column('expires_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    
    # Comments table
    op.create_table('comments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id'), nullable=False, index=True),
        sa.Column('parent_id', sa.String(36), nullable=True, index=True),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('page_number', sa.Integer, nullable=True),
        sa.Column('position', sa.JSON, nullable=True),
        sa.Column('is_resolved', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime),
    )
    
    # Shares table
    op.create_table('shares',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id'), nullable=False, index=True),
        sa.Column('shared_by_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('shared_with_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('share_token', sa.String(100), nullable=True, unique=True),
        sa.Column('permission', sa.String(20), default='view'),
        sa.Column('is_public', sa.Boolean, default=False),
        sa.Column('expires_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    
    # Chat sessions table
    op.create_table('chat_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('storage_id', sa.String(36), sa.ForeignKey('storages.id'), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime),
    )
    
    # Chat messages table
    op.create_table('chat_messages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('session_id', sa.String(36), sa.ForeignKey('chat_sessions.id'), nullable=False, index=True),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('sources', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    
    # Share links table
    op.create_table('share_links',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('documents.id'), nullable=False, index=True),
        sa.Column('token', sa.String(64), unique=True, nullable=False, index=True),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('expires_at', sa.DateTime, nullable=True),
        sa.Column('access_count', sa.Integer, default=0),
        sa.Column('last_accessed_at', sa.DateTime, nullable=True),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime),
    )
    
    # Search history table
    op.create_table('search_history',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('search_query', sa.String(500), nullable=False, index=True),
        sa.Column('storage_id', sa.String(36), sa.ForeignKey('storages.id'), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('result_count', sa.Integer, default=0),
        sa.Column('filters', sa.JSON, default=dict),
        sa.Column('created_at', sa.DateTime, nullable=False, index=True),
    )
    
    # Saved searches table
    op.create_table('saved_searches',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('search_query', sa.String(500), nullable=False),
        sa.Column('storage_id', sa.String(36), sa.ForeignKey('storages.id'), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('filters', sa.JSON, default=dict),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime),
    )
    
    # API key usage table
    op.create_table('api_key_usage',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('api_key_id', sa.String(36), sa.ForeignKey('api_keys.id'), nullable=False, index=True),
        sa.Column('endpoint', sa.String(255), nullable=False),
        sa.Column('method', sa.String(10), nullable=False),
        sa.Column('status_code', sa.Integer, nullable=True),
        sa.Column('response_time_ms', sa.Integer, nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('timestamp', sa.DateTime, nullable=False, index=True),
    )


def downgrade():
    op.drop_table('api_key_usage')
    op.drop_table('saved_searches')
    op.drop_table('search_history')
    op.drop_table('share_links')
    op.drop_table('chat_messages')
    op.drop_table('chat_sessions')
    op.drop_table('shares')
    op.drop_table('comments')
    op.drop_table('api_keys')
    op.drop_table('annotations')
    op.drop_table('bookmarks')
    op.drop_table('storage_stats')
    op.drop_table('search_analytics')
    op.drop_table('document_views')
    op.drop_table('notifications')
    op.drop_table('activity_logs')
