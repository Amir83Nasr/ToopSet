from __future__ import annotations

from datetime import date as Date

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.deps import get_current_manager
from app.core.pagination import decode_cursor
from app.models.user import User
from app.schemas.time_slot import (
    TimeSlotCreate,
    TimeSlotDetailResponse,
    TimeSlotGenerate,
    TimeSlotGenerateResponse,
    TimeSlotListResponse,
    TimeSlotResponse,
    TimeSlotUpdate,
    WeeklyScheduleApply,
    WeeklyScheduleApplyResponse,
    WeeklyScheduleTemplateResponse,
)
from app.services.time_slot_service import (
    TimeSlotService,
    get_time_slot_service,
    get_time_slot_service_public,
)

router = APIRouter(prefix="/vendors/{vendor_id}/slots", tags=["time-slots"])
legacy_router = APIRouter(
    prefix="/courts/{vendor_id}/slots", tags=["time-slots"], include_in_schema=False
)


@legacy_router.get("", response_model=TimeSlotListResponse, summary="List time slots for a vendor")
@router.get("", response_model=TimeSlotListResponse, summary="List time slots for a vendor")
async def list_slots(
    vendor_id: int,
    cursor: str | None = Query(None, description="Cursor for next page"),
    date: Date | None = Query(None, description="Filter by date (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    service: TimeSlotService = Depends(get_time_slot_service_public),
    response: Response = None,
):
    cursor_id = int(decode_cursor(cursor)) if cursor else None
    result = await service.list_slots(
        vendor_id,
        after_id=cursor_id,
        date=date.isoformat() if date else None,
        skip=skip,
        limit=limit,
    )
    response.headers["X-Cache"] = "HIT" if getattr(service, "_from_cache", False) else "MISS"
    return result


@legacy_router.post(
    "",
    response_model=TimeSlotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create time slot",
)
@router.post(
    "",
    response_model=TimeSlotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create time slot",
)
async def create_slot(
    vendor_id: int,
    data: TimeSlotCreate,
    service: TimeSlotService = Depends(get_time_slot_service),
    _: User = Depends(get_current_manager),
):
    return await service.create_slot(vendor_id, data)


@legacy_router.post(
    "/generate",
    response_model=TimeSlotGenerateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Auto-generate time slots",
)
@router.post(
    "/generate",
    response_model=TimeSlotGenerateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Auto-generate time slots",
)
async def generate_slots(
    vendor_id: int,
    data: TimeSlotGenerate,
    service: TimeSlotService = Depends(get_time_slot_service),
    _: User = Depends(get_current_manager),
):
    return await service.generate_slots(vendor_id, data)


@router.get(
    "/weekly-schedule-template",
    response_model=WeeklyScheduleTemplateResponse,
    summary="Get the latest saved weekly schedule template",
)
async def get_weekly_schedule_template(
    vendor_id: int,
    service: TimeSlotService = Depends(get_time_slot_service),
    _: User = Depends(get_current_manager),
):
    return await service.get_weekly_schedule_template(vendor_id)


@router.post(
    "/apply-weekly-schedule",
    response_model=WeeklyScheduleApplyResponse,
    summary="Apply a weekly schedule from a future date",
)
async def apply_weekly_schedule(
    vendor_id: int,
    data: WeeklyScheduleApply,
    service: TimeSlotService = Depends(get_time_slot_service),
    _: User = Depends(get_current_manager),
):
    return await service.apply_weekly_schedule(vendor_id, data)


@legacy_router.patch("/{slot_id}", response_model=TimeSlotResponse, summary="Update time slot")
@router.patch("/{slot_id}", response_model=TimeSlotResponse, summary="Update time slot")
async def update_slot(
    vendor_id: int,
    slot_id: int,
    data: TimeSlotUpdate,
    service: TimeSlotService = Depends(get_time_slot_service),
    _: User = Depends(get_current_manager),
):
    return await service.update_vendor_slot(vendor_id, slot_id, data)


# Dedicated slot detail router — used by the booking flow
slot_detail_router = APIRouter(prefix="/slots", tags=["slots"])


@slot_detail_router.get(
    "/{slot_id}", response_model=TimeSlotDetailResponse, summary="Get slot details"
)
async def get_slot_by_id(
    slot_id: int,
    service: TimeSlotService = Depends(get_time_slot_service_public),
):
    return await service.get_slot(slot_id)
