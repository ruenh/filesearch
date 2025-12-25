"""Add custom_prompts table and ensure api_keys tables exist.

Revision ID: add_prompts_fix
Revises: 
Create Date: 2025-12-25
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'add_prompts_fix'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create custom_prompts table
    op.create_table('custom_prompts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('prompt_type', sa.String(50), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('system_prompt', sa.Text, nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('is_default', sa.Boolean, default=False, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )
    
    # Create api_keys table if not exists
    op.create_table('api_keys',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('key_hash', sa.String(64), nullable=False, unique=True, index=True),
        sa.Column('key_prefix', sa.String(8), nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('last_used_at', sa.DateTime, nullable=True),
        sa.Column('request_count', sa.Integer, default=0, nullable=False),
        sa.Column('rate_limit', sa.Integer, default=1000, nullable=False),
        sa.Column('expires_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )
    
    # Create api_key_usage table if not exists
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
    op.drop_table('api_keys')
    op.drop_table('custom_prompts')
