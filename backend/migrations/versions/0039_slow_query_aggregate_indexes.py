"""Cover hot aggregate filters: slots 7-day min price, bookings revenue.

Revision ID: 0039
Revises: 0038
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0039"
down_revision: str | Sequence[str] | None = "0038"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Nightly 7-day min_price aggregation filters on vendor + start_time range
    # inside the open/unreserved slice (partial index mirrors the partial one
    # from 0035, extended with start_time).
    op.create_index(
        "ix_time_slots_open_vendor_start_price",
        "time_slots",
        ["vendor_id", "start_time", "base_price"],
        postgresql_where=sa.text("is_reserved = false AND status = 'open'"),
    )
    # sum(price_paid)/count filters on created_at + status for the admin dashboard.
    op.create_index(
        "ix_bookings_status_created_at",
        "bookings",
        ["status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_bookings_status_created_at", table_name="bookings")
    op.drop_index("ix_time_slots_open_vendor_start_price", table_name="time_slots")
