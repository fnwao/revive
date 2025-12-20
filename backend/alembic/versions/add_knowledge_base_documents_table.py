"""add knowledge_base_documents table

Revision ID: f8g0249h1d6h
Revises: e7f9138g0c5g
Create Date: 2025-01-20 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'f8g0249h1d6h'
down_revision = 'e7f9138g0c5g'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create knowledge_base_documents table
    op.create_table('knowledge_base_documents',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('title', sa.String(length=500), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('document_type', sa.String(length=100), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=False, server_default='ready'),
    sa.Column('word_count', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_base_documents_user_id'), 'knowledge_base_documents', ['user_id'], unique=False)
    op.create_index(op.f('ix_knowledge_base_documents_created_at'), 'knowledge_base_documents', ['created_at'], unique=False)


def downgrade() -> None:
    # Remove knowledge_base_documents table
    op.drop_index(op.f('ix_knowledge_base_documents_created_at'), table_name='knowledge_base_documents')
    op.drop_index(op.f('ix_knowledge_base_documents_user_id'), table_name='knowledge_base_documents')
    op.drop_table('knowledge_base_documents')


