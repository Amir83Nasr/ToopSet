"""Merge recurring manager bookings into manual source

Revision ID: 0020
Revises: 0019
Create Date: 2026-07-03
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0020"
down_revision: str | None = "0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("UPDATE bookings SET source = 'manager_manual' WHERE source = 'manager_recurring'")
    op.execute("ALTER TABLE bookings ALTER COLUMN source DROP DEFAULT")
    op.execute("ALTER TYPE bookingsource RENAME TO bookingsource_old")
    op.execute("CREATE TYPE bookingsource AS ENUM ('online', 'manager_manual')")
    op.execute(
        """
        ALTER TABLE bookings
        ALTER COLUMN source TYPE bookingsource
        USING source::text::bookingsource
        """
    )
    op.execute("ALTER TABLE bookings ALTER COLUMN source SET DEFAULT 'online'")
    op.execute("DROP TYPE bookingsource_old")


def downgrade() -> None:
    op.execute("ALTER TABLE bookings ALTER COLUMN source DROP DEFAULT")
    op.execute("ALTER TYPE bookingsource RENAME TO bookingsource_old")
    op.execute("CREATE TYPE bookingsource AS ENUM ('online', 'manager_manual', 'manager_recurring')")
    op.execute(
        """
        ALTER TABLE bookings
        ALTER COLUMN source TYPE bookingsource
        USING source::text::bookingsource
        """
    )
    op.execute("ALTER TABLE bookings ALTER COLUMN source SET DEFAULT 'online'")
    op.execute("DROP TYPE bookingsource_old")
