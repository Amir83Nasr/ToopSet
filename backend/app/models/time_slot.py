from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    UniqueConstraint,
    text,
)
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
        Index("ix_time_slots_vendor_id_start_time", "vendor_id", "start_time"),
        Index(
            "ix_time_slots_open_vendor_price",
            "vendor_id",
            "base_price",
            postgresql_where=text("is_reserved = false AND status = 'open'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
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
    bookings: Mapped[list["Booking"]] = relationship(
        back_populates="slot", order_by="Booking.created_at.desc()"
    )

    @property
    def ball_available(self) -> bool:
        """Compatibility field: ball configuration belongs to the vendor."""
        return bool(self.vendor and self.vendor.ball_available)

    @property
    def ball_price(self) -> Decimal:
        """Compatibility field exposed on slot APIs, sourced from the vendor."""
        return self.vendor.ball_price if self.vendor else Decimal("0")
