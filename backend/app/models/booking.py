from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Numeric, SmallInteger, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

_values_callable = lambda x: [e.value for e in x]  # noqa: E731


class BookingStatus(str, enum.Enum):
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"
    PENDING_CANCELLATION = "pending_cancellation"
    TRANSFERRED = "transferred"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class BookingSource(str, enum.Enum):
    ONLINE = "online"
    MANAGER_MANUAL = "manager_manual"


class SettlementStatus(str, enum.Enum):
    NOT_SETTLED = "not_settled"
    SETTLEMENT_REQUESTED = "settlement_requested"
    INCLUDED_IN_SETTLEMENT = "included_in_settlement"
    SETTLED = "settled"
    EXCLUDED_DUE_TO_REFUND = "excluded_due_to_refund"
    EXCLUDED_DUE_TO_CANCELLATION = "excluded_due_to_cancellation"


class Booking(Base):
    __tablename__ = "bookings"

    __table_args__ = (
        Index("ix_bookings_created_at", "created_at"),
        Index("ix_bookings_user_id_status", "user_id", "status"),
        Index(
            "uq_bookings_one_active_per_slot",
            "slot_id",
            unique=True,
            postgresql_where=text(
                "status IN ('pending_payment', 'confirmed', 'pending_cancellation')"
            ),
        ),
        Index(
            "uq_bookings_one_pending_payment_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("status = 'pending_payment'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    slot_id: Mapped[int] = mapped_column(
        ForeignKey("time_slots.id", ondelete="CASCADE"), index=True
    )
    replaces_booking_id: Mapped[int | None] = mapped_column(
        ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, values_callable=_values_callable),
        default=BookingStatus.PENDING_PAYMENT,
        server_default="pending_payment",
        index=True,
    )
    source: Mapped[BookingSource] = mapped_column(
        Enum(BookingSource, values_callable=_values_callable),
        default=BookingSource.ONLINE,
        server_default="online",
        index=True,
    )
    settlement_status: Mapped[SettlementStatus] = mapped_column(
        Enum(SettlementStatus, values_callable=_values_callable),
        default=SettlementStatus.NOT_SETTLED,
        server_default="not_settled",
        index=True,
    )
    created_by_manager_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    customer_full_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    price_paid: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    slot_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    ball_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, server_default="0")
    with_ball: Mapped[bool] = mapped_column(default=False, server_default="false")
    penalty_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    participants_count: Mapped[int] = mapped_column(SmallInteger, default=1, server_default="1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="bookings", foreign_keys=[user_id])
    created_by_manager: Mapped["User | None"] = relationship(foreign_keys=[created_by_manager_id])
    slot: Mapped["TimeSlot"] = relationship(back_populates="bookings")
    payments: Mapped[list["Payment"]] = relationship(back_populates="booking")
    review: Mapped["Review | None"] = relationship(back_populates="booking", uselist=False)
    penalties: Mapped[list["Penalty"]] = relationship(back_populates="booking")
    refunds: Mapped[list["Refund"]] = relationship(back_populates="booking")
