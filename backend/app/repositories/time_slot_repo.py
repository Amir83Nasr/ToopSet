from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.timezone import iran_to_utc, now_utc
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
            cursor_start = (
                select(TimeSlot.start_time)
                .where(TimeSlot.id == after_id, TimeSlot.vendor_id == vendor_id)
                .scalar_subquery()
            )
            base = base.where(
                or_(
                    TimeSlot.start_time > cursor_start,
                    and_(TimeSlot.start_time == cursor_start, TimeSlot.id > after_id),
                )
            )

        if start_from is not None:
            base = base.where(TimeSlot.start_time >= start_from)
            count_q = count_q.where(TimeSlot.start_time >= start_from)

        if start_until is not None:
            base = base.where(TimeSlot.start_time <= start_until)
            count_q = count_q.where(TimeSlot.start_time <= start_until)

        if date:
            local_day = datetime.strptime(date, "%Y-%m-%d")
            start_dt = iran_to_utc(local_day)
            end_dt = iran_to_utc(local_day + timedelta(days=1))
            base = base.where(TimeSlot.start_time >= start_dt).where(TimeSlot.start_time < end_dt)
            count_q = count_q.where(TimeSlot.start_time >= start_dt).where(
                TimeSlot.start_time < end_dt
            )

        query = base.order_by(TimeSlot.start_time.asc(), TimeSlot.id.asc()).options(
            selectinload(TimeSlot.vendor)
        )

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

    async def lock_vendor_schedule(self, vendor_id: int) -> None:
        """Serialize schedule writes for one vendor inside the DB transaction."""
        await self.db.execute(
            text("SELECT pg_advisory_xact_lock(:namespace, :vendor_id)"),
            {"namespace": 9022, "vendor_id": vendor_id},
        )

    async def has_overlap(
        self,
        vendor_id: int,
        start_time: datetime,
        end_time: datetime,
        *,
        exclude_slot_id: int | None = None,
    ) -> bool:
        stmt = select(TimeSlot.id).where(
            TimeSlot.vendor_id == vendor_id,
            TimeSlot.start_time < end_time,
            TimeSlot.end_time > start_time,
        )
        if exclude_slot_id is not None:
            stmt = stmt.where(TimeSlot.id != exclude_slot_id)
        return (await self.db.execute(stmt.limit(1))).scalar_one_or_none() is not None

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

    async def list_range_for_update(
        self, vendor_id: int, start_from: datetime, start_until: datetime
    ) -> list[TimeSlot]:
        result = await self.db.execute(
            select(TimeSlot)
            .where(
                TimeSlot.vendor_id == vendor_id,
                TimeSlot.start_time >= start_from,
                TimeSlot.start_time < start_until,
            )
            .order_by(TimeSlot.start_time)
            .with_for_update()
        )
        return list(result.scalars().all())

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
