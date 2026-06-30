from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_manager
from app.core.database import get_db
from app.core.pagination import decode_cursor, encode_cursor
from app.models.booking import Booking
from app.models.time_slot import TimeSlot
from app.models.user import User
from app.models.vendor import Vendor
from app.repositories.booking_repo import BookingRepo
from app.schemas.manager import (
    ManagerBookingListResponse,
    ManagerBookingResponse,
    ManagerSlotListResponse,
    ManagerSlotResponse,
)

router = APIRouter(prefix="/manager", tags=["manager"])


@router.get(
    "/bookings",
    response_model=ManagerBookingListResponse,
    summary="List bookings for manager's vendors",
)
async def list_manager_bookings(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = None,
    vendor_id: int | None = Query(None, description="Filter by vendor ID"),
    court_id: int | None = Query(None, description="Legacy filter by vendor ID"),
    date_from: str | None = Query(None, description="Start date (YYYY-MM-DD or ISO datetime)"),
    date_to: str | None = Query(None, description="End date (YYYY-MM-DD or ISO datetime)"),
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
    response: Response = None,
):
    effective_vendor_id = vendor_id if vendor_id is not None else court_id
    cursor_id = int(decode_cursor(cursor)) if cursor else None
    repo = BookingRepo(db)
    bookings, total = await repo.list_by_manager(
        current_user.id,
        after_id=cursor_id,
        skip=skip,
        limit=limit,
        status_filter=status,
        vendor_id=effective_vendor_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )

    result = []
    for b in bookings:
        slot = b.slot  # already loaded via selectinload in BookingRepo
        vendor = slot.vendor if slot else None
        user = b.user  # already loaded via selectinload
        result.append(
            ManagerBookingResponse(
                id=b.id,
                user_id=b.user_id,
                slot_id=b.slot_id,
                status=b.status.value if hasattr(b.status, "value") else b.status,
                price_paid=float(b.price_paid),
                penalty_amount=float(b.penalty_amount) if b.penalty_amount else None,
                participants_count=b.participants_count,
                created_at=b.created_at,
                updated_at=b.updated_at,
                expires_at=b.expires_at,
                vendor_name=vendor.name if vendor else "",
                vendor_address=vendor.address if vendor else "",
                user_name=user.full_name if user else "",
                slot_start_time=slot.start_time if slot else None,
                slot_end_time=slot.end_time if slot else None,
            )
        )
    next_cursor = None
    if bookings and len(bookings) == limit:
        next_cursor = encode_cursor(bookings[-1].id)
    return ManagerBookingListResponse(bookings=result, total=total, next_cursor=next_cursor)


@router.get(
    "/slots", response_model=ManagerSlotListResponse, summary="List time slots for manager's vendors"
)
async def list_manager_slots(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    vendor_id: int | None = Query(None, description="Filter by vendor ID"),
    court_id: int | None = Query(None, description="Legacy filter by vendor ID"),
    is_reserved: bool | None = Query(None, description="Reservation status filter"),
    date_from: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
    response: Response = None,
):
    effective_vendor_id = vendor_id if vendor_id is not None else court_id
    # Build query: TimeSlot → Vendor (manager_id filter) → Booking (optional)
    cursor_id = int(decode_cursor(cursor)) if cursor else None
    query = (
        select(TimeSlot)
        .options(
            selectinload(TimeSlot.vendor),
            selectinload(TimeSlot.booking).selectinload(Booking.user),
        )
        .join(Vendor, TimeSlot.vendor_id == Vendor.id)
        .where(Vendor.manager_id == current_user.id)
    )
    count_q = (
        select(func.count(TimeSlot.id))
        .join(Vendor, TimeSlot.vendor_id == Vendor.id)
        .where(Vendor.manager_id == current_user.id)
    )

    if cursor_id is not None:
        query = query.where(TimeSlot.id > cursor_id)
        count_q = count_q.where(TimeSlot.id > cursor_id)
    if effective_vendor_id:
        query = query.where(Vendor.id == effective_vendor_id)
        count_q = count_q.where(Vendor.id == effective_vendor_id)
    if is_reserved is not None:
        query = query.where(TimeSlot.is_reserved == is_reserved)
        count_q = count_q.where(TimeSlot.is_reserved == is_reserved)
    if date_from:
        dt_from = datetime.strptime(date_from, "%Y-%m-%d")
        query = query.where(TimeSlot.start_time >= dt_from)
        count_q = count_q.where(TimeSlot.start_time >= dt_from)
    if date_to:
        dt_to = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        query = query.where(TimeSlot.start_time <= dt_to)
        count_q = count_q.where(TimeSlot.start_time <= dt_to)

    total = (await db.execute(count_q)).scalar_one()
    query = query.order_by(TimeSlot.start_time.desc())
    if cursor_id is not None:
        result = await db.execute(query.limit(limit))
    else:
        result = await db.execute(query.offset(skip).limit(limit))
    slots = list(result.scalars().all())

    slot_responses = []
    for slot in slots:
        vendor = slot.vendor
        booking = getattr(slot, "booking", None)
        booking_user = booking.user if booking else None
        slot_responses.append(
            ManagerSlotResponse(
                id=slot.id,
                vendor_id=slot.vendor_id,
                start_time=slot.start_time,
                end_time=slot.end_time,
                base_price=float(slot.base_price),
                ball_price=float(slot.ball_price or 0),
                ball_available=slot.ball_available,
                gender=slot.gender.value if hasattr(slot.gender, "value") else slot.gender,
                status=slot.status.value if hasattr(slot.status, "value") else slot.status,
                is_reserved=slot.is_reserved,
                version=slot.version,
                vendor_name=vendor.name if vendor else "",
                vendor_address=vendor.address if vendor else "",
                vendor_sport_type=vendor.sport_types[0] if vendor and vendor.sport_types else "",
                booking_id=booking.id if booking else None,
                booking_user_name=booking_user.full_name if booking_user else None,
                booking_status=booking.status.value
                if booking and hasattr(booking.status, "value")
                else (booking.status if booking else None),
            )
        )

    next_cursor = None
    if slots and len(slots) == limit:
        next_cursor = encode_cursor(slots[-1].id)
    return ManagerSlotListResponse(slots=slot_responses, total=total, next_cursor=next_cursor)
