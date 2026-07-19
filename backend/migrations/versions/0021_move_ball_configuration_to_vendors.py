"""Move ball configuration from time slots to vendors

Revision ID: 0021
Revises: 0020
Create Date: 2026-07-13
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0021"
down_revision: str | None = "0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "vendors",
        sa.Column("ball_available", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "vendors",
        sa.Column("ball_price", sa.Numeric(10, 2), server_default="0", nullable=False),
    )

    # Preserve existing configuration. If historical slots disagree, availability
    # is enabled when any slot offered a ball and the highest configured price is
    # retained so migration never silently undercharges future bookings.
    op.execute(
        """
        UPDATE vendors AS v
        SET ball_available = migrated.ball_available,
            ball_price = migrated.ball_price
        FROM (
            SELECT vendor_id,
                   BOOL_OR(ball_available) AS ball_available,
                   COALESCE(MAX(ball_price) FILTER (WHERE ball_available), 0) AS ball_price
            FROM time_slots
            GROUP BY vendor_id
        ) AS migrated
        WHERE migrated.vendor_id = v.id
        """
    )

    op.drop_column("time_slots", "ball_available")
    op.drop_column("time_slots", "ball_price")


def downgrade() -> None:
    op.add_column(
        "time_slots",
        sa.Column("ball_price", sa.Numeric(10, 2), server_default="0", nullable=False),
    )
    op.add_column(
        "time_slots",
        sa.Column("ball_available", sa.Boolean(), server_default="false", nullable=False),
    )
    op.execute(
        """
        UPDATE time_slots AS ts
        SET ball_available = v.ball_available,
            ball_price = v.ball_price
        FROM vendors AS v
        WHERE v.id = ts.vendor_id
        """
    )
    op.drop_column("vendors", "ball_price")
    op.drop_column("vendors", "ball_available")
