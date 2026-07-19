from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.time_slot import TimeSlot
from app.models.weekly_schedule import WeeklyScheduleVersion, WeeklyScheduleVersionItem
from app.schemas.time_slot import WeeklyScheduleApply


class WeeklyScheduleRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_latest(self, vendor_id: int) -> WeeklyScheduleVersion | None:
        result = await self.db.execute(
            select(WeeklyScheduleVersion)
            .where(WeeklyScheduleVersion.vendor_id == vendor_id)
            .options(selectinload(WeeklyScheduleVersion.items))
            .order_by(WeeklyScheduleVersion.id.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_slots_in_range(
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
        )
        return list(result.scalars().all())

    async def create_version(
        self,
        vendor_id: int,
        effective_until,
        data: WeeklyScheduleApply,
        created_by_id: int | None,
    ) -> WeeklyScheduleVersion:
        version = WeeklyScheduleVersion(
            vendor_id=vendor_id,
            effective_from=data.effective_from,
            effective_until=effective_until,
            duration_months=data.duration_months,
            created_by_id=created_by_id,
            items=[
                WeeklyScheduleVersionItem(
                    day_of_week=item.day_of_week,
                    start_time=datetime.strptime(item.start_time, "%H:%M").time(),
                    end_time=datetime.strptime(item.end_time, "%H:%M").time(),
                    base_price=item.base_price,
                    gender=item.gender,
                )
                for item in data.items
            ],
        )
        self.db.add(version)
        await self.db.flush()
        return version
