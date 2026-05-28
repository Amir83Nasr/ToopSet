from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.booking import (
    AdminBookingListResponse,
    BookingCreate,
    BookingDetailResponse,
    BookingListResponse,
)
from app.services.booking_service import BookingService, get_booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("", response_model=BookingListResponse)
async def list_my_bookings(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: BookingService = Depends(get_booking_service),
):
    return await service.list_my_bookings(skip=skip, limit=limit)


@router.get("/{booking_id}", response_model=BookingDetailResponse)
async def get_booking(
    booking_id: int,
    service: BookingService = Depends(get_booking_service),
):
    return await service.get_booking(booking_id)


@router.post("", response_model=BookingDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
    service: BookingService = Depends(get_booking_service),
):
    return await service.create_booking(data)


@router.post("/{booking_id}/pay", response_model=BookingDetailResponse)
async def pay_booking(
    booking_id: int,
    service: BookingService = Depends(get_booking_service),
):
    """Process mock payment for a pending booking."""
    return await service.pay_booking(booking_id)


@router.post("/{booking_id}/cancel", response_model=BookingDetailResponse)
async def cancel_booking(
    booking_id: int,
    service: BookingService = Depends(get_booking_service),
):
    return await service.cancel_booking(booking_id)


async def get_booking_service_admin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> BookingService:
    return BookingService(db=db, current_user=current_user)


@router.get("/all", response_model=AdminBookingListResponse)
async def list_all_bookings_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = None,
    service: BookingService = Depends(get_booking_service_admin),
    _: User = Depends(get_current_admin),
):
    return await service.list_all_bookings(skip=skip, limit=limit, status_filter=status)
