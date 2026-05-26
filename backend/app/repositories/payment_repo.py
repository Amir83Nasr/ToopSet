from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment


class PaymentRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_booking(self, booking_id: int) -> Payment | None:
        result = await self.db.execute(
            select(Payment).where(Payment.booking_id == booking_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> Payment:
        payment = Payment(**data)
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)
        return payment
