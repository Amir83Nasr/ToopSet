"""Harden vendor settlements and snapshot payout accounting.

Revision ID: 0033
Revises: 0032
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0033"
down_revision: str | Sequence[str] | None = "0032"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE settlementstatus ADD VALUE IF NOT EXISTS 'excluded_manual_booking'")
    # PostgreSQL requires a commit before a newly added enum value can be used.
    op.execute("COMMIT")
    op.drop_constraint("uq_settlement_items_booking_id", "settlement_items", type_="unique")
    op.add_column(
        "settlements",
        sa.Column("gross_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "settlements",
        sa.Column("commission_percent", sa.Numeric(5, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "settlements",
        sa.Column("commission_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "settlements",
        sa.Column("gateway_fee", sa.Numeric(10, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "settlements", sa.Column("destination_card_encrypted", sa.String(512), nullable=True)
    )
    op.add_column("settlements", sa.Column("destination_card_masked", sa.String(32), nullable=True))
    op.add_column(
        "settlements", sa.Column("destination_card_holder_name", sa.String(128), nullable=True)
    )
    op.execute("UPDATE settlements SET gross_amount = requested_amount")
    op.execute(
        "UPDATE bookings SET settlement_status = 'excluded_manual_booking' WHERE source = 'manager_manual'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE bookings SET settlement_status = 'excluded_due_to_cancellation' WHERE settlement_status = 'excluded_manual_booking'"
    )
    op.drop_column("settlements", "destination_card_holder_name")
    op.drop_column("settlements", "destination_card_masked")
    op.drop_column("settlements", "destination_card_encrypted")
    op.drop_column("settlements", "gateway_fee")
    op.drop_column("settlements", "commission_amount")
    op.drop_column("settlements", "commission_percent")
    op.drop_column("settlements", "gross_amount")
    op.create_unique_constraint(
        "uq_settlement_items_booking_id", "settlement_items", ["booking_id"]
    )
