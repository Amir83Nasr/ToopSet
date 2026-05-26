from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_manager
from app.models.user import User
from app.schemas.time_slot import TimeSlotCreate, TimeSlotListResponse, TimeSlotResponse, TimeSlotUpdate
from app.services.time_slot_service import TimeSlotService, get_time_slot_service

router = APIRouter(prefix="/courts/{court_id}/slots", tags=["time-slots"])


@router.get("", response_model=TimeSlotListResponse)
async def list_slots(
    court_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: TimeSlotService = Depends(get_time_slot_service),
):
    return await service.list_slots(court_id, skip=skip, limit=limit)


@router.post("", response_model=TimeSlotResponse, status_code=status.HTTP_201_CREATED)
async def create_slot(
    court_id: int,
    data: TimeSlotCreate,
    service: TimeSlotService = Depends(get_time_slot_service),
    _: User = Depends(get_current_manager),
):
    return await service.create_slot(data)


@router.patch("/{slot_id}", response_model=TimeSlotResponse)
async def update_slot(
    court_id: int,
    slot_id: int,
    data: TimeSlotUpdate,
    service: TimeSlotService = Depends(get_time_slot_service),
    _: User = Depends(get_current_manager),
):
    return await service.update_slot(slot_id, data)


@router.delete("/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_slot(
    court_id: int,
    slot_id: int,
    service: TimeSlotService = Depends(get_time_slot_service),
    _: User = Depends(get_current_manager),
):
    await service.delete_slot(slot_id)
