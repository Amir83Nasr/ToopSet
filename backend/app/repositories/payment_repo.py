from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.payment import Payment
from app.models.time_slot import TimeSlot


class PaymentRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_user(
        self,
        user_id: int,
        *,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Payment], int]:
        query = (
            select(Payment)
            .options(
                selectinload(Payment.booking)
                .selectinload(Booking.slot)
                .selectinload(TimeSlot.court)
            )
            .join(Booking, Payment.booking_id == Booking.id)
            .where(Booking.user_id == user_id)
            .order_by(Payment.created_at.desc())
        )
        count_q = (
            select(func.count(Payment.id))
            .join(Booking, Payment.booking_id == Booking.id)
            .where(Booking.user_id == user_id)
        )

        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        payments = list(result.scalars().all())
        return payments, total

    async def get_by_booking(self, booking_id: int) -> Payment | None:
        result = await self.db.execute(select(Payment).where(Payment.booking_id == booking_id))
        return result.scalar_one_or_none()

    async def list_all(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Payment], int]:
        query = (
            select(Payment)
            .options(
                selectinload(Payment.booking)
                .selectinload(Booking.slot)
                .selectinload(TimeSlot.court)
            )
            .order_by(Payment.created_at.desc())
        )
        count_q = select(func.count(Payment.id))

        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        payments = list(result.scalars().all())
        return payments, total
