"""Add persistent weekly schedule versions

Revision ID: 0022
Revises: 0021
Create Date: 2026-07-13
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0022"
down_revision: str | None = "0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "weekly_schedule_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "vendor_id",
            sa.Integer(),
            sa.ForeignKey("vendors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_until", sa.Date(), nullable=False),
        sa.Column("duration_months", sa.SmallInteger(), nullable=False),
        sa.Column(
            "created_by_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_weekly_schedule_versions_vendor_id",
        "weekly_schedule_versions",
        ["vendor_id"],
    )
    op.create_index(
        "ix_weekly_schedule_versions_vendor_id_id",
        "weekly_schedule_versions",
        ["vendor_id", "id"],
    )

    slot_gender = postgresql.ENUM("male", "female", name="slotgender", create_type=False)
    op.create_table(
        "weekly_schedule_version_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "version_id",
            sa.Integer(),
            sa.ForeignKey("weekly_schedule_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("day_of_week", sa.SmallInteger(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("base_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("gender", slot_gender, server_default="male", nullable=False),
        sa.CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_weekly_item_day"),
        sa.CheckConstraint("start_time < end_time", name="ck_weekly_item_time_order"),
        sa.UniqueConstraint(
            "version_id",
            "day_of_week",
            "start_time",
            "end_time",
            name="uq_weekly_item_version_day_time",
        ),
    )
    op.create_index(
        "ix_weekly_schedule_version_items_version_id",
        "weekly_schedule_version_items",
        ["version_id"],
    )


def downgrade() -> None:
    op.drop_table("weekly_schedule_version_items")
    op.drop_table("weekly_schedule_versions")
