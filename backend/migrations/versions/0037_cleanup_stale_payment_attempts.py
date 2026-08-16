"""Clean stale payment attempts and index reconciliation work.

Revision ID: 0037
Revises: 0036
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0037"
down_revision: str | Sequence[str] | None = "0036"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE payments p
        SET status = 'expired',
            processing_token = NULL,
            failure_code = 'booking_not_payable'
        FROM bookings b
        WHERE b.id = p.booking_id
          AND p.status = 'pending'
          AND b.status <> 'pending_payment'
        """
    )
    op.create_index(
        "ix_payments_zibal_pending_created_at",
        "payments",
        ["created_at"],
        postgresql_where=sa.text(
            "status = 'pending' AND gateway_name = 'zibal' AND gateway_transaction_id IS NOT NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index("ix_payments_zibal_pending_created_at", table_name="payments")
