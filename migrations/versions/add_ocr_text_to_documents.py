"""Add ocr_text column to documents table

Revision ID: add_ocr_text_001
Revises: 06b8324acc14
Create Date: 2024-12-18

Requirements: 10.1, 10.2 - OCR text extraction and indexing
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_ocr_text_001'
down_revision = '06b8324acc14'
branch_labels = None
depends_on = None


def upgrade():
    """Add ocr_text column to documents table for storing OCR extracted text."""
    op.add_column('documents', sa.Column('ocr_text', sa.Text(), nullable=True))


def downgrade():
    """Remove ocr_text column from documents table."""
    op.drop_column('documents', 'ocr_text')
