from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

_values_callable = lambda x: [e.value for e in x]  # noqa: E731


class ReplacementRequestStatus(str, enum.Enum):
    OPEN = "open"
    HELD = "held"
    COMPLETED = "completed"
    EXPIRED = "expired"
    REVOKED = "revoked"


class BookingHoldStatus(str, enum.Enum):
    ACTIVE = "active"
    PROCESSING = "processing"
    PAID = "paid"
    EXPIRED = "expired"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ReplacementRequest(Base):
    __tablename__ = "replacement_requests"
    __table_args__ = (
        CheckConstraint("penalty_amount >= 0", name="ck_replacement_requests_penalty_nonnegative"),
        CheckConstraint("refund_amount >= 0", name="ck_replacement_requests_refund_nonnegative"),
        UniqueConstraint(
            "original_booking_id", name="replacement_requests_original_booking_id_key"
        ),
        Index("ix_replacement_requests_original_booking_id", "original_booking_id"),
        Index("ix_replacement_requests_slot_status", "slot_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    original_booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"))
    replacement_booking_id: Mapped[int | None] = mapped_column(
        ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True, unique=True
    )
    slot_id: Mapped[int] = mapped_column(
        ForeignKey("time_slots.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[ReplacementRequestStatus] = mapped_column(
        Enum(ReplacementRequestStatus, values_callable=_values_callable),
        default=ReplacementRequestStatus.OPEN,
        server_default="open",
        index=True,
    )
    penalty_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    refund_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    original_booking: Mapped["Booking"] = relationship(foreign_keys=[original_booking_id])
    replacement_booking: Mapped["Booking | None"] = relationship(
        foreign_keys=[replacement_booking_id]
    )
    slot: Mapped["TimeSlot"] = relationship()
    holds: Mapped[list["BookingHold"]] = relationship(
        back_populates="replacement_request", cascade="all, delete-orphan"
    )


class BookingHold(Base):
    __tablename__ = "booking_holds"
    __table_args__ = (
        CheckConstraint("price_paid > 0", name="ck_booking_holds_price_positive"),
        CheckConstraint("participants_count > 0", name="ck_booking_holds_participants_positive"),
        Index(
            "uq_booking_holds_one_live_per_slot",
            "slot_id",
            unique=True,
            postgresql_where=text("status IN ('active', 'processing')"),
        ),
        Index("ix_booking_holds_request_status", "replacement_request_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    replacement_request_id: Mapped[int] = mapped_column(
        ForeignKey("replacement_requests.id", ondelete="CASCADE"), index=True
    )
    replacement_booking_id: Mapped[int | None] = mapped_column(
        ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True, unique=True
    )
    slot_id: Mapped[int] = mapped_column(
        ForeignKey("time_slots.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[BookingHoldStatus] = mapped_column(
        Enum(BookingHoldStatus, values_callable=_values_callable),
        default=BookingHoldStatus.ACTIVE,
        server_default="active",
        index=True,
    )
    price_paid: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    slot_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    ball_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, server_default="0")
    with_ball: Mapped[bool] = mapped_column(default=False, server_default="false")
    participants_count: Mapped[int] = mapped_column(default=1, server_default="1")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    processing_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    processing_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    gateway_transaction_id: Mapped[str | None] = mapped_column(
        String(256), nullable=True, unique=True
    )
    gateway_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    card_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    ref_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    gateway_fee: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    replacement_request: Mapped["ReplacementRequest"] = relationship(back_populates="holds")
    replacement_booking: Mapped["Booking | None"] = relationship()
    slot: Mapped["TimeSlot"] = relationship()
    user: Mapped["User"] = relationship()
