from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_user_optional
from app.core.database import get_db
from app.models.user import User
from app.repositories.court_repo import CourtRepo
from app.repositories.time_slot_repo import TimeSlotRepo
from app.schemas.time_slot import (
    TimeSlotCreate,
    TimeSlotDetailResponse,
    TimeSlotGenerate,
    TimeSlotGenerateResponse,
    TimeSlotListResponse,
    TimeSlotResponse,
    TimeSlotUpdate,
)
from app.services.cache_service import (
    cache_slot_list,
    get_cached_slot_list,
    invalidate_slot_list,
)

# Index in frontend: 0=شنبه(Sat) … 6=جمعه(Fri)
# Python weekday(): Mon=0 … Sun=6
_WEEKDAY_MAP = [5, 6, 0, 1, 2, 3, 4]


class TimeSlotService:
    def __init__(self, db: AsyncSession, current_user: User | None) -> None:
        self.repo = TimeSlotRepo(db)
        self.court_repo = CourtRepo(db)
        self.current_user = current_user

    async def list_slots(
        self,
        court_id: int,
        *,
        date: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> TimeSlotListResponse:
        court = await self.court_repo.get_by_id(court_id)
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")

        # Try Redis cache (first page only for simplicity)
        if skip == 0 and limit <= 50:
            cached = await get_cached_slot_list(court_id, date=date)
            if cached is not None:
                # cached contains full result for the page
                return TimeSlotListResponse(slots=cached, total=len(cached))  # type: ignore[arg-type]

        slots, total = await self.repo.list_by_court(court_id, date=date, skip=skip, limit=limit)
        serialised = [TimeSlotResponse.model_validate(s).model_dump(mode="json") for s in slots]

        # Warm cache for the common case (first page, no offset)
        if skip == 0 and limit <= 50:
            await cache_slot_list(court_id, serialised, date=date)

        return TimeSlotListResponse(
            slots=[TimeSlotResponse.model_validate(s) for s in slots],
            total=total,
        )

    async def get_slot(self, slot_id: int) -> TimeSlotDetailResponse:
        slot = await self.repo.get_by_id(slot_id)
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time slot not found")
        court = slot.court
        return TimeSlotDetailResponse(
            id=slot.id,
            court_id=slot.court_id,
            start_time=slot.start_time,
            end_time=slot.end_time,
            base_price=float(slot.base_price),
            is_reserved=slot.is_reserved,
            version=slot.version,
            court_name=court.name if court else "",
            court_address=court.address if court else "",
            court_sport_type=court.sport_types[0] if court and court.sport_types else "",
        )

    async def create_slot(self, data: TimeSlotCreate) -> TimeSlotResponse:
        court = await self.court_repo.get_by_id(data.court_id)
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
        if data.start_time >= data.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Start time must be before end time"
            )
        slot = await self.repo.create(data.model_dump())
        await invalidate_slot_list(data.court_id)
        return TimeSlotResponse.model_validate(slot)

    async def update_slot(self, slot_id: int, data: TimeSlotUpdate) -> TimeSlotResponse:
        slot = await self.repo.get_by_id(slot_id)
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time slot not found")
        if slot.is_reserved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify a reserved slot"
            )
        updated = await self.repo.update(slot, data.model_dump(exclude_none=True))
        await invalidate_slot_list(updated.court_id)
        return TimeSlotResponse.model_validate(updated)

    async def delete_slot(self, slot_id: int) -> None:
        slot = await self.repo.get_by_id(slot_id)
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time slot not found")
        if slot.is_reserved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a reserved slot"
            )
        court_id = slot.court_id
        await self.repo.delete(slot)
        await invalidate_slot_list(court_id)

    async def generate_slots(self, court_id: int, data: TimeSlotGenerate) -> TimeSlotGenerateResponse:
        court = await self.court_repo.get_by_id(court_id)
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")

        date_from_dt = datetime.combine(data.date_from, datetime.min.time())
        date_to_dt = datetime.combine(data.date_to, datetime.max.time())

        existing = await self.repo.get_existing_start_times(court_id, date_from_dt, date_to_dt)

        to_create: list[dict] = []
        skipped = 0
        current = data.date_from
        while current <= data.date_to:
            py_weekday = current.weekday()
            try:
                persian_idx = _WEEKDAY_MAP.index(py_weekday)
            except ValueError:
                current += timedelta(days=1)
                continue
            if persian_idx not in data.days_of_week:
                current += timedelta(days=1)
                continue

            for template in data.templates:
                start_dt = datetime.combine(current, datetime.strptime(template.start_time, "%H:%M").time())
                end_dt = datetime.combine(current, datetime.strptime(template.end_time, "%H:%M").time())

                if start_dt >= end_dt:
                    skipped += 1
                    continue
                if start_dt in existing:
                    skipped += 1
                    continue

                to_create.append({
                    "court_id": court_id,
                    "start_time": start_dt,
                    "end_time": end_dt,
                    "base_price": template.base_price,
                })

            current += timedelta(days=1)

        if not to_create:
            return TimeSlotGenerateResponse(created=0, skipped=skipped, total=0, slots=[])

        created_slots = await self.repo.create_batch(to_create)
        await invalidate_slot_list(court_id)

        return TimeSlotGenerateResponse(
            created=len(created_slots),
            skipped=skipped,
            total=len(created_slots),
            slots=[TimeSlotResponse.model_validate(s) for s in created_slots],
        )


async def get_time_slot_service(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimeSlotService:
    return TimeSlotService(db=db, current_user=current_user)


async def get_time_slot_service_public(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> TimeSlotService:
    return TimeSlotService(db=db, current_user=current_user)
