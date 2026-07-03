"""Booking refund and slot hardening

Revision ID: 0015
Revises: 0014
Create Date: 2026-06-29
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS 'pending_cancellation'")
    op.execute("ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS 'transferred'")

    slot_status = postgresql.ENUM(
        "open",
        "pending_cancellation",
        "reserved",
        "closed",
        name="slotstatus",
        create_type=False,
    )
    slot_gender = postgresql.ENUM("male", "female", name="slotgender", create_type=False)
    bank_card_status = postgresql.ENUM(
        "pending_confirmation",
        "verified",
        "rejected",
        name="bankcardstatus",
        create_type=False,
    )
    slot_status.create(op.get_bind(), checkfirst=True)
    slot_gender.create(op.get_bind(), checkfirst=True)
    bank_card_status.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "time_slots",
        sa.Column("ball_price", sa.Numeric(10, 2), server_default="0", nullable=False),
    )
    op.add_column(
        "time_slots",
        sa.Column("ball_available", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "time_slots",
        sa.Column("gender", slot_gender, server_default="male", nullable=False),
    )
    op.add_column(
        "time_slots",
        sa.Column("status", slot_status, server_default="open", nullable=False),
    )
    op.execute("UPDATE time_slots SET status = 'reserved' WHERE is_reserved = true")
    op.create_index("ix_time_slots_status", "time_slots", ["status"])
    op.create_unique_constraint(
        "uq_time_slots_court_start_end",
        "time_slots",
        ["court_id", "start_time", "end_time"],
    )

    op.add_column("bookings", sa.Column("replaces_booking_id", sa.Integer(), nullable=True))
    op.add_column("bookings", sa.Column("slot_price", sa.Numeric(10, 2), nullable=True))
    op.add_column(
        "bookings", sa.Column("ball_price", sa.Numeric(10, 2), server_default="0", nullable=False)
    )
    op.add_column(
        "bookings", sa.Column("with_ball", sa.Boolean(), server_default="false", nullable=False)
    )
    op.create_index("ix_bookings_slot_id", "bookings", ["slot_id"])
    op.create_index("ix_bookings_replaces_booking_id", "bookings", ["replaces_booking_id"])
    op.create_foreign_key(
        "fk_bookings_replaces_booking_id",
        "bookings",
        "bookings",
        ["replaces_booking_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.execute("UPDATE bookings SET slot_price = price_paid WHERE slot_price IS NULL")
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_slot_id_key")

    op.execute("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_booking_id_key")
    op.create_index("ix_payments_booking_id", "payments", ["booking_id"])

    op.create_table(
        "bank_cards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("encrypted_card_number", sa.String(512), nullable=False),
        sa.Column("masked_card_number", sa.String(32), nullable=False),
        sa.Column("card_fingerprint", sa.String(64), nullable=False),
        sa.Column("holder_name", sa.String(128), nullable=True),
        sa.Column(
            "status",
            bank_card_status,
            server_default="pending_confirmation",
            nullable=False,
        ),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "card_fingerprint", name="uq_bank_cards_user_fingerprint"),
    )
    op.create_index("ix_bank_cards_user_id", "bank_cards", ["user_id"])
    op.create_index("ix_bank_cards_card_fingerprint", "bank_cards", ["card_fingerprint"])
    op.create_index("ix_bank_cards_status", "bank_cards", ["status"])


def downgrade() -> None:
    op.drop_index("ix_bank_cards_status", table_name="bank_cards")
    op.drop_index("ix_bank_cards_card_fingerprint", table_name="bank_cards")
    op.drop_index("ix_bank_cards_user_id", table_name="bank_cards")
    op.drop_table("bank_cards")

    op.drop_index("ix_payments_booking_id", table_name="payments")
    op.create_unique_constraint("payments_booking_id_key", "payments", ["booking_id"])

    op.drop_constraint("fk_bookings_replaces_booking_id", "bookings", type_="foreignkey")
    op.drop_index("ix_bookings_replaces_booking_id", table_name="bookings")
    op.drop_index("ix_bookings_slot_id", table_name="bookings")
    op.create_unique_constraint("bookings_slot_id_key", "bookings", ["slot_id"])
    op.drop_column("bookings", "with_ball")
    op.drop_column("bookings", "ball_price")
    op.drop_column("bookings", "slot_price")
    op.drop_column("bookings", "replaces_booking_id")

    op.drop_constraint("uq_time_slots_court_start_end", "time_slots", type_="unique")
    op.drop_index("ix_time_slots_status", table_name="time_slots")
    op.drop_column("time_slots", "status")
    op.drop_column("time_slots", "gender")
    op.drop_column("time_slots", "ball_available")
    op.drop_column("time_slots", "ball_price")

    op.execute("DROP TYPE IF EXISTS bankcardstatus")
    op.execute("DROP TYPE IF EXISTS slotgender")
    op.execute("DROP TYPE IF EXISTS slotstatus")
