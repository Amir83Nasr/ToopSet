"""create court_images table

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-30

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "court_images",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "court_id", sa.Integer(), sa.ForeignKey("courts.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("url", sa.String(512), nullable=False),
        sa.Column("order", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_court_images_court_id", "court_images", ["court_id"])


def downgrade() -> None:
    op.drop_index("ix_court_images_court_id", table_name="court_images")
    op.drop_table("court_images")
