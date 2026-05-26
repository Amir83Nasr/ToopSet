from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking


class BookingRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_user(
        self,
        user_id: int,
        *,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Booking], int]:
        query = (
            select(Booking)
            .where(Booking.user_id == user_id)
            .order_by(Booking.created_at.desc())
        )
        count_q = select(func.count(Booking.id)).where(Booking.user_id == user_id)

        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        bookings = list(result.scalars().all())
        return bookings, total

    async def get_by_id(self, booking_id: int) -> Booking | None:
        result = await self.db.execute(select(Booking).where(Booking.id == booking_id))
        return result.scalar_one_or_none()

    async def get_by_slot(self, slot_id: int) -> Booking | None:
        result = await self.db.execute(select(Booking).where(Booking.slot_id == slot_id))
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> Booking:
        booking = Booking(**data)
        self.db.add(booking)
        await self.db.commit()
        await self.db.refresh(booking)
        return booking

    async def update(self, booking: Booking, data: dict) -> Booking:
        for key, value in data.items():
            if value is not None:
                setattr(booking, key, value)
        await self.db.commit()
        await self.db.refresh(booking)
        return booking
