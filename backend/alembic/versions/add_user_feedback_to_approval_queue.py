"""add user_feedback to approval_queue

Revision ID: c5d7916f8a3e
Revises: b4c6805fbe2c
Create Date: 2025-01-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c5d7916f8a3e'
down_revision = 'a1b2c3d4e5f6'  # This should be the revision from add_user_settings_table.py
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add user_feedback column to approval_queue table
    op.add_column('approval_queue', sa.Column('user_feedback', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove user_feedback column from approval_queue table
    op.drop_column('approval_queue', 'user_feedback')

