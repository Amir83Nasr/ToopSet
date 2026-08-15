from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.core.pagination import decode_cursor
from app.core.rate_limiter import limiter
from app.models.user import User
from app.schemas.booking import (
    AdminBookingListResponse,
    BookingCancellationTermsResponse,
    BookingCancelRequest,
    BookingCreate,
    BookingCreateResponse,
    BookingDetailResponse,
    BookingListResponse,
    ReplacementHoldResponse,
)
from app.schemas.payment import PaymentStartResponse
from app.services.booking_service import BookingService, get_booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("", response_model=BookingListResponse, summary="My bookings")
async def list_my_bookings(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = None,
    category: str | None = Query(None, pattern="^(current|past|cancelled)$"),
    search: str | None = Query(None, max_length=100),
    service: BookingService = Depends(get_booking_service),
):
    cursor_id = int(decode_cursor(cursor)) if cursor else None
    return await service.list_my_bookings(
        after_id=cursor_id,
        skip=skip,
        limit=limit,
        status_filter=status,
        category=category,
        search=search,
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


@router.get(
    "/replacement-holds/{hold_id}",
    response_model=ReplacementHoldResponse,
    summary="Replacement hold details",
    description="Return a replacement payment hold owned by the current user.",
)
async def get_replacement_hold(
    hold_id: int,
    service: BookingService = Depends(get_booking_service),
):
    return await service.get_replacement_hold(hold_id)


@router.post(
    "/replacement-holds/{hold_id}/pay",
    response_model=BookingDetailResponse | PaymentStartResponse,
    summary="Pay and finalize a replacement hold",
    description="Pay a live replacement hold and atomically transfer the slot booking.",
)
async def pay_replacement_hold(
    hold_id: int,
    service: BookingService = Depends(get_booking_service),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.pay_replacement_hold(hold_id)
    await invalidate_admin_list_cache("bookings")
    await invalidate_admin_list_cache("payments")
    return result


@router.delete(
    "/replacement-holds/{hold_id}",
    response_model=ReplacementHoldResponse,
    summary="Cancel a replacement hold",
    description="Release an active replacement hold without changing the original booking.",
)
async def cancel_replacement_hold(
    hold_id: int,
    service: BookingService = Depends(get_booking_service),
):
    return await service.cancel_replacement_hold(hold_id)


@router.get("/{booking_id}", response_model=BookingDetailResponse, summary="Booking details")
async def get_booking(
    booking_id: int,
    service: BookingService = Depends(get_booking_service),
):
    return await service.get_booking(booking_id)


@router.post(
    "",
    response_model=BookingCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create booking",
)
@limiter.limit("12/minute")
async def create_booking(
    request: Request,
    data: BookingCreate,
    service: BookingService = Depends(get_booking_service),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.create_booking(data)
    await invalidate_admin_list_cache("bookings")
    return result


@router.post(
    "/{booking_id}/pay",
    response_model=BookingDetailResponse | PaymentStartResponse,
    summary="Pay booking",
)
@limiter.limit("10/minute")
async def pay_booking(
    request: Request,
    booking_id: int,
    service: BookingService = Depends(get_booking_service),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.pay_booking(booking_id)
    await invalidate_admin_list_cache("bookings")
    await invalidate_admin_list_cache("payments")
    return result


@router.post("/{booking_id}/cancel", response_model=BookingDetailResponse, summary="Cancel booking")
@limiter.limit("10/minute")
async def cancel_booking(
    request: Request,
    booking_id: int,
    data: BookingCancelRequest | None = None,
    service: BookingService = Depends(get_booking_service),
):
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.cancel_booking(data or BookingCancelRequest(), booking_id)
    await invalidate_admin_list_cache("bookings")
    return result


@router.post(
    "/{booking_id}/withdraw-cancellation",
    response_model=BookingDetailResponse,
    summary="Withdraw a pending cancellation",
)
@limiter.limit("10/minute")
async def withdraw_cancellation(
    request: Request,
    booking_id: int,
    service: BookingService = Depends(get_booking_service),
):
    """Cancel a pending cancellation request and keep the booking active."""
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.withdraw_cancellation(booking_id)
    await invalidate_admin_list_cache("bookings")
    return result


@router.get(
    "/{booking_id}/cancellation-terms",
    response_model=BookingCancellationTermsResponse,
    summary="Preview booking cancellation terms",
)
async def get_cancellation_terms(
    booking_id: int,
    service: BookingService = Depends(get_booking_service),
):
    return await service.get_cancellation_terms(booking_id)
