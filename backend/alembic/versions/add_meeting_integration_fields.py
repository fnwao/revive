"""add meeting integration fields

Revision ID: meeting_int_001
Revises: e466d1f78685
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

revision = 'meeting_int_001'
down_revision = 'e466d1f78685'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('fireflies_api_key', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('fathom_api_key', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('users', 'fathom_api_key')
    op.drop_column('users', 'fireflies_api_key')
