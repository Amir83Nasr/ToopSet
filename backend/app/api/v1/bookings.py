from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.core.pagination import decode_cursor
from app.models.user import User
from app.schemas.booking import (
    AdminBookingListResponse,
    BookingCreate,
    BookingDetailResponse,
    BookingListResponse,
)
from app.services.booking_service import BookingService, get_booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("", response_model=BookingListResponse, summary="My bookings")
async def list_my_bookings(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = None,
    service: BookingService = Depends(get_booking_service),
):
    cursor_id = int(decode_cursor(cursor)) if cursor else None
    return await service.list_my_bookings(
        after_id=cursor_id, skip=skip, limit=limit, status_filter=status
    )


@router.get(
    "/completed", response_model=BookingListResponse, summary="Completed bookings (reviewable)"
)
async def list_completed_bookings(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: BookingService = Depends(get_booking_service),
):
    cursor_id = int(decode_cursor(cursor)) if cursor else None
    return await service.list_completed_bookings(after_id=cursor_id, skip=skip, limit=limit)


async def get_booking_service_admin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> BookingService:
    return BookingService(db=db, current_user=current_user)


@router.get("/all", response_model=AdminBookingListResponse, summary="All bookings (admin)")
async def list_all_bookings_admin(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status: str | None = None,
    service: BookingService = Depends(get_booking_service_admin),
    _: User = Depends(get_current_admin),
    response: Response = None,
):
    from app.services.cache_service import cache_admin_list, get_cached_admin_list

    cursor_id = int(decode_cursor(cursor)) if cursor else None
    cache_params = {
        "cursor": cursor,
        "skip": skip,
        "limit": limit,
        "search": search,
        "status": status,
    }
    cached = await get_cached_admin_list("bookings", cache_params)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return AdminBookingListResponse.model_validate(cached)

    result = await service.list_all_bookings(
        after_id=cursor_id, skip=skip, limit=limit, search=search, status_filter=status
    )

    await cache_admin_list("bookings", cache_params, result.model_dump(mode="json"), ttl=30)
    response.headers["X-Cache"] = "MISS"
    return result


@router.get("/{booking_id}", response_model=BookingDetailResponse, summary="Booking details")
async def get_booking(
    booking_id: int,
    service: BookingService = Depends(get_booking_service),
):
    return await service.get_booking(booking_id)


@router.post(
    "",
    response_model=BookingDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create booking",
)
async def create_booking(
    data: BookingCreate,
    service: BookingService = Depends(get_booking_service),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.create_booking(data)
    await invalidate_admin_list_cache("bookings")
    return result


@router.post("/{booking_id}/pay", response_model=BookingDetailResponse, summary="Pay booking")
async def pay_booking(
    booking_id: int,
    service: BookingService = Depends(get_booking_service),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.pay_booking(booking_id)
    await invalidate_admin_list_cache("bookings")
    await invalidate_admin_list_cache("payments")
    return result


@router.post("/{booking_id}/cancel", response_model=BookingDetailResponse, summary="Cancel booking")
async def cancel_booking(
    booking_id: int,
    service: BookingService = Depends(get_booking_service),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.cancel_booking(booking_id)
    await invalidate_admin_list_cache("bookings")
    return result
