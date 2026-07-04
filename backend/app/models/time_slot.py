from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

_values_callable = lambda x: [e.value for e in x]  # noqa: E731


class SlotStatus(str, enum.Enum):
    OPEN = "open"
    RESERVING = "reserving"
    PENDING_CANCELLATION = "pending_cancellation"
    RESERVED = "reserved"
    BLOCKED = "blocked"
    DISABLED = "disabled"
    CLOSED = "closed"


class SlotGender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"


class TimeSlot(Base):
    __tablename__ = "time_slots"
    __table_args__ = (
        UniqueConstraint(
            "vendor_id", "start_time", "end_time", name="uq_time_slots_vendor_start_end"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    ball_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, server_default="0")
    ball_available: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    gender: Mapped[SlotGender] = mapped_column(
        Enum(SlotGender, values_callable=_values_callable),
        default=SlotGender.MALE,
        server_default="male",
    )
    status: Mapped[SlotStatus] = mapped_column(
        Enum(SlotStatus, values_callable=_values_callable),
        default=SlotStatus.OPEN,
        server_default="open",
        index=True,
    )
    is_reserved: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")

    vendor: Mapped["Vendor"] = relationship(back_populates="time_slots")
    booking: Mapped["Booking | None"] = relationship(back_populates="slot", uselist=False)
