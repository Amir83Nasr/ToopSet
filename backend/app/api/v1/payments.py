from __future__ import annotations

from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.pagination import decode_cursor, encode_cursor
from app.core.rate_limiter import limiter
from app.models.payment import Payment
from app.models.user import User
from app.repositories.booking_repo import BookingRepo
from app.repositories.payment_repo import PaymentRepo
from app.repositories.replacement_repo import ReplacementRepo
from app.schemas.payment import (
    PaymentDetailResponse,
    PaymentListResponse,
    PaymentResolutionResponse,
    PaymentVerificationRequest,
    PaymentVerificationStatusResponse,
)
from app.services.booking_service import BookingService, get_booking_service

router = APIRouter(prefix="/payments", tags=["payments"])


def _format_payment(p: Payment) -> PaymentDetailResponse:
    return PaymentDetailResponse(
        id=p.id,
        booking_id=p.booking_id,
        amount=float(p.amount),
        status=p.status,
        user_name=p.booking.user.full_name if p.booking and p.booking.user else "",
        gateway_transaction_id=p.gateway_transaction_id,
        gateway_name=p.gateway_name,
        card_number=p.card_number,
        ref_id=p.ref_id,
        gateway_fee=float(p.gateway_fee) if p.gateway_fee else None,
        paid_at=p.paid_at,
        created_at=p.created_at,
        vendor_name=(
            p.booking.slot.vendor.name
            if p.booking and p.booking.slot and p.booking.slot.vendor
            else ""
        ),
        vendor_address=(
            p.booking.slot.vendor.address
            if p.booking and p.booking.slot and p.booking.slot.vendor
            else ""
        ),
        slot_start_time=p.booking.slot.start_time if p.booking and p.booking.slot else None,
        slot_end_time=p.booking.slot.end_time if p.booking and p.booking.slot else None,
    )


@router.get("/my", response_model=PaymentListResponse, summary="My payments")
async def list_my_payments(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cursor_id = int(decode_cursor(cursor)) if cursor else None
    repo = PaymentRepo(db)
    payments, total = await repo.list_by_user(
        current_user.id,
        after_id=cursor_id,
        skip=skip,
        limit=limit,
        search=search,
        status_filter=status,
    )
    next_cursor = None
    if payments and len(payments) == limit:
        next_cursor = encode_cursor(payments[-1].id)
    return PaymentListResponse(
        payments=[_format_payment(p) for p in payments],
        total=total,
        next_cursor=next_cursor,
    )


@router.get("/all", response_model=PaymentListResponse, summary="All payments (admin)")
async def list_all_payments(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
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
    cached = await get_cached_admin_list("payments", cache_params)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return PaymentListResponse.model_validate(cached)

    repo = PaymentRepo(db)
    payments, total = await repo.list_all(
        after_id=cursor_id, skip=skip, limit=limit, search=search, status_filter=status
    )
    next_cursor = None
    if payments and len(payments) == limit:
        next_cursor = encode_cursor(payments[-1].id)
    result = PaymentListResponse(
        payments=[_format_payment(p) for p in payments],
        total=total,
        next_cursor=next_cursor,
    )

    await cache_admin_list("payments", cache_params, result.model_dump(mode="json"))
    response.headers["X-Cache"] = "MISS"
    return result


@router.post(
    "/zibal/verify",
    response_model=PaymentResolutionResponse,
    summary="Verify a Zibal payment",
)
@limiter.limit("10/minute")
async def verify_zibal_payment(
    request: Request,
    data: PaymentVerificationRequest,
    service: BookingService = Depends(get_booking_service),
):
    """Verify a completed Zibal payment by its track id and finalize the booking."""
    from app.services.cache_service import invalidate_admin_list_cache

    result = await service.resolve_zibal_payment(data.track_id)
    await invalidate_admin_list_cache("bookings")
    await invalidate_admin_list_cache("payments")
    return result


def _payment_result_redirect(result: PaymentResolutionResponse) -> RedirectResponse:
    query = urlencode(
        {
            "outcome": result.outcome,
            "trackId": result.track_id,
            "bookingId": result.booking_id or "",
            "refId": result.ref_id or "",
        }
    )
    separator = "&" if "?" in settings.payment_result_url else "?"
    return RedirectResponse(
        url=f"{settings.payment_result_url}{separator}{query}",
        status_code=303,
    )


@router.get(
    "/zibal/callback",
    response_class=RedirectResponse,
    summary="Handle Zibal's unauthenticated server callback",
)
@limiter.limit("300/minute")
async def zibal_callback(
    request: Request,
    track_id: str | None = Query(None, alias="trackId"),
    db: AsyncSession = Depends(get_db),
):
    """Resolve the transaction on the backend, then redirect to the result UI."""
    if not track_id:
        return _payment_result_redirect(
            PaymentResolutionResponse(
                outcome="reconciliation_required",
                track_id="",
                message="شناسه تراکنش از درگاه دریافت نشد.",
            )
        )

    payment = await PaymentRepo(db).get_by_gateway_transaction_id(track_id)
    user = None
    if payment:
        booking = await BookingRepo(db).get_by_id(payment.booking_id)
        if booking:
            user = booking.user
    else:
        hold = await ReplacementRepo(db).get_hold_by_gateway_transaction_id(track_id)
        if hold:
            user = await db.get(User, hold.user_id)

    if not user:
        return _payment_result_redirect(
            PaymentResolutionResponse(
                outcome="reconciliation_required",
                track_id=track_id,
                message="تراکنش یافت نشد و نیازمند بررسی است.",
            )
        )

    try:
        result = await BookingService(db, user).resolve_zibal_payment(track_id)
    except Exception:
        await db.rollback()
        result = PaymentResolutionResponse(
            outcome="reconciliation_required",
            track_id=track_id,
            payment_id=payment.id if payment else None,
            booking_id=payment.booking_id if payment else None,
            message="تراکنش به صورت خودکار دوباره بررسی می‌شود.",
        )
    if result.outcome in {"paid", "failed"}:
        from app.services.cache_service import invalidate_admin_list_cache

        await invalidate_admin_list_cache("bookings")
        await invalidate_admin_list_cache("payments")
    return _payment_result_redirect(result)


@router.get(
    "/zibal/inquiry/{track_id}",
    response_model=PaymentVerificationStatusResponse,
    summary="Inquiry a Zibal payment",
)
@limiter.limit("20/minute")
async def inquiry_zibal_payment(
    request: Request,
    track_id: str,
    service: BookingService = Depends(get_booking_service),
):
    """Query the current Zibal verification status for a track id."""
    return await service.inquiry_zibal_payment(track_id)
