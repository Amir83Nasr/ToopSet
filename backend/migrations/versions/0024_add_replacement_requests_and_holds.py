"""Add replacement requests and payment holds

Revision ID: 0024
Revises: 0023
Create Date: 2026-07-17
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0024"
down_revision: str | None = "0023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    request_status = postgresql.ENUM(
        "open",
        "held",
        "completed",
        "expired",
        "revoked",
        name="replacementrequeststatus",
        create_type=False,
    )
    hold_status = postgresql.ENUM(
        "active",
        "processing",
        "paid",
        "expired",
        "failed",
        "cancelled",
        name="bookingholdstatus",
        create_type=False,
    )
    request_status.create(op.get_bind(), checkfirst=True)
    hold_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "replacement_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("original_booking_id", sa.Integer(), nullable=False),
        sa.Column("replacement_booking_id", sa.Integer(), nullable=True),
        sa.Column("slot_id", sa.Integer(), nullable=False),
        sa.Column("status", request_status, server_default="open", nullable=False),
        sa.Column("penalty_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("refund_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "penalty_amount >= 0", name="ck_replacement_requests_penalty_nonnegative"
        ),
        sa.CheckConstraint("refund_amount >= 0", name="ck_replacement_requests_refund_nonnegative"),
        sa.ForeignKeyConstraint(["original_booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["replacement_booking_id"], ["bookings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["slot_id"], ["time_slots.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("original_booking_id"),
        sa.UniqueConstraint("replacement_booking_id"),
    )
    op.create_index(
        "ix_replacement_requests_original_booking_id",
        "replacement_requests",
        ["original_booking_id"],
    )
    op.create_index("ix_replacement_requests_slot_id", "replacement_requests", ["slot_id"])
    op.create_index("ix_replacement_requests_status", "replacement_requests", ["status"])
    op.create_index("ix_replacement_requests_deadline", "replacement_requests", ["deadline"])
    op.create_index(
        "ix_replacement_requests_slot_status",
        "replacement_requests",
        ["slot_id", "status"],
    )

    op.create_table(
        "booking_holds",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("replacement_request_id", sa.Integer(), nullable=False),
        sa.Column("replacement_booking_id", sa.Integer(), nullable=True),
        sa.Column("slot_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("status", hold_status, server_default="active", nullable=False),
        sa.Column("price_paid", sa.Numeric(10, 2), nullable=False),
        sa.Column("slot_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("ball_price", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("with_ball", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("participants_count", sa.Integer(), server_default="1", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processing_token", sa.String(64), nullable=True),
        sa.Column("processing_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("gateway_transaction_id", sa.String(256), nullable=True),
        sa.Column("gateway_name", sa.String(64), nullable=True),
        sa.Column("card_number", sa.String(32), nullable=True),
        sa.Column("ref_id", sa.String(64), nullable=True),
        sa.Column("gateway_fee", sa.Numeric(10, 2), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_code", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("price_paid > 0", name="ck_booking_holds_price_positive"),
        sa.CheckConstraint("participants_count > 0", name="ck_booking_holds_participants_positive"),
        sa.ForeignKeyConstraint(
            ["replacement_request_id"], ["replacement_requests.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["replacement_booking_id"], ["bookings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["slot_id"], ["time_slots.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("replacement_booking_id"),
        sa.UniqueConstraint("gateway_transaction_id"),
    )
    op.create_index(
        "ix_booking_holds_replacement_request_id",
        "booking_holds",
        ["replacement_request_id"],
    )
    op.create_index("ix_booking_holds_slot_id", "booking_holds", ["slot_id"])
    op.create_index("ix_booking_holds_user_id", "booking_holds", ["user_id"])
    op.create_index("ix_booking_holds_status", "booking_holds", ["status"])
    op.create_index("ix_booking_holds_expires_at", "booking_holds", ["expires_at"])
    op.create_index(
        "ix_booking_holds_request_status",
        "booking_holds",
        ["replacement_request_id", "status"],
    )
    op.create_index(
        "uq_booking_holds_one_live_per_slot",
        "booking_holds",
        ["slot_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('active', 'processing')"),
    )

    # Preserve pending-cancellation rows that existed before this migration.
    op.execute(
        """
        INSERT INTO replacement_requests (
            original_booking_id, slot_id, status, penalty_amount,
            refund_amount, deadline
        )
        SELECT b.id, b.slot_id, 'open',
               ROUND(b.price_paid * 0.10, 2),
               b.price_paid - ROUND(b.price_paid * 0.10, 2),
               ts.start_time
        FROM bookings b
        JOIN time_slots ts ON ts.id = b.slot_id
        WHERE b.status = 'pending_cancellation'
        ON CONFLICT (original_booking_id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_table("booking_holds")
    op.drop_table("replacement_requests")
    postgresql.ENUM(name="bookingholdstatus").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="replacementrequeststatus").drop(op.get_bind(), checkfirst=True)
