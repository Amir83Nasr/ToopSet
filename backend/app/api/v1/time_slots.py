from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_manager
from app.models.user import User
from app.schemas.time_slot import (
    TimeSlotCreate,
    TimeSlotDetailResponse,
    TimeSlotGenerate,
    TimeSlotGenerateResponse,
    TimeSlotListResponse,
    TimeSlotResponse,
    TimeSlotUpdate,
)
from app.services.time_slot_service import (
    TimeSlotService,
    get_time_slot_service,
    get_time_slot_service_public,
)

router = APIRouter(prefix="/courts/{court_id}/slots", tags=["time-slots"])


@router.get("", response_model=TimeSlotListResponse, summary="List time slots for a court")
async def list_slots(
    court_id: int,
    date: str | None = Query(None, description="Filter by date (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: TimeSlotService = Depends(get_time_slot_service_public),
):
    return await service.list_slots(court_id, date=date, skip=skip, limit=limit)


@router.post(
    "",
    response_model=TimeSlotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create time slot",
)
async def create_slot(
    court_id: int,
    data: TimeSlotCreate,
    service: TimeSlotService = Depends(get_time_slot_service),
    _: User = Depends(get_current_manager),
):
    return await service.create_slot(data)


@router.post(
    "/generate",
    response_model=TimeSlotGenerateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Auto-generate time slots",
)
async def generate_slots(
    court_id: int,
    data: TimeSlotGenerate,
    service: TimeSlotService = Depends(get_time_slot_service),
    _: User = Depends(get_current_manager),
):
    return await service.generate_slots(court_id, data)


@router.patch("/{slot_id}", response_model=TimeSlotResponse, summary="Update time slot")
async def update_slot(
    court_id: int,
    slot_id: int,
    data: TimeSlotUpdate,
    service: TimeSlotService = Depends(get_time_slot_service),
    _: User = Depends(get_current_manager),
):
    return await service.update_slot(slot_id, data)


@router.delete("/{slot_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete time slot")
async def delete_slot(
    court_id: int,
    slot_id: int,
    service: TimeSlotService = Depends(get_time_slot_service),
    _: User = Depends(get_current_manager),
):
    await service.delete_slot(slot_id)


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
