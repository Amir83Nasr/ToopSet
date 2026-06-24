from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_manager
from app.core.database import get_db
from app.models.booking import Booking
from app.models.court import Court
from app.models.time_slot import TimeSlot
from app.models.user import User
from app.repositories.booking_repo import BookingRepo
from app.repositories.time_slot_repo import TimeSlotRepo
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
    summary="List bookings for manager's courts",
)
async def list_manager_bookings(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = None,
    court_id: int | None = Query(None, description="Filter by court ID"),
    date_from: str | None = Query(None, description="Start date (YYYY-MM-DD or ISO datetime)"),
    date_to: str | None = Query(None, description="End date (YYYY-MM-DD or ISO datetime)"),
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
    response: Response = None,
):
    repo = BookingRepo(db)
    bookings, total = await repo.list_by_manager(
        current_user.id,
        skip=skip,
        limit=limit,
        status_filter=status,
        court_id=court_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )

    result = []
    for b in bookings:
        slot = await TimeSlotRepo(db).get_by_id(b.slot_id)
        court = slot.court if slot else None
        user = getattr(b, "user", None)
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
                court_name=court.name if court else "",
                court_address=court.address if court else "",
                user_name=user.full_name if user else "",
                slot_start_time=slot.start_time if slot else None,
                slot_end_time=slot.end_time if slot else None,
            )
        )
    return ManagerBookingListResponse(bookings=result, total=total)


@router.get(
    "/slots", response_model=ManagerSlotListResponse, summary="List time slots for manager's courts"
)
async def list_manager_slots(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    court_id: int | None = Query(None, description="Filter by court ID"),
    is_reserved: bool | None = Query(None, description="Reservation status filter"),
    date_from: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
    response: Response = None,
):
    # Build query: TimeSlot → Court (manager_id filter) → Booking (optional)
    query = (
        select(TimeSlot)
        .options(
            selectinload(TimeSlot.court),
            selectinload(TimeSlot.booking).selectinload(Booking.user),
        )
        .join(Court, TimeSlot.court_id == Court.id)
        .where(Court.manager_id == current_user.id)
    )
    count_q = (
        select(func.count(TimeSlot.id))
        .join(Court, TimeSlot.court_id == Court.id)
        .where(Court.manager_id == current_user.id)
    )

    if court_id:
        query = query.where(Court.id == court_id)
        count_q = count_q.where(Court.id == court_id)
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
    result = await db.execute(query.offset(skip).limit(limit))
    slots = list(result.scalars().all())

    slot_responses = []
    for slot in slots:
        court = slot.court
        booking = getattr(slot, "booking", None)
        booking_user = booking.user if booking else None
        slot_responses.append(
            ManagerSlotResponse(
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
                booking_id=booking.id if booking else None,
                booking_user_name=booking_user.full_name if booking_user else None,
                booking_status=booking.status.value
                if booking and hasattr(booking.status, "value")
                else (booking.status if booking else None),
            )
        )

    return ManagerSlotListResponse(slots=slot_responses, total=total)
