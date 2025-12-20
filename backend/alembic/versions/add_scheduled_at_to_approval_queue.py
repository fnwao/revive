"""add scheduled_at to approval_queue

Revision ID: d6e8027f9b4f
Revises: c5d7916f8a3e
Create Date: 2025-01-20 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd6e8027f9b4f'
down_revision = 'c5d7916f8a3e'  # Depends on add_user_feedback_to_approval_queue
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add scheduled_at column to approval_queue table
    op.add_column('approval_queue', sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_approval_queue_scheduled_at'), 'approval_queue', ['scheduled_at'], unique=False)


def downgrade() -> None:
    # Remove scheduled_at column and index from approval_queue table
    op.drop_index(op.f('ix_approval_queue_scheduled_at'), table_name='approval_queue')
    op.drop_column('approval_queue', 'scheduled_at')

