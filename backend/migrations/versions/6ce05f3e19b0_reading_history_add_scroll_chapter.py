"""reading_history_add_scroll_chapter

Revision ID: 6ce05f3e19b0
Revises: 846592377ea1
Create Date: 2026-09-20 08:54:30.226937

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '6ce05f3e19b0'
down_revision: Union[str, Sequence[str], None] = '846592377ea1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('reading_history',
        sa.Column('last_chapter_id', sa.Integer(), nullable=True))
    op.add_column('reading_history',
        sa.Column('last_chapter_num', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('reading_history',
        sa.Column('scroll_pct', sa.Float(), nullable=False, server_default='0.0'))
    op.create_unique_constraint(
        'uq_reading_history_user_novel', 'reading_history', ['user_id', 'novel_id'])
    op.create_foreign_key(
        'fk_reading_history_last_chapter_id',
        'reading_history', 'chapters', ['last_chapter_id'], ['id'], ondelete='SET NULL')
    op.drop_column('reading_history', 'last_chapter')


def downgrade() -> None:
    op.add_column('reading_history',
        sa.Column('last_chapter', sa.INTEGER(), autoincrement=False,
                  nullable=False, server_default='1'))
    op.drop_constraint('fk_reading_history_last_chapter_id', 'reading_history', type_='foreignkey')
    op.drop_constraint('uq_reading_history_user_novel', 'reading_history', type_='unique')
    op.drop_column('reading_history', 'scroll_pct')
    op.drop_column('reading_history', 'last_chapter_num')
    op.drop_column('reading_history', 'last_chapter_id')
