"""add ai_context to approval_queue

Revision ID: ai_context_001
Revises: meeting_int_001
Create Date: 2026-04-13

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ai_context_001'
down_revision = 'meeting_int_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add ai_context column to approval_queue table
    op.add_column('approval_queue', sa.Column('ai_context', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove ai_context column from approval_queue table
    op.drop_column('approval_queue', 'ai_context')
