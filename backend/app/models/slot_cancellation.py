from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SlotCancellation(Base):
    __tablename__ = "slot_cancellations"

    id: Mapped[int] = mapped_column(primary_key=True)
    slot_id: Mapped[int] = mapped_column(ForeignKey("time_slots.id", ondelete="CASCADE"), index=True)
    booking_id: Mapped[int | None] = mapped_column(
        ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True, index=True
    )
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), index=True)
    manager_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    affected_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    affected_full_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    affected_phone: Mapped[str | None] = mapped_column(String(16), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    release_slot: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    online_paid_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    site_cost_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, server_default="0")
    sms_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    notification_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    review_status: Mapped[str] = mapped_column(String(32), default="pending", server_default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    slot: Mapped["TimeSlot"] = relationship()
    booking: Mapped["Booking | None"] = relationship()
    vendor: Mapped["Vendor"] = relationship()
