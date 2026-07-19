from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

_values_callable = lambda x: [e.value for e in x]  # noqa: E731


class RefundStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"


class RefundType(str, enum.Enum):
    USER_CANCELLATION = "user_cancellation"
    MANAGER_CANCELLATION = "manager_cancellation"
    REPLACED_AFTER_PENDING_CANCELLATION = "replaced_after_pending_cancellation"


class Refund(Base):
    __tablename__ = "refunds"
    __table_args__ = (UniqueConstraint("booking_id", "type", name="uq_refunds_booking_type"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), index=True)
    slot_id: Mapped[int] = mapped_column(
        ForeignKey("time_slots.id", ondelete="CASCADE"), index=True
    )
    slot_start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    slot_end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    original_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    slot_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    ball_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, server_default="0")
    total_paid: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    penalty_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, server_default="0")
    refund_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    reason: Mapped[str] = mapped_column(Text)
    type: Mapped[RefundType] = mapped_column(
        Enum(RefundType, values_callable=_values_callable), index=True
    )
    status: Mapped[RefundStatus] = mapped_column(
        Enum(RefundStatus, values_callable=_values_callable),
        default=RefundStatus.PENDING,
        server_default="pending",
        index=True,
    )
    penalty_charged_to_user: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    site_bears_penalty: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_tracking_code: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Immutable payout destination snapshot. BankCard is upserted per user, so a
    # foreign key alone would silently change the destination of old refunds.
    destination_card_encrypted: Mapped[str | None] = mapped_column(String(512), nullable=True)
    destination_card_masked: Mapped[str | None] = mapped_column(String(32), nullable=True)
    destination_card_holder_name: Mapped[str | None] = mapped_column(String(128), nullable=True)

    booking: Mapped["Booking"] = relationship(back_populates="refunds")
    user: Mapped["User"] = relationship()
    vendor: Mapped["Vendor"] = relationship()
    slot: Mapped["TimeSlot"] = relationship()
