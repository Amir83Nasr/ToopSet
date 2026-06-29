"""Normalize ALL datetime columns to timezone-aware (TIMESTAMPTZ)

Converts every naive TIMESTAMP column in the database to TIMESTAMPTZ,
ensuring consistent datetime handling across all tables.

Existing data is converted assuming it was stored as UTC (which it was).

Revision ID: 0009
Revises: 44f33e171792
Create Date: 2026-06-29

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "44f33e171792"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────────────────────────────
    op.alter_column(
        "users",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )

    # ── courts ─────────────────────────────────────────────────────────────
    op.alter_column(
        "courts",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )

    # ── court_images ───────────────────────────────────────────────────────
    op.alter_column(
        "court_images",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )

    # ── bookings ───────────────────────────────────────────────────────────
    op.alter_column(
        "bookings",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )
    op.alter_column(
        "bookings",
        "updated_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="updated_at AT TIME ZONE 'UTC'",
    )

    # ── payments ───────────────────────────────────────────────────────────
    op.alter_column(
        "payments",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )

    # ── reviews ────────────────────────────────────────────────────────────
    op.alter_column(
        "reviews",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )

    # ── penalties ──────────────────────────────────────────────────────────
    op.alter_column(
        "penalties",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )

    # ── logs ───────────────────────────────────────────────────────────────
    op.alter_column(
        "logs",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )

    # ── contact_messages ───────────────────────────────────────────────────
    op.alter_column(
        "contact_messages",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )

    # ── favorites ──────────────────────────────────────────────────────────
    op.alter_column(
        "favorites",
        "created_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="created_at AT TIME ZONE 'UTC'",
    )


def downgrade() -> None:
    # Reverse: convert back to naive TIMESTAMP (strip timezone)
    # The data remains correct UTC values; query code must handle naivety.
    op.alter_column("users", "created_at", type_=sa.DateTime())
    op.alter_column("courts", "created_at", type_=sa.DateTime())
    op.alter_column("court_images", "created_at", type_=sa.DateTime())
    op.alter_column("bookings", "created_at", type_=sa.DateTime())
    op.alter_column("bookings", "updated_at", type_=sa.DateTime())
    op.alter_column("payments", "created_at", type_=sa.DateTime())
    op.alter_column("reviews", "created_at", type_=sa.DateTime())
    op.alter_column("penalties", "created_at", type_=sa.DateTime())
    op.alter_column("logs", "created_at", type_=sa.DateTime())
    op.alter_column("contact_messages", "created_at", type_=sa.DateTime())
    op.alter_column("favorites", "created_at", type_=sa.DateTime())
