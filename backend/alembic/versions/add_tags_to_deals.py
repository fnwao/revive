"""add tags to deals

Revision ID: e7f9138g0c5g
Revises: d6e8027f9b4f
Create Date: 2025-01-20 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'e7f9138g0c5g'
down_revision = 'd6e8027f9b4f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add tags column to deals table
    op.add_column('deals', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    # Add index on status for faster filtering
    op.create_index(op.f('ix_deals_status'), 'deals', ['status'], unique=False)


def downgrade() -> None:
    # Remove index and column
    op.drop_index(op.f('ix_deals_status'), table_name='deals')
    op.drop_column('deals', 'tags')


