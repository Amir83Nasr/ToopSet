from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.pagination import decode_cursor, encode_cursor
from app.models.refund import Refund, RefundStatus
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.finance import UserRefundListResponse, UserRefundResponse

router = APIRouter(prefix="/refunds", tags=["refunds"])


@router.get("/my", response_model=UserRefundListResponse, summary="My refunds")
async def list_my_refunds(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: RefundStatus | None = Query(None, alias="status"),
    search: str | None = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cursor_id = int(decode_cursor(cursor)) if cursor else None
    stmt = (
        select(Refund)
        .options(selectinload(Refund.vendor))
        .join(Vendor, Refund.vendor_id == Vendor.id)
        .where(Refund.user_id == current_user.id)
        .order_by(Refund.id.desc())
    )
    count_stmt = (
        select(func.count(Refund.id))
        .join(Vendor, Refund.vendor_id == Vendor.id)
        .where(Refund.user_id == current_user.id)
    )
    if cursor_id is not None:
        stmt = stmt.where(Refund.id < cursor_id)
    if status_filter is not None:
        stmt = stmt.where(Refund.status == status_filter)
        count_stmt = count_stmt.where(Refund.status == status_filter)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(Vendor.name.ilike(pattern))
        count_stmt = count_stmt.where(Vendor.name.ilike(pattern))

    if cursor_id is None:
        stmt = stmt.offset(skip)
    rows = list((await db.execute(stmt.limit(limit))).scalars().all())
    total = (await db.execute(count_stmt)).scalar_one()
    next_cursor = encode_cursor(rows[-1].id) if len(rows) == limit else None
    return UserRefundListResponse(
        refunds=[
            UserRefundResponse(
                id=refund.id,
                booking_id=refund.booking_id,
                vendor_name=refund.vendor.name if refund.vendor else "",
                slot_start_time=refund.slot_start_time,
                total_paid=float(refund.total_paid),
                penalty_amount=float(refund.penalty_amount),
                refund_amount=float(refund.refund_amount),
                reason=refund.reason,
                type=refund.type,
                status=refund.status,
                destination_card_masked=refund.destination_card_masked,
                destination_card_holder_name=refund.destination_card_holder_name,
                requested_at=refund.requested_at,
                approved_at=refund.approved_at,
                paid_at=refund.paid_at,
                payment_tracking_code=refund.payment_tracking_code,
            )
            for refund in rows
        ],
        total=total,
        next_cursor=next_cursor,
    )
