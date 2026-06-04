from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.payment import Payment
from app.models.user import User
from app.repositories.payment_repo import PaymentRepo
from app.schemas.payment import PaymentDetailResponse, PaymentListResponse

router = APIRouter(prefix="/payments", tags=["payments"])


def _format_payment(p: Payment) -> PaymentDetailResponse:
    return PaymentDetailResponse(
        id=p.id,
        booking_id=p.booking_id,
        amount=float(p.amount),
        status=p.status,
        gateway_transaction_id=p.gateway_transaction_id,
        gateway_name=p.gateway_name,
        card_number=p.card_number,
        ref_id=p.ref_id,
        gateway_fee=float(p.gateway_fee) if p.gateway_fee else None,
        paid_at=p.paid_at,
        created_at=p.created_at,
        court_name=(
            p.booking.slot.court.name
            if p.booking and p.booking.slot and p.booking.slot.court
            else ""
        ),
        court_address=(
            p.booking.slot.court.address
            if p.booking and p.booking.slot and p.booking.slot.court
            else ""
        ),
        slot_start_time=p.booking.slot.start_time if p.booking and p.booking.slot else None,
        slot_end_time=p.booking.slot.end_time if p.booking and p.booking.slot else None,
    )


@router.get("/all", response_model=PaymentListResponse)
async def list_all_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    repo = PaymentRepo(db)
    payments, total = await repo.list_all(skip=skip, limit=limit)
    return PaymentListResponse(
        payments=[_format_payment(p) for p in payments],
        total=total,
    )
