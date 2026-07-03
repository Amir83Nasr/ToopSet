from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.timezone import now_utc
from app.models.time_slot import TimeSlot


class TimeSlotRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_vendor(
        self,
        vendor_id: int,
        *,
        after_id: int | None = None,
        date: str | None = None,
        start_from: datetime | None = None,
        start_until: datetime | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[TimeSlot], int]:
        base = select(TimeSlot).where(TimeSlot.vendor_id == vendor_id)
        count_q = select(func.count(TimeSlot.id)).where(TimeSlot.vendor_id == vendor_id)

        if after_id is not None:
            base = base.where(TimeSlot.id > after_id)

        if start_from is not None:
            base = base.where(TimeSlot.start_time >= start_from)
            count_q = count_q.where(TimeSlot.start_time >= start_from)

        if start_until is not None:
            base = base.where(TimeSlot.start_time <= start_until)
            count_q = count_q.where(TimeSlot.start_time <= start_until)

        if date:
            start_dt = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            end_dt = start_dt.replace(hour=23, minute=59, second=59)
            base = base.where(TimeSlot.start_time >= start_dt).where(TimeSlot.start_time < end_dt)
            count_q = count_q.where(TimeSlot.start_time >= start_dt).where(
                TimeSlot.start_time < end_dt
            )

        query = base.order_by(TimeSlot.start_time).options(selectinload(TimeSlot.vendor))

        total = (await self.db.execute(count_q)).scalar_one()
        if after_id is not None:
            result = await self.db.execute(query.limit(limit))
        else:
            result = await self.db.execute(query.offset(skip).limit(limit))
        slots = list(result.scalars().all())
        return slots, total

    async def get_by_id(self, slot_id: int, *, for_update: bool = False) -> TimeSlot | None:
        stmt = select(TimeSlot).where(TimeSlot.id == slot_id).options(selectinload(TimeSlot.vendor))
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_upcoming_by_vendor(self, vendor_id: int) -> list[TimeSlot]:
        now = now_utc()
        result = await self.db.execute(
            select(TimeSlot)
            .where(TimeSlot.vendor_id == vendor_id, TimeSlot.start_time > now)
            .order_by(TimeSlot.start_time)
            .options(selectinload(TimeSlot.vendor))
        )
        return list(result.scalars().all())

    async def get_existing_start_times(
        self, vendor_id: int, date_from: datetime, date_to: datetime
    ) -> set[datetime]:
        result = await self.db.execute(
            select(TimeSlot.start_time).where(
                TimeSlot.vendor_id == vendor_id,
                TimeSlot.start_time >= date_from,
                TimeSlot.start_time < date_to + timedelta(days=1),
            )
        )
        return set(result.scalars().all())

    async def create(self, data: dict) -> TimeSlot:
        slot = TimeSlot(**data)
        self.db.add(slot)
        await self.db.flush()
        await self.db.refresh(slot)
        return slot

    async def create_batch(self, slots_data: list[dict]) -> list[TimeSlot]:
        slots = [TimeSlot(**data) for data in slots_data]
        self.db.add_all(slots)
        await self.db.flush()
        return slots

    async def update(self, slot: TimeSlot, data: dict) -> TimeSlot:
        for key, value in data.items():
            if value is not None:
                setattr(slot, key, value)
        slot.version += 1  # optimistic lock
        await self.db.flush()
        await self.db.refresh(slot)
        return slot

    async def delete(self, slot: TimeSlot) -> None:
        await self.db.delete(slot)
        await self.db.flush()
