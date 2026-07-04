"""Finance, refund, manager booking, and settlement models

Revision ID: 0017
Revises: 0016
Create Date: 2026-07-02
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0017"
down_revision: str | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE slotstatus ADD VALUE IF NOT EXISTS 'reserving'")
    op.execute("ALTER TYPE slotstatus ADD VALUE IF NOT EXISTS 'blocked'")
    op.execute("ALTER TYPE slotstatus ADD VALUE IF NOT EXISTS 'disabled'")
    op.execute("ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS 'expired'")
    op.execute("ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'expired'")

    booking_source = postgresql.ENUM(
        "online",
        "manager_manual",
        "manager_recurring",
        name="bookingsource",
        create_type=False,
    )
    settlement_status = postgresql.ENUM(
        "not_settled",
        "settlement_requested",
        "included_in_settlement",
        "settled",
        "excluded_due_to_refund",
        "excluded_due_to_cancellation",
        name="settlementstatus",
        create_type=False,
    )
    refund_status = postgresql.ENUM(
        "pending", "approved", "rejected", "paid", name="refundstatus", create_type=False
    )
    refund_type = postgresql.ENUM(
        "user_cancellation",
        "manager_cancellation",
        "replaced_after_pending_cancellation",
        name="refundtype",
        create_type=False,
    )
    settlement_request_status = postgresql.ENUM(
        "pending", "approved", "rejected", "paid", name="settlementrequeststatus", create_type=False
    )
    booking_source.create(op.get_bind(), checkfirst=True)
    settlement_status.create(op.get_bind(), checkfirst=True)
    refund_status.create(op.get_bind(), checkfirst=True)
    refund_type.create(op.get_bind(), checkfirst=True)
    settlement_request_status.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "bookings",
        sa.Column("source", booking_source, server_default="online", nullable=False),
    )
    op.add_column(
        "bookings",
        sa.Column(
            "settlement_status",
            settlement_status,
            server_default="not_settled",
            nullable=False,
        ),
    )
    op.add_column("bookings", sa.Column("created_by_manager_id", sa.Integer(), nullable=True))
    op.add_column("bookings", sa.Column("customer_full_name", sa.String(length=128), nullable=True))
    op.add_column("bookings", sa.Column("customer_phone", sa.String(length=16), nullable=True))
    op.create_index("ix_bookings_source", "bookings", ["source"])
    op.create_index("ix_bookings_settlement_status", "bookings", ["settlement_status"])
    op.create_index("ix_bookings_created_by_manager_id", "bookings", ["created_by_manager_id"])
    op.create_index("ix_bookings_customer_phone", "bookings", ["customer_phone"])
    op.create_foreign_key(
        "fk_bookings_created_by_manager_id",
        "bookings",
        "users",
        ["created_by_manager_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index(
        "uq_bookings_one_active_per_slot",
        "bookings",
        ["slot_id"],
        unique=True,
        postgresql_where=sa.text(
            "status IN ('pending_payment', 'confirmed', 'pending_cancellation')"
        ),
    )

    op.create_table(
        "refunds",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("booking_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("vendor_id", sa.Integer(), nullable=False),
        sa.Column("slot_id", sa.Integer(), nullable=False),
        sa.Column("slot_start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("slot_end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("original_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("slot_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("ball_price", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("total_paid", sa.Numeric(10, 2), nullable=False),
        sa.Column("penalty_amount", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("refund_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("type", refund_type, nullable=False),
        sa.Column("status", refund_status, server_default="pending", nullable=False),
        sa.Column("penalty_charged_to_user", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("site_bears_penalty", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("payment_tracking_code", sa.String(length=128), nullable=True),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["slot_id"], ["time_slots.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("booking_id", "type", name="uq_refunds_booking_type"),
    )
    op.create_index("ix_refunds_booking_id", "refunds", ["booking_id"])
    op.create_index("ix_refunds_user_id", "refunds", ["user_id"])
    op.create_index("ix_refunds_vendor_id", "refunds", ["vendor_id"])
    op.create_index("ix_refunds_slot_id", "refunds", ["slot_id"])
    op.create_index("ix_refunds_type", "refunds", ["type"])
    op.create_index("ix_refunds_status", "refunds", ["status"])

    op.create_table(
        "settlements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("manager_id", sa.Integer(), nullable=False),
        sa.Column("vendor_id", sa.Integer(), nullable=False),
        sa.Column("requested_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("approved_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("bookings_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("period_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", settlement_request_status, server_default="pending", nullable=False),
        sa.Column("manager_note", sa.Text(), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("payment_tracking_code", sa.String(length=128), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["manager_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_settlements_manager_id", "settlements", ["manager_id"])
    op.create_index("ix_settlements_vendor_id", "settlements", ["vendor_id"])
    op.create_index("ix_settlements_status", "settlements", ["status"])

    op.create_table(
        "settlement_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("settlement_id", sa.Integer(), nullable=False),
        sa.Column("booking_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.ForeignKeyConstraint(["settlement_id"], ["settlements.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("booking_id", name="uq_settlement_items_booking_id"),
    )
    op.create_index("ix_settlement_items_settlement_id", "settlement_items", ["settlement_id"])
    op.create_index("ix_settlement_items_booking_id", "settlement_items", ["booking_id"])

    op.create_table(
        "slot_cancellations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slot_id", sa.Integer(), nullable=False),
        sa.Column("booking_id", sa.Integer(), nullable=True),
        sa.Column("vendor_id", sa.Integer(), nullable=False),
        sa.Column("manager_id", sa.Integer(), nullable=False),
        sa.Column("affected_user_id", sa.Integer(), nullable=True),
        sa.Column("affected_full_name", sa.String(length=128), nullable=True),
        sa.Column("affected_phone", sa.String(length=16), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("release_slot", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("online_paid_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("site_cost_amount", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("sms_status", sa.String(length=32), nullable=True),
        sa.Column("notification_status", sa.String(length=32), nullable=True),
        sa.Column("review_status", sa.String(length=32), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["slot_id"], ["time_slots.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["manager_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["affected_user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_slot_cancellations_slot_id", "slot_cancellations", ["slot_id"])
    op.create_index("ix_slot_cancellations_booking_id", "slot_cancellations", ["booking_id"])
    op.create_index("ix_slot_cancellations_vendor_id", "slot_cancellations", ["vendor_id"])
    op.create_index("ix_slot_cancellations_manager_id", "slot_cancellations", ["manager_id"])
    op.create_index(
        "ix_slot_cancellations_affected_user_id", "slot_cancellations", ["affected_user_id"]
    )

    op.create_table(
        "notification_deliveries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("notification_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("booking_id", sa.Integer(), nullable=True),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("phone_number", sa.String(length=16), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="pending", nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["notification_id"], ["notifications.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="SET NULL"),
    )
    op.create_index(
        "ix_notification_deliveries_notification_id", "notification_deliveries", ["notification_id"]
    )
    op.create_index("ix_notification_deliveries_user_id", "notification_deliveries", ["user_id"])
    op.create_index(
        "ix_notification_deliveries_booking_id", "notification_deliveries", ["booking_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_notification_deliveries_booking_id", table_name="notification_deliveries")
    op.drop_index("ix_notification_deliveries_user_id", table_name="notification_deliveries")
    op.drop_index(
        "ix_notification_deliveries_notification_id", table_name="notification_deliveries"
    )
    op.drop_table("notification_deliveries")

    op.drop_index("ix_slot_cancellations_affected_user_id", table_name="slot_cancellations")
    op.drop_index("ix_slot_cancellations_manager_id", table_name="slot_cancellations")
    op.drop_index("ix_slot_cancellations_vendor_id", table_name="slot_cancellations")
    op.drop_index("ix_slot_cancellations_booking_id", table_name="slot_cancellations")
    op.drop_index("ix_slot_cancellations_slot_id", table_name="slot_cancellations")
    op.drop_table("slot_cancellations")

    op.drop_index("ix_settlement_items_booking_id", table_name="settlement_items")
    op.drop_index("ix_settlement_items_settlement_id", table_name="settlement_items")
    op.drop_table("settlement_items")
    op.drop_index("ix_settlements_status", table_name="settlements")
    op.drop_index("ix_settlements_vendor_id", table_name="settlements")
    op.drop_index("ix_settlements_manager_id", table_name="settlements")
    op.drop_table("settlements")

    op.drop_index("ix_refunds_status", table_name="refunds")
    op.drop_index("ix_refunds_type", table_name="refunds")
    op.drop_index("ix_refunds_slot_id", table_name="refunds")
    op.drop_index("ix_refunds_vendor_id", table_name="refunds")
    op.drop_index("ix_refunds_user_id", table_name="refunds")
    op.drop_index("ix_refunds_booking_id", table_name="refunds")
    op.drop_table("refunds")

    op.drop_index("uq_bookings_one_active_per_slot", table_name="bookings")
    op.drop_constraint("fk_bookings_created_by_manager_id", "bookings", type_="foreignkey")
    op.drop_index("ix_bookings_customer_phone", table_name="bookings")
    op.drop_index("ix_bookings_created_by_manager_id", table_name="bookings")
    op.drop_index("ix_bookings_settlement_status", table_name="bookings")
    op.drop_index("ix_bookings_source", table_name="bookings")
    op.drop_column("bookings", "customer_phone")
    op.drop_column("bookings", "customer_full_name")
    op.drop_column("bookings", "created_by_manager_id")
    op.drop_column("bookings", "settlement_status")
    op.drop_column("bookings", "source")

    op.execute("DROP TYPE IF EXISTS settlementrequeststatus")
    op.execute("DROP TYPE IF EXISTS refundtype")
    op.execute("DROP TYPE IF EXISTS refundstatus")
    op.execute("DROP TYPE IF EXISTS settlementstatus")
    op.execute("DROP TYPE IF EXISTS bookingsource")
