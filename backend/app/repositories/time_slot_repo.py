from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.time_slot import TimeSlot


class TimeSlotRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_court(
        self,
        court_id: int,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[TimeSlot], int]:
        query = select(TimeSlot).where(TimeSlot.court_id == court_id).order_by(TimeSlot.start_time).options(selectinload(TimeSlot.court))
        count_q = select(func.count(TimeSlot.id)).where(TimeSlot.court_id == court_id)

        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        slots = list(result.scalars().all())
        return slots, total

    async def get_by_id(self, slot_id: int) -> TimeSlot | None:
        result = await self.db.execute(
            select(TimeSlot).where(TimeSlot.id == slot_id).options(selectinload(TimeSlot.court))
        )
        return result.scalar_one_or_none()

    async def list_upcoming_by_court(self, court_id: int) -> list[TimeSlot]:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(TimeSlot)
            .where(TimeSlot.court_id == court_id, TimeSlot.start_time > now)
            .order_by(TimeSlot.start_time)
            .options(selectinload(TimeSlot.court))
        )
        return list(result.scalars().all())

    async def create(self, data: dict) -> TimeSlot:
        slot = TimeSlot(**data)
        self.db.add(slot)
        await self.db.commit()
        await self.db.refresh(slot)
        return slot

    async def update(self, slot: TimeSlot, data: dict) -> TimeSlot:
        for key, value in data.items():
            if value is not None:
                setattr(slot, key, value)
        slot.version += 1  # optimistic lock
        await self.db.commit()
        await self.db.refresh(slot)
        return slot

    async def delete(self, slot: TimeSlot) -> None:
        await self.db.delete(slot)
        await self.db.commit()
