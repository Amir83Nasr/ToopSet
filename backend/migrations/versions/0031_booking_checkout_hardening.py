"""Harden user checkout and payment attempts.

Revision ID: 0031
Revises: 0030
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0031"
down_revision: str | Sequence[str] | None = "0030"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("phone_verified_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.execute("UPDATE users SET phone_verified_at = created_at WHERE phone_verified_at IS NULL")
    # Keep the newest unpaid checkout per user and safely release older holds.
    op.execute(
        """
        WITH ranked AS (
            SELECT id, slot_id,
                   row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS rn
            FROM bookings
            WHERE status = 'pending_payment'
        ), expired AS (
            UPDATE bookings b
            SET status = 'expired', settlement_status = 'excluded_due_to_cancellation'
            FROM ranked r
            WHERE b.id = r.id AND r.rn > 1
            RETURNING b.slot_id
        )
        UPDATE time_slots s
        SET is_reserved = false, status = 'open', version = version + 1
        WHERE s.id IN (SELECT slot_id FROM expired)
          AND NOT EXISTS (
              SELECT 1 FROM bookings b
              WHERE b.slot_id = s.id
                AND b.status IN ('pending_payment', 'confirmed', 'pending_cancellation')
          )
        """
    )
    op.create_index(
        "uq_bookings_one_pending_payment_per_user",
        "bookings",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending_payment'"),
    )
    op.add_column("payments", sa.Column("idempotency_key", sa.String(64), nullable=True))
    op.add_column("payments", sa.Column("processing_token", sa.String(64), nullable=True))
    op.add_column("payments", sa.Column("failure_code", sa.String(64), nullable=True))
    op.create_index(
        "uq_payments_idempotency_key",
        "payments",
        ["idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_payments_idempotency_key", table_name="payments")
    op.drop_column("payments", "failure_code")
    op.drop_column("payments", "processing_token")
    op.drop_column("payments", "idempotency_key")
    op.drop_index("uq_bookings_one_pending_payment_per_user", table_name="bookings")
    op.drop_column("users", "phone_verified_at")
