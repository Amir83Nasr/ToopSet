from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.timezone import now_utc
from app.models.time_slot import TimeSlot


class TimeSlotRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_court(
        self,
        court_id: int,
        *,
        date: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[TimeSlot], int]:
        base = select(TimeSlot).where(TimeSlot.court_id == court_id)
        count_q = select(func.count(TimeSlot.id)).where(TimeSlot.court_id == court_id)

        if date:
            base = base.where(TimeSlot.start_time >= date).where(
                TimeSlot.start_time < date + "T23:59:59"
            )
            count_q = count_q.where(TimeSlot.start_time >= date).where(
                TimeSlot.start_time < date + "T23:59:59"
            )

        query = base.order_by(TimeSlot.start_time).options(selectinload(TimeSlot.court))

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
        now = now_utc()
        result = await self.db.execute(
            select(TimeSlot)
            .where(TimeSlot.court_id == court_id, TimeSlot.start_time > now)
            .order_by(TimeSlot.start_time)
            .options(selectinload(TimeSlot.court))
        )
        return list(result.scalars().all())

    async def get_existing_start_times(
        self, court_id: int, date_from: datetime, date_to: datetime
    ) -> set[datetime]:
        result = await self.db.execute(
            select(TimeSlot.start_time).where(
                TimeSlot.court_id == court_id,
                TimeSlot.start_time >= date_from,
                TimeSlot.start_time < date_to + timedelta(days=1),
            )
        )
        return set(result.scalars().all())

    async def create(self, data: dict) -> TimeSlot:
        slot = TimeSlot(**data)
        self.db.add(slot)
        await self.db.commit()
        await self.db.refresh(slot)
        return slot

    async def create_batch(self, slots_data: list[dict]) -> list[TimeSlot]:
        slots = [TimeSlot(**data) for data in slots_data]
        self.db.add_all(slots)
        await self.db.commit()
        return slots

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
