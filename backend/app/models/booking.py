from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, func, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

_values_callable = lambda x: [e.value for e in x]  # noqa: E731


class BookingStatus(str, enum.Enum):
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    slot_id: Mapped[int] = mapped_column(ForeignKey("time_slots.id"), unique=True)
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus, values_callable=_values_callable), default=BookingStatus.PENDING_PAYMENT, server_default="pending_payment", index=True)
    price_paid: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    penalty_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    participants_count: Mapped[int] = mapped_column(SmallInteger, default=1, server_default="1")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None, nullable=True)

    user: Mapped["User"] = relationship(back_populates="bookings")
    slot: Mapped["TimeSlot"] = relationship(back_populates="booking")
    payments: Mapped[list["Payment"]] = relationship(back_populates="booking")
    review: Mapped["Review | None"] = relationship(back_populates="booking", uselist=False)
    penalties: Mapped[list["Penalty"]] = relationship(back_populates="booking")
