"""Optimize vendor card minimum-price lookups.

Revision ID: 0035
Revises: 0034
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0035"
down_revision: str | Sequence[str] | None = "0034"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_time_slots_open_vendor_price",
        "time_slots",
        ["vendor_id", "base_price"],
        postgresql_where=sa.text("is_reserved = false AND status = 'open'"),
    )


def downgrade() -> None:
    op.drop_index("ix_time_slots_open_vendor_price", table_name="time_slots")
