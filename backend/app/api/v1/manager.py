from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_manager
from app.core.database import get_db
from app.core.date_utils import parse_date_filter, parse_date_filter_end
from app.core.pagination import decode_cursor, encode_cursor
from app.models.booking import Booking, BookingSource, BookingStatus
from app.models.time_slot import TimeSlot
from app.models.user import User
from app.models.vendor import Vendor
from app.repositories.booking_repo import BookingRepo
from app.schemas.booking import BookingDetailResponse
from app.schemas.finance import (
    ManagerCancelBookingRequest,
    ManagerManualBookingCreate,
    ManagerRecurringBookingCreate,
    ManagerRecurringBookingResponse,
    SettlementCreateRequest,
    SettlementListResponse,
    SettlementResponse,
    SettlementSummaryResponse,
    SlotCancellationResponse,
)
from app.schemas.manager import (
    ManagerBookingListResponse,
    ManagerBookingResponse,
    ManagerSlotListResponse,
    ManagerSlotResponse,
)
from app.services.finance_service import FinanceService

router = APIRouter(prefix="/manager", tags=["manager"])


def _booking_detail_response(b: Booking) -> BookingDetailResponse:
    slot = b.slot
    vendor = slot.vendor if slot else None
    return BookingDetailResponse(
        id=b.id,
        user_id=b.user_id,
        slot_id=b.slot_id,
        status=b.status,
        source=b.source.value if hasattr(b.source, "value") else b.source,
        settlement_status=b.settlement_status.value
        if hasattr(b.settlement_status, "value")
        else b.settlement_status,
        customer_full_name=b.customer_full_name,
        customer_phone=b.customer_phone,
        price_paid=float(b.price_paid),
        slot_price=float(b.slot_price) if b.slot_price is not None else None,
        ball_price=float(b.ball_price or 0),
        with_ball=b.with_ball,
        penalty_amount=float(b.penalty_amount) if b.penalty_amount else None,
        created_at=b.created_at,
        updated_at=b.updated_at,
        expires_at=b.expires_at,
        vendor_name=vendor.name if vendor else "",
        vendor_address=vendor.address if vendor else "",
        slot_start_time=slot.start_time if slot else None,
        slot_end_time=slot.end_time if slot else None,
        payment=None,
    )


def _settlement_response(s) -> SettlementResponse:
    return SettlementResponse(
        id=s.id,
        manager_id=s.manager_id,
        vendor_id=s.vendor_id,
        requested_amount=float(s.requested_amount),
        approved_amount=float(s.approved_amount) if s.approved_amount is not None else None,
        bookings_count=s.bookings_count,
        period_from=s.period_from,
        period_to=s.period_to,
        status=s.status,
        manager_note=s.manager_note,
        admin_note=s.admin_note,
        payment_tracking_code=s.payment_tracking_code,
        requested_at=s.requested_at,
        approved_at=s.approved_at,
        paid_at=s.paid_at,
        vendor_name=s.vendor.name if getattr(s, "vendor", None) else "",
        manager_name=s.manager.full_name if getattr(s, "manager", None) else "",
    )


@router.get(
    "/bookings",
    response_model=ManagerBookingListResponse,
    summary="List bookings for manager's vendors",
)
async def list_manager_bookings(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
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
        None if current_user.role == "admin" else current_user.id,
        after_id=cursor_id,
        skip=skip,
        limit=limit,
        status_filter=status,
        vendor_id=effective_vendor_id,
        date_from=parse_date_filter(date_from) if date_from else None,
        date_to=parse_date_filter_end(date_to) if date_to else None,
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
                source=b.source.value if hasattr(b.source, "value") else b.source,
                settlement_status=b.settlement_status.value
                if hasattr(b.settlement_status, "value")
                else b.settlement_status,
                customer_full_name=b.customer_full_name,
                customer_phone=b.customer_phone,
                price_paid=float(b.price_paid),
                penalty_amount=float(b.penalty_amount) if b.penalty_amount else None,
                created_at=b.created_at,
                updated_at=b.updated_at,
                expires_at=b.expires_at,
                vendor_name=vendor.name if vendor else "",
                vendor_address=vendor.address if vendor else "",
                user_name=b.customer_full_name or (user.full_name if user else ""),
                user_phone=b.customer_phone or (user.phone if user else ""),
                slot_start_time=slot.start_time if slot else None,
                slot_end_time=slot.end_time if slot else None,
            )
        )
    next_cursor = None
    if bookings and len(bookings) == limit:
        next_cursor = encode_cursor(bookings[-1].id)
    return ManagerBookingListResponse(bookings=result, total=total, next_cursor=next_cursor)


@router.post(
    "/bookings/manual",
    response_model=BookingDetailResponse,
    status_code=201,
    summary="Create a manual booking for manager's own vendor slot",
)
async def create_manual_booking(
    data: ManagerManualBookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    service = FinanceService(db, current_user)
    booking = await service.create_manager_booking(
        slot_id=data.slot_id,
        full_name=data.full_name,
        phone_number=data.phone_number,
        source=BookingSource(data.source),
    )
    return _booking_detail_response(booking)


@router.post(
    "/bookings/recurring",
    response_model=ManagerRecurringBookingResponse,
    status_code=201,
    summary="Create recurring long-term manual bookings",
)
async def create_recurring_bookings(
    data: ManagerRecurringBookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    service = FinanceService(db, current_user)
    return await service.create_recurring_manager_bookings(
        vendor_id=data.vendor_id,
        full_name=data.full_name,
        phone_number=data.phone_number,
        date_from=data.date_from,
        date_to=data.date_to,
        days_of_week=data.days_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        allow_partial=data.allow_partial,
    )


@router.post(
    "/bookings/{booking_id}/cancel",
    response_model=SlotCancellationResponse,
    summary="Cancel a booking owned by manager's vendor",
)
async def cancel_manager_booking(
    booking_id: int,
    data: ManagerCancelBookingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    service = FinanceService(db, current_user)
    cancellation = await service.cancel_booking_by_manager(
        booking_id, reason=data.reason, release_slot=data.release_slot
    )
    return SlotCancellationResponse(
        id=cancellation.id,
        slot_id=cancellation.slot_id,
        booking_id=cancellation.booking_id,
        vendor_id=cancellation.vendor_id,
        manager_id=cancellation.manager_id,
        affected_user_id=cancellation.affected_user_id,
        affected_full_name=cancellation.affected_full_name,
        affected_phone=cancellation.affected_phone,
        reason=cancellation.reason,
        release_slot=cancellation.release_slot,
        online_paid_amount=float(cancellation.online_paid_amount)
        if cancellation.online_paid_amount is not None
        else None,
        site_cost_amount=float(cancellation.site_cost_amount),
        sms_status=cancellation.sms_status,
        notification_status=cancellation.notification_status,
        review_status=cancellation.review_status,
        created_at=cancellation.created_at,
    )


@router.get(
    "/finance/summary",
    response_model=SettlementSummaryResponse,
    summary="Manager finance summary",
)
async def manager_finance_summary(
    vendor_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    service = FinanceService(db, current_user)
    return await service.settlement_summary(
        vendor_id=vendor_id, date_from=date_from, date_to=date_to
    )


@router.post(
    "/settlements",
    response_model=SettlementResponse,
    status_code=201,
    summary="Request settlement for eligible online bookings",
)
async def request_settlement(
    data: SettlementCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    service = FinanceService(db, current_user)
    settlement = await service.create_settlement_request(
        vendor_id=data.vendor_id,
        period_from=data.period_from,
        period_to=data.period_to,
        manager_note=data.manager_note,
    )
    await db.refresh(settlement, ["vendor", "manager"])
    return _settlement_response(settlement)


@router.get(
    "/settlements",
    response_model=SettlementListResponse,
    summary="List manager settlement requests",
)
async def list_manager_settlements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager),
):
    service = FinanceService(db, current_user)
    settlements, total = await service.list_settlements(manager_only=True)
    return SettlementListResponse(
        settlements=[_settlement_response(s) for s in settlements],
        total=total,
    )


@router.get(
    "/slots",
    response_model=ManagerSlotListResponse,
    summary="List time slots for manager's vendors",
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
            selectinload(TimeSlot.bookings).selectinload(Booking.user),
        )
        .join(Vendor, TimeSlot.vendor_id == Vendor.id)
    )
    count_q = select(func.count(TimeSlot.id)).join(Vendor, TimeSlot.vendor_id == Vendor.id)

    if current_user.role != "admin":
        query = query.where(Vendor.manager_id == current_user.id)
        count_q = count_q.where(Vendor.manager_id == current_user.id)

    if cursor_id is not None:
        query = query.where(TimeSlot.id < cursor_id)
    if effective_vendor_id:
        query = query.where(Vendor.id == effective_vendor_id)
        count_q = count_q.where(Vendor.id == effective_vendor_id)
    if is_reserved is not None:
        query = query.where(TimeSlot.is_reserved == is_reserved)
        count_q = count_q.where(TimeSlot.is_reserved == is_reserved)
    if date_from:
        dt_from = parse_date_filter(date_from)
        query = query.where(TimeSlot.start_time >= dt_from)
        count_q = count_q.where(TimeSlot.start_time >= dt_from)
    if date_to:
        dt_to = parse_date_filter_end(date_to)
        query = query.where(TimeSlot.start_time <= dt_to)
        count_q = count_q.where(TimeSlot.start_time <= dt_to)

    total = (await db.execute(count_q)).scalar_one()
    query = query.order_by(TimeSlot.id.desc())
    if cursor_id is not None:
        result = await db.execute(query.limit(limit))
    else:
        result = await db.execute(query.offset(skip).limit(limit))
    slots = list(result.scalars().all())

    slot_responses = []
    for slot in slots:
        vendor = slot.vendor
        booking = next(
            (
                item
                for item in slot.bookings
                if item.status
                in (
                    BookingStatus.PENDING_PAYMENT,
                    BookingStatus.CONFIRMED,
                    BookingStatus.PENDING_CANCELLATION,
                )
            ),
            slot.bookings[0] if slot.bookings else None,
        )
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
