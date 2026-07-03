from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

_values_callable = lambda x: [e.value for e in x]  # noqa: E731


class SettlementRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"


class Settlement(Base):
    __tablename__ = "settlements"

    id: Mapped[int] = mapped_column(primary_key=True)
    manager_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), index=True)
    requested_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    approved_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    bookings_count: Mapped[int] = mapped_column(default=0, server_default="0")
    period_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SettlementRequestStatus] = mapped_column(
        Enum(SettlementRequestStatus, values_callable=_values_callable),
        default=SettlementRequestStatus.PENDING,
        server_default="pending",
        index=True,
    )
    manager_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_tracking_code: Mapped[str | None] = mapped_column(String(128), nullable=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    manager: Mapped["User"] = relationship()
    vendor: Mapped["Vendor"] = relationship()
    items: Mapped[list["SettlementItem"]] = relationship(back_populates="settlement")


class SettlementItem(Base):
    __tablename__ = "settlement_items"
    __table_args__ = (
        UniqueConstraint("booking_id", name="uq_settlement_items_booking_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    settlement_id: Mapped[int] = mapped_column(
        ForeignKey("settlements.id", ondelete="CASCADE"), index=True
    )
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    settlement: Mapped["Settlement"] = relationship(back_populates="items")
    booking: Mapped["Booking"] = relationship()
