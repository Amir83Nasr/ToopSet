"""Add missing FK indexes for query performance

Adds indexes on foreign key columns and useful composite indexes
for common filter patterns across the booking, penalty, wallet,
and time_slot tables.

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-29

"""

from typing import Sequence, Union

from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── bookings ──────────────────────────────────────────────────────────
    # bookings.user_id is frequently filtered (my bookings, user history)
    op.create_index(op.f("ix_bookings_user_id"), "bookings", ["user_id"], unique=False)
    # Composite index for common filtered query: user's bookings by status
    op.create_index(
        op.f("ix_bookings_user_id_status"), "bookings", ["user_id", "status"], unique=False
    )

    # ── penalties ──────────────────────────────────────────────────────────
    # penalties.user_id is used for user penalty lookups
    op.create_index(op.f("ix_penalties_user_id"), "penalties", ["user_id"], unique=False)
    # penalties.booking_id is used when checking penalties for a booking
    op.create_index(op.f("ix_penalties_booking_id"), "penalties", ["booking_id"], unique=False)

    # ── wallet_transactions ────────────────────────────────────────────────
    # wallet_transactions.wallet_id is the primary FK lookup
    op.create_index(
        op.f("ix_wallet_transactions_wallet_id"),
        "wallet_transactions",
        ["wallet_id"],
        unique=False,
    )

    # ── time_slots: composite (court_id, start_time) for date-range lookups ─
    # court_id already has a single-column index; the composite speeds up
    # the common query pattern: "slots for court X on date Y sorted by time"
    op.create_index(
        op.f("ix_time_slots_court_id_start_time"),
        "time_slots",
        ["court_id", "start_time"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_bookings_user_id"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_user_id_status"), table_name="bookings")
    op.drop_index(op.f("ix_penalties_user_id"), table_name="penalties")
    op.drop_index(op.f("ix_penalties_booking_id"), table_name="penalties")
    op.drop_index(op.f("ix_wallet_transactions_wallet_id"), table_name="wallet_transactions")
    op.drop_index(op.f("ix_time_slots_court_id_start_time"), table_name="time_slots")
