"""Add financial and manager-request idempotency constraints

Revision ID: 0025
Revises: 0024
Create Date: 2026-07-17
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0025"
down_revision: str | None = "0024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # These indexes intentionally fail the upgrade if legacy duplicate rows
    # exist. Silently deleting or rewriting financial/request history would be
    # unsafe; operators must reconcile such rows before retrying the migration.
    op.create_index(
        "uq_manager_requests_one_pending_per_user",
        "manager_requests",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )
    op.create_index(
        "uq_payments_one_success_per_booking",
        "payments",
        ["booking_id"],
        unique=True,
        postgresql_where=sa.text("status = 'success'"),
    )
    op.create_index(
        "uq_payments_gateway_transaction_id",
        "payments",
        ["gateway_transaction_id"],
        unique=True,
        postgresql_where=sa.text("gateway_transaction_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_payments_gateway_transaction_id", table_name="payments")
    op.drop_index("uq_payments_one_success_per_booking", table_name="payments")
    op.drop_index(
        "uq_manager_requests_one_pending_per_user",
        table_name="manager_requests",
    )
