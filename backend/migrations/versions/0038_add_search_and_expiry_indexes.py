"""Add trigram search and expiry/slot-range indexes.

Revision ID: 0038
Revises: 0037
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0038"
down_revision: str | Sequence[str] | None = "0037"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # pg_trgm for `%..%` ilike searches (btree can't serve leading-wildcard LIKE)
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_vendors_name_trgm ON vendors USING gin (name gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_users_full_name_trgm "
        "ON users USING gin (full_name gin_trgm_ops)"
    )
    # Expiry sweeper: list_expired_pending filters status + expires_at
    op.create_index(
        "ix_bookings_pending_expires_at",
        "bookings",
        ["expires_at"],
        postgresql_where=sa.text("status = 'pending_payment'"),
    )
    # Slot range filters on end_time (vendor + end, mirrors vendor+start)
    op.create_index(
        "ix_time_slots_vendor_id_end_time",
        "time_slots",
        ["vendor_id", "end_time"],
    )


def downgrade() -> None:
    op.drop_index("ix_time_slots_vendor_id_end_time", table_name="time_slots")
    op.drop_index("ix_bookings_pending_expires_at", table_name="bookings")
    op.execute("DROP INDEX IF EXISTS ix_users_full_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_vendors_name_trgm")
