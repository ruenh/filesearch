"""Add webhooks and webhook_deliveries tables

Revision ID: add_webhooks_001
Revises: add_ocr_text_001
Create Date: 2024-12-18

Requirements: 45.1, 45.2, 45.3 - Webhook integration
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_webhooks_001'
down_revision = 'add_ocr_text_001'
branch_labels = None
depends_on = None


def upgrade():
    """Create webhooks and webhook_deliveries tables."""
    # Create webhooks table
    op.create_table(
        'webhooks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('url', sa.String(2048), nullable=False),
        sa.Column('secret', sa.String(64), nullable=True),
        sa.Column('events', sa.JSON(), nullable=False, default=list),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('headers', sa.JSON(), default=dict),
        sa.Column('last_triggered_at', sa.DateTime(), nullable=True),
        sa.Column('last_status_code', sa.Integer(), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('success_count', sa.Integer(), default=0, nullable=False),
        sa.Column('failure_count', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    
    # Create webhook_deliveries table
    op.create_table(
        'webhook_deliveries',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('webhook_id', sa.String(36), sa.ForeignKey('webhooks.id'), nullable=False, index=True),
        sa.Column('event_type', sa.String(100), nullable=False, index=True),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('response_body', sa.Text(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('success', sa.Boolean(), default=False, nullable=False),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True),
    )
    
    # Create composite index for delivery cleanup queries
    op.create_index(
        'idx_delivery_webhook_created',
        'webhook_deliveries',
        ['webhook_id', 'created_at']
    )


def downgrade():
    """Drop webhooks and webhook_deliveries tables."""
    op.drop_index('idx_delivery_webhook_created', table_name='webhook_deliveries')
    op.drop_table('webhook_deliveries')
    op.drop_table('webhooks')
