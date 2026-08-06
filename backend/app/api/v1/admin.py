from __future__ import annotations

import hmac
import json
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Header,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.card_security import decrypt_card_number
from app.core.config import settings
from app.core.database import get_db
from app.core.logger import log_action
from app.core.pagination import decode_cursor, encode_cursor
from app.core.phone import normalize_phone
from app.core.security import hash_password
from app.core.upload import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    delete_upload,
    validate_upload_content,
)
from app.models.setting import Setting
from app.models.user import User
from app.models.vendor import Vendor
from app.repositories.log_repo import LogRepo
from app.repositories.notification_repo import NotificationRepo
from app.repositories.user_repo import UserRepository
from app.repositories.vendor_repo import VendorRepo
from app.schemas.finance import (
    RefundDestinationResponse,
    RefundListResponse,
    RefundResponse,
    RefundStatusUpdate,
    SettlementDestinationResponse,
    SettlementDetailResponse,
    SettlementItemResponse,
    SettlementListResponse,
    SettlementResponse,
    SettlementStatusUpdate,
    SlotCancellationResponse,
)
from app.schemas.setting import SettingResponse, SettingUpdateRequest
from app.schemas.vendor import VendorResponse

# Hero images are stored in the frontend public directory so Next.js serves them directly
_HERO_UPLOAD_DIR = (
    Path(__file__).resolve().parent.parent.parent.parent.parent
    / "frontend"
    / "public"
    / "uploads"
    / "hero"
)

router = APIRouter(prefix="/admin", tags=["admin"])


async def _guard_admin_deletion(db: AsyncSession, *, actor: User, target: User) -> None:
    """Serialize admin membership changes and preserve at least one admin."""
    await db.execute(text("SELECT pg_advisory_xact_lock(9023)"))
    if actor.id == target.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ادمین نمی‌تواند حساب خودش را حذف کند",
        )
    if target.role == "admin":
        admin_count = (
            await db.execute(select(func.count(User.id)).where(User.role == "admin"))
        ).scalar_one()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="آخرین ادمین سامانه قابل حذف نیست",
            )


async def _vendor_has_booking_history(db: AsyncSession, vendor_id: int) -> bool:
    from app.models.booking import Booking
    from app.models.time_slot import TimeSlot

    booking_id = (
        await db.execute(
            select(Booking.id)
            .join(TimeSlot, Booking.slot_id == TimeSlot.id)
            .where(TimeSlot.vendor_id == vendor_id)
            .limit(1)
        )
    ).scalar_one_or_none()
    return booking_id is not None


def _refund_response(refund) -> RefundResponse:
    return RefundResponse(
        id=refund.id,
        booking_id=refund.booking_id,
        user_id=refund.user_id,
        vendor_id=refund.vendor_id,
        slot_id=refund.slot_id,
        slot_start_time=refund.slot_start_time,
        slot_end_time=refund.slot_end_time,
        original_amount=float(refund.original_amount),
        slot_price=float(refund.slot_price) if refund.slot_price is not None else None,
        ball_price=float(refund.ball_price),
        total_paid=float(refund.total_paid),
        penalty_amount=float(refund.penalty_amount),
        refund_amount=float(refund.refund_amount),
        reason=refund.reason,
        type=refund.type,
        status=refund.status,
        penalty_charged_to_user=refund.penalty_charged_to_user,
        site_bears_penalty=refund.site_bears_penalty,
        requested_at=refund.requested_at,
        approved_at=refund.approved_at,
        paid_at=refund.paid_at,
        admin_note=refund.admin_note,
        payment_tracking_code=refund.payment_tracking_code,
        destination_card_masked=refund.destination_card_masked,
        destination_card_holder_name=refund.destination_card_holder_name,
        user_name=refund.user.full_name if getattr(refund, "user", None) else "",
        user_phone=refund.user.phone if getattr(refund, "user", None) else "",
        vendor_name=refund.vendor.name if getattr(refund, "vendor", None) else "",
    )


def _settlement_response(s) -> SettlementResponse:
    return SettlementResponse(
        id=s.id,
        manager_id=s.manager_id,
        vendor_id=s.vendor_id,
        requested_amount=float(s.requested_amount),
        approved_amount=float(s.approved_amount) if s.approved_amount is not None else None,
        gross_amount=float(s.gross_amount),
        commission_percent=float(s.commission_percent),
        commission_amount=float(s.commission_amount),
        gateway_fee=float(s.gateway_fee),
        bookings_count=s.bookings_count,
        period_from=s.period_from,
        period_to=s.period_to,
        status=s.status,
        manager_note=s.manager_note,
        admin_note=s.admin_note,
        payment_tracking_code=s.payment_tracking_code,
        destination_card_masked=s.destination_card_masked,
        destination_card_holder_name=s.destination_card_holder_name,
        requested_at=s.requested_at,
        approved_at=s.approved_at,
        paid_at=s.paid_at,
        vendor_name=s.vendor.name if getattr(s, "vendor", None) else "",
        manager_name=s.manager.full_name if getattr(s, "manager", None) else "",
    )


class BroadcastRequest(BaseModel):
    type: str = "broadcast"
    message: str


@router.post("/notifications/broadcast", summary="Send broadcast notification")
async def broadcast_notification(
    data: BroadcastRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import invalidate_admin_list_cache

    repo = NotificationRepo(db)
    count = await repo.create_for_all_users(type_=data.type, message=data.message)
    await log_action(
        db, _.id, "broadcast", f"اعلان همگانی | ارسال به {count} کاربر: {data.message[:100]}"
    )
    await invalidate_admin_list_cache("notifications")
    return {"success": True, "count": count}


class LogResponse(BaseModel):
    id: int
    user_id: int | None = None
    user_name: str | None = None
    action: str
    details: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class LogListResponse(BaseModel):
    logs: list[LogResponse]
    total: int
    next_cursor: str | None = None


@router.get("/logs", response_model=LogListResponse, summary="View audit logs")
async def list_logs(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    action: str | None = None,
    user_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
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
        "action": action,
        "user_id": user_id,
        "date_from": str(date_from) if date_from else None,
        "date_to": str(date_to) if date_to else None,
    }
    cached = await get_cached_admin_list("logs", cache_params)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return LogListResponse.model_validate(cached)

    repo = LogRepo(db)
    logs, total = await repo.list(
        after_id=cursor_id,
        skip=skip,
        limit=limit,
        action=action,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
    )
    log_responses = []
    for log in logs:
        resp = LogResponse.model_validate(log)
        if log.user:
            resp.user_name = log.user.full_name
        log_responses.append(resp)

    next_cursor = None
    if logs and len(logs) == limit:
        next_cursor = encode_cursor(logs[-1].id)
    result = LogListResponse(logs=log_responses, total=total, next_cursor=next_cursor)

    await cache_admin_list(
        "logs",
        cache_params,
        {
            "logs": [r.model_dump(mode="json") for r in log_responses],
            "total": total,
            "next_cursor": next_cursor,
        },
        ttl=30,
    )
    response.headers["X-Cache"] = "MISS"
    return result


@router.delete("/logs/clear", status_code=status.HTTP_204_NO_CONTENT, summary="Clear all logs")
async def clear_logs(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import invalidate_admin_list_cache

    await log_action(
        db,
        _.id,
        "audit_log_delete_attempt",
        f"درخواست پاکسازی همه لاگ‌ها توسط ادمین '{_.full_name}'",
        severity="WARNING",
    )
    if not (settings.is_development_or_bootstrap and settings.allow_audit_log_deletion):
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="حذف لاگ‌های امنیتی در این محیط غیرفعال است",
        )

    repo = LogRepo(db)
    await repo.clear_all()
    await invalidate_admin_list_cache("logs")
    await log_action(
        db, _.id, "logs_cleared", f"پاکسازی لاگ‌ها | تمام لاگ‌ها توسط ادمین '{_.full_name}' پاک شد"
    )


@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete log entry")
async def delete_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import invalidate_admin_list_cache

    await log_action(
        db,
        _.id,
        "audit_log_delete_attempt",
        f"درخواست حذف لاگ امنیتی id={log_id} توسط ادمین '{_.full_name}'",
        severity="WARNING",
    )
    if not (settings.is_development_or_bootstrap and settings.allow_audit_log_deletion):
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="حذف لاگ‌های امنیتی در این محیط غیرفعال است",
        )

    repo = LogRepo(db)
    await repo.delete_by_id(log_id)
    await invalidate_admin_list_cache("logs")


# ── Vendor approval (pending vendors) ──────────────────────────────────


class VendorApprovalResponse(BaseModel):
    id: int
    name: str
    manager_name: str
    sport_types: list[str]
    address: str
    capacity: int
    created_at: datetime


@router.get("/pending-courts", summary="Pending vendor approvals", include_in_schema=False)
@router.get("/pending-vendors", summary="Pending vendor approvals")
async def list_pending_vendors(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
    response: Response = None,
):
    from sqlalchemy import func, select

    from app.services.cache_service import cache_admin_list, get_cached_admin_list

    cache_params = {"skip": skip, "limit": limit}
    cached = await get_cached_admin_list("pending_vendors", cache_params)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return cached

    count_q = select(func.count(Vendor.id)).where(Vendor.is_active == False)
    total = (await db.execute(count_q)).scalar_one()

    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Vendor)
        .options(selectinload(Vendor.manager))
        .where(Vendor.is_active == False)
        .order_by(Vendor.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    vendors = result.scalars().all()

    vendors_data = []
    for c in vendors:
        manager = c.manager  # loaded via selectinload
        vendors_data.append(
            {
                "id": c.id,
                "name": c.name,
                "manager_name": manager.full_name if manager else "نامشخص",
                "sport_types": c.sport_types or [],
                "address": c.address,
                "capacity": c.capacity,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
        )

    result_data = {"vendors": vendors_data, "total": total}
    await cache_admin_list("pending_vendors", cache_params, result_data)
    response.headers["X-Cache"] = "MISS"
    return result_data


@router.post(
    "/courts/{vendor_id}/approve",
    response_model=VendorResponse,
    summary="Approve vendor",
    include_in_schema=False,
)
@router.post(
    "/vendors/{vendor_id}/approve", response_model=VendorResponse, summary="Approve vendor"
)
async def approve_vendor(
    vendor_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import invalidate_admin_list_cache
    from app.services.vendor_service import VendorService

    service = VendorService(db=db, current_user=_)
    result = await service.toggle_vendor_status(vendor_id, is_active=True)
    await invalidate_admin_list_cache("pending_vendors")
    await invalidate_admin_list_cache("vendors")
    await log_action(
        db, _.id, "vendor_approved", f"تایید مجموعه | مجموعه (id={vendor_id}) توسط ادمین تایید شد"
    )
    return result


@router.post(
    "/courts/{vendor_id}/reject",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reject vendor",
    include_in_schema=False,
)
@router.post(
    "/vendors/{vendor_id}/reject", status_code=status.HTTP_204_NO_CONTENT, summary="Reject vendor"
)
async def reject_vendor(
    vendor_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import invalidate_admin_list_cache

    repo = VendorRepo(db)
    vendor = await repo.get_by_id(vendor_id)
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
    if vendor.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="فقط درخواست تأییدنشده قابل رد است؛ برای مجموعه فعال از غیرفعال‌سازی استفاده کنید",
        )
    if await _vendor_has_booking_history(db, vendor_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="مجموعه دارای سابقه رزرو است و قابل حذف نیست",
        )
    name = vendor.name
    for img in vendor.vendor_images or []:
        delete_upload(img.url)
    await repo.delete(vendor)
    await invalidate_admin_list_cache("pending_vendors")
    await invalidate_admin_list_cache("vendors")
    await log_action(
        db, _.id, "vendor_rejected", f"رد مجموعه | '{name}' (id={vendor_id}) توسط ادمین رد شد"
    )


# ── Hard-delete endpoints ───────────────────────────────────────────


@router.delete(
    "/courts/{vendor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete vendor",
    include_in_schema=False,
)
@router.delete(
    "/vendors/{vendor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete vendor",
)
async def hard_delete_vendor(
    vendor_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Permanently delete a vendor from the database."""
    repo = VendorRepo(db)
    vendor = await repo.get_by_id(vendor_id)
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
    if await _vendor_has_booking_history(db, vendor_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="مجموعه دارای سابقه رزرو یا مالی است و قابل حذف دائمی نیست",
        )
    for img in vendor.vendor_images or []:
        delete_upload(img.url)
    await repo.delete(vendor)
    from app.services.cache_service import invalidate_admin_list_cache

    await invalidate_admin_list_cache("pending_vendors")
    await invalidate_admin_list_cache("vendors")
    await log_action(
        db,
        _.id,
        "vendor_hard_deleted",
        f"حذف دائمی مجموعه | مجموعه (id={vendor_id}) توسط ادمین حذف شد",
    )


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete user (with dependency check)",
)
async def hard_delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Permanently delete a user from the database.

    Raises 400 if the user has related data (vendors, bookings, etc.).
    """
    from sqlalchemy import func, select

    from app.models.booking import Booking
    from app.models.penalty import Penalty
    from app.models.review import Review

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد")
    await _guard_admin_deletion(db, actor=_, target=user)

    # Pre-check related data to avoid FK violations
    vendor_count = (
        await db.execute(
            select(func.count()).select_from(Vendor).where(Vendor.manager_id == user_id)
        )
    ).scalar_one()
    booking_count = (
        await db.execute(
            select(func.count()).select_from(Booking).where(Booking.user_id == user_id)
        )
    ).scalar_one()
    review_count = (
        await db.execute(select(func.count()).select_from(Review).where(Review.user_id == user_id))
    ).scalar_one()
    penalty_count = (
        await db.execute(
            select(func.count()).select_from(Penalty).where(Penalty.user_id == user_id)
        )
    ).scalar_one()

    if vendor_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"این کاربر مدیر {vendor_count} مجموعه است. ابتدا مجموعه‌ها را حذف کنید.",
        )
    if booking_count or review_count or penalty_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="این کاربر دارای رزرو، نظر یا جریمه است. ابتدا آن‌ها را حذف کنید.",
        )

    from app.services.cache_service import invalidate_admin_list_cache

    name = user.full_name
    delete_upload(user.avatar_url)
    await db.delete(user)
    await db.flush()
    await invalidate_admin_list_cache("users")
    await log_action(
        db, _.id, "user_deleted", f"حذف دائمی کاربر | '{name}' (id={user_id}) توسط ادمین حذف شد"
    )


@router.delete(
    "/users/{user_id}/force",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Force delete user and all related data",
)
async def force_delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Force-delete a user and all their associated data using raw SQL in FK-safe order."""
    from sqlalchemy import delete, select

    from app.models.booking import Booking
    from app.models.payment import Payment
    from app.models.penalty import Penalty
    from app.models.review import Review
    from app.models.time_slot import TimeSlot
    from app.models.vendor_image import VendorImage

    # Lookup user name first
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد")
    await _guard_admin_deletion(db, actor=_, target=user)
    name = user.full_name

    delete_upload(user.avatar_url)

    # Collect vendor IDs for this user
    vendor_ids = (
        (await db.execute(select(Vendor.id).where(Vendor.manager_id == user_id))).scalars().all()
    )

    # 1 ── Delete vendors and all data referencing them ───────────────
    for cid in vendor_ids:
        # a) Booking-related data for time slots in this vendor
        slot_ids = (
            (await db.execute(select(TimeSlot.id).where(TimeSlot.vendor_id == cid))).scalars().all()
        )
        if slot_ids:
            booking_ids = (
                (await db.execute(select(Booking.id).where(Booking.slot_id.in_(slot_ids))))
                .scalars()
                .all()
            )
            if booking_ids:
                await db.execute(delete(Payment).where(Payment.booking_id.in_(booking_ids)))
                await db.execute(delete(Penalty).where(Penalty.booking_id.in_(booking_ids)))
                await db.execute(delete(Review).where(Review.booking_id.in_(booking_ids)))
                await db.execute(delete(Booking).where(Booking.id.in_(booking_ids)))
            await db.execute(delete(TimeSlot).where(TimeSlot.vendor_id == cid))

        # b) Vendor images — delete files first, then remove records
        image_urls = (
            (await db.execute(select(VendorImage.url).where(VendorImage.vendor_id == cid)))
            .scalars()
            .all()
        )
        for url in image_urls:
            delete_upload(url)
        await db.execute(delete(VendorImage).where(VendorImage.vendor_id == cid))
        await db.execute(delete(Review).where(Review.vendor_id == cid))

    # c) The vendors themselves
    await db.execute(delete(Vendor).where(Vendor.manager_id == user_id))

    # 2 ── Delete user's own data (as a customer) ──────────────────
    own_booking_ids = (
        (await db.execute(select(Booking.id).where(Booking.user_id == user_id))).scalars().all()
    )
    if own_booking_ids:
        await db.execute(delete(Payment).where(Payment.booking_id.in_(own_booking_ids)))
        await db.execute(delete(Penalty).where(Penalty.booking_id.in_(own_booking_ids)))
        await db.execute(delete(Review).where(Review.booking_id.in_(own_booking_ids)))
        await db.execute(delete(Booking).where(Booking.id.in_(own_booking_ids)))

    await db.execute(delete(Review).where(Review.user_id == user_id))
    await db.execute(delete(Penalty).where(Penalty.user_id == user_id))

    # 3 ── Delete the user ─────────────────────────────────────────
    await db.execute(delete(User).where(User.id == user_id))
    await db.flush()

    from app.services.cache_service import invalidate_admin_list_cache

    await invalidate_admin_list_cache("users")
    await log_action(
        db,
        _.id,
        "user_deleted",
        f"حذف کاربر | '{name}' (id={user_id}) به همراه تمام اطلاعات مرتبط توسط ادمین حذف شد",
    )


@router.delete(
    "/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete review",
)
async def hard_delete_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Permanently delete a review from the database."""
    from app.services.review_service import ReviewService

    await ReviewService(db=db, current_user=_).delete_review(review_id)
    await log_action(
        db, _.id, "review_deleted", f"حذف دائمی نظر | نظر (id={review_id}) توسط ادمین حذف شد"
    )


# ── System settings ─────────────────────────────────────────────────


@router.get("/settings", response_model=list[SettingResponse], summary="List system settings")
async def list_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
    response: Response = None,
):
    from app.services.cache_service import cache_admin_list, get_cached_admin_list

    cache_params = {}
    cached = await get_cached_admin_list("settings", cache_params)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return [SettingResponse.model_validate(item) for item in cached]

    from sqlalchemy import select

    from app.models.setting import Setting

    result = await db.execute(select(Setting).order_by(Setting.key))
    settings = result.scalars().all()
    await cache_admin_list(
        "settings",
        cache_params,
        [SettingResponse.model_validate(s).model_dump(mode="json") for s in settings],
        ttl=120,
    )
    response.headers["X-Cache"] = "MISS"
    return settings


@router.put(
    "/settings/{setting_id}", response_model=SettingResponse, summary="Update system setting"
)
async def update_setting(
    setting_id: int,
    data: SettingUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.models.setting import Setting

    setting = await db.get(Setting, setting_id)
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="تنظیمات یافت نشد")
    old_value = setting.value
    setting.value = data.value
    await db.commit()
    await db.refresh(setting)
    from app.services.cache_service import invalidate_admin_list_cache

    await invalidate_admin_list_cache("settings")
    await log_action(
        db,
        _.id,
        "setting_updated",
        f"ویرایش تنظیمات | '{setting.key}': '{old_value}' → '{data.value}'",
    )
    return setting


@router.post("/settings/seed", status_code=status.HTTP_201_CREATED, summary="Seed default settings")
async def seed_default_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from sqlalchemy import select

    from app.core.legal_content import LEGAL_SETTINGS
    from app.models.setting import Setting

    defaults = [
        {"key": "platform_name", "value": "توپ‌سِت", "description": "نام پلتفرم"},
        {"key": "support_phone", "value": "۰۹۳۰-۶۸۵۳۳۶۳", "description": "شماره پشتیبانی"},
        {
            "key": "support_email",
            "value": "amirhossein.nasrollahi.main@gmail.com",
            "description": "ایمیل پشتیبانی",
        },
        {"key": "commission_percent", "value": "10", "description": "درصد کمیسیون"},
        {"key": "cancel_window_hours", "value": "48", "description": "مهلت کنسل کردن (ساعت)"},
        *LEGAL_SETTINGS,
        {"key": "faq_text", "value": "", "description": "متن سوالات متداول"},
        {
            "key": "pagination_limit",
            "value": "15",
            "description": "تعداد آیتم در هر صفحه برای جداول",
        },
        {
            "key": "login_hero_slides",
            "value": "[]",
            "description": "تصاویر صفحات ورود و ثبت‌نام (JSON array of URLs)",
        },
        {
            "key": "messenger_id",
            "value": "toopset_support",
            "description": "شناسه پیامرسان برای پشتیبانی",
        },
    ]
    count = 0
    for d in defaults:
        existing = await db.execute(select(Setting).where(Setting.key == d["key"]))
        if not existing.scalar_one_or_none():
            db.add(Setting(**d))
            count += 1
    await db.commit()
    from app.services.cache_service import invalidate_admin_list_cache

    await invalidate_admin_list_cache("settings")
    await log_action(db, _.id, "settings_seeded", f"مقداردهی تنظیمات | {count} تنظیم جدید اضافه شد")
    return {"seeded": count}


# ── Refunds, manager cancellations, and settlements ───────────────────


@router.get("/refunds", response_model=RefundListResponse, summary="List user refunds")
async def list_refunds(
    status_filter: str | None = Query(None, alias="status"),
    type_filter: str | None = Query(None, alias="type"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from sqlalchemy.orm import selectinload

    from app.models.refund import Refund

    stmt = select(Refund).options(
        selectinload(Refund.user),
        selectinload(Refund.vendor),
        selectinload(Refund.slot),
    )
    if status_filter:
        stmt = stmt.where(Refund.status == status_filter)
    if type_filter:
        stmt = stmt.where(Refund.type == type_filter)
    stmt = stmt.order_by(Refund.requested_at.desc())
    refunds = list((await db.execute(stmt)).scalars().all())
    return RefundListResponse(refunds=[_refund_response(r) for r in refunds], total=len(refunds))


@router.patch(
    "/refunds/{refund_id}",
    response_model=RefundResponse,
    summary="Update refund status",
)
async def update_refund_status(
    refund_id: int,
    data: RefundStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    from sqlalchemy.orm import selectinload

    from app.core.timezone import now_utc
    from app.models.refund import Refund, RefundStatus

    refund = (
        await db.execute(
            select(Refund)
            .options(
                selectinload(Refund.user), selectinload(Refund.vendor), selectinload(Refund.slot)
            )
            .where(Refund.id == refund_id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not refund:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="عودت یافت نشد")

    allowed_transitions = {
        RefundStatus.PENDING: {RefundStatus.APPROVED, RefundStatus.REJECTED},
        RefundStatus.APPROVED: {RefundStatus.PAID},
        RefundStatus.REJECTED: set(),
        RefundStatus.PAID: set(),
    }
    if data.status != refund.status and data.status not in allowed_transitions[refund.status]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"تغییر وضعیت عودت از {refund.status.value} به {data.status.value} مجاز نیست",
        )
    if data.status == RefundStatus.PAID and not (
        data.payment_tracking_code or refund.payment_tracking_code
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="برای ثبت عودت پرداخت‌شده، کد رهگیری الزامی است",
        )
    if data.status == RefundStatus.PAID and not refund.destination_card_encrypted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="کارت مقصد عودت هنوز توسط کاربر ثبت نشده است",
        )

    refund.status = data.status
    refund.admin_note = data.admin_note
    if data.payment_tracking_code:
        refund.payment_tracking_code = data.payment_tracking_code
    now = now_utc()
    if data.status == RefundStatus.APPROVED:
        refund.approved_at = now
    elif data.status == RefundStatus.PAID:
        if refund.approved_at is None:
            refund.approved_at = now
        refund.paid_at = now
    await db.flush()
    await log_action(
        db,
        current_user.id,
        "refund_status_updated",
        f"تغییر وضعیت عودت | refund={refund_id} → {data.status.value}",
    )
    return _refund_response(refund)


@router.get(
    "/refunds/{refund_id}/destination",
    response_model=RefundDestinationResponse,
    summary="Reveal refund payout destination for manual transfer",
)
async def reveal_refund_destination(
    refund_id: int,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    from app.models.refund import Refund

    refund = await db.get(Refund, refund_id)
    if not refund:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="عودت یافت نشد")
    if not refund.destination_card_encrypted or not refund.destination_card_masked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="کاربر هنوز کارت مقصد عودت را ثبت نکرده است",
        )
    await log_action(
        db,
        current_user.id,
        "refund_destination_revealed",
        f"مشاهده کارت مقصد عودت | refund={refund_id}",
    )
    response.headers["Cache-Control"] = "no-store"
    return RefundDestinationResponse(
        refund_id=refund.id,
        card_number=decrypt_card_number(refund.destination_card_encrypted),
        masked_card_number=refund.destination_card_masked,
        holder_name=refund.destination_card_holder_name,
    )


@router.get(
    "/manager-cancellations",
    response_model=list[SlotCancellationResponse],
    summary="List slots cancelled by managers",
)
async def list_manager_cancellations(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from sqlalchemy.orm import selectinload

    from app.models.slot_cancellation import SlotCancellation

    rows = list(
        (
            await db.execute(
                select(SlotCancellation)
                .options(selectinload(SlotCancellation.vendor))
                .order_by(SlotCancellation.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    manager_ids = {r.manager_id for r in rows}
    managers = {}
    if manager_ids:
        users = (await db.execute(select(User).where(User.id.in_(manager_ids)))).scalars().all()
        managers = {u.id: u for u in users}
    return [
        SlotCancellationResponse(
            id=r.id,
            slot_id=r.slot_id,
            booking_id=r.booking_id,
            vendor_id=r.vendor_id,
            manager_id=r.manager_id,
            affected_user_id=r.affected_user_id,
            affected_full_name=r.affected_full_name,
            affected_phone=r.affected_phone,
            reason=r.reason,
            release_slot=r.release_slot,
            online_paid_amount=float(r.online_paid_amount)
            if r.online_paid_amount is not None
            else None,
            site_cost_amount=float(r.site_cost_amount),
            sms_status=r.sms_status,
            notification_status=r.notification_status,
            review_status=r.review_status,
            created_at=r.created_at,
            vendor_name=r.vendor.name if r.vendor else "",
            manager_name=managers[r.manager_id].full_name if r.manager_id in managers else "",
        )
        for r in rows
    ]


@router.get(
    "/settlements",
    response_model=SettlementListResponse,
    summary="List all settlement requests",
)
async def list_admin_settlements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    from app.services.finance_service import FinanceService

    settlements, total = await FinanceService(db, current_user).list_settlements(manager_only=False)
    return SettlementListResponse(
        settlements=[_settlement_response(s) for s in settlements],
        total=total,
    )


@router.patch(
    "/settlements/{settlement_id}",
    response_model=SettlementResponse,
    summary="Update settlement status",
)
async def update_admin_settlement(
    settlement_id: int,
    data: SettlementStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    from app.services.finance_service import FinanceService

    settlement = await FinanceService(db, current_user).update_settlement_status(
        settlement_id,
        new_status=data.status,
        admin_note=data.admin_note,
        payment_tracking_code=data.payment_tracking_code,
    )
    await db.refresh(settlement, ["vendor", "manager"])
    await log_action(
        db,
        current_user.id,
        "settlement_status_updated",
        f"تغییر وضعیت تسویه | settlement={settlement_id} → {data.status.value}",
    )
    return _settlement_response(settlement)


@router.get(
    "/settlements/{settlement_id}",
    response_model=SettlementDetailResponse,
    summary="Get settlement items and accounting details",
)
async def get_admin_settlement_detail(
    settlement_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    from app.services.finance_service import FinanceService

    settlement = await FinanceService(db, current_user).get_settlement_detail(settlement_id)
    base = _settlement_response(settlement).model_dump()
    return SettlementDetailResponse(
        **base,
        items=[
            SettlementItemResponse(
                booking_id=item.booking_id,
                amount=float(item.amount),
                booking_status=item.booking.status.value,
                settlement_status=item.booking.settlement_status.value,
                slot_start_time=item.booking.slot.start_time,
                slot_end_time=item.booking.slot.end_time,
                customer_name=item.booking.customer_full_name
                or (item.booking.user.full_name if item.booking.user else ""),
            )
            for item in settlement.items
        ],
    )


@router.get(
    "/settlements/{settlement_id}/destination",
    response_model=SettlementDestinationResponse,
    summary="Reveal settlement payout destination for manual transfer",
)
async def reveal_settlement_destination(
    settlement_id: int,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    from app.models.settlement import Settlement

    settlement = await db.get(Settlement, settlement_id)
    if not settlement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="تسویه یافت نشد")
    if not settlement.destination_card_encrypted or not settlement.destination_card_masked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="کارت مقصد تسویه ثبت نشده است",
        )
    await log_action(
        db,
        current_user.id,
        "settlement_destination_revealed",
        f"مشاهده کارت مقصد تسویه | settlement={settlement_id}",
    )
    response.headers["Cache-Control"] = "no-store"
    return SettlementDestinationResponse(
        settlement_id=settlement.id,
        card_number=decrypt_card_number(settlement.destination_card_encrypted),
        masked_card_number=settlement.destination_card_masked,
        holder_name=settlement.destination_card_holder_name,
    )


# ── Hero image management ──────────────────────────────────────────────


_HERO_SETTING_KEY = "login_hero_slides"


def _save_hero_image(content: bytes, original_filename: str) -> str:
    """Save a hero image to frontend/public/uploads/hero/ and return the relative URL."""
    ext = validate_upload_content(content, original_filename)
    _HERO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = _HERO_UPLOAD_DIR / filename
    filepath.write_bytes(content)
    return f"/uploads/hero/{filename}"


def _delete_hero_image(relative_url: str | None) -> bool:
    """Delete a hero image by its URL (e.g. /uploads/hero/uuid.svg)."""
    if not relative_url:
        return False
    try:
        # Strip leading /uploads/hero/ to get just the filename
        path = relative_url
        if "://" in path:
            from urllib.parse import urlparse

            path = urlparse(path).path
        rel = path.lstrip("/")
        if rel.startswith("uploads/hero/"):
            rel = rel[len("uploads/hero/") :]
        # Settings are editable and may contain arbitrary strings. Do not let
        # a crafted value escape the dedicated hero directory on deletion.
        if not rel or Path(rel).name != rel:
            return False
        upload_root = _HERO_UPLOAD_DIR.resolve()
        filepath = (upload_root / rel).resolve()
        if filepath.parent != upload_root:
            return False
        if filepath.exists() and filepath.is_file():
            filepath.unlink()
            return True
        return False
    except OSError:
        return False


@router.post("/hero-images/upload", summary="Upload hero image for auth pages")
async def upload_hero_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Upload a hero image for login/register pages and append to the setting."""
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="حجم فایل بیش از حد مجاز است")

    ext = Path(file.filename or "image.jpg").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"نوع فایل {ext} مجاز نیست")

    try:
        relative_url = _save_hero_image(content, file.filename or "image.jpg")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Read or create the setting
    setting = (
        await db.execute(select(Setting).where(Setting.key == _HERO_SETTING_KEY))
    ).scalar_one_or_none()

    if not setting:
        setting = Setting(
            key=_HERO_SETTING_KEY,
            value=json.dumps([relative_url]),
            description="تصاویر صفحات ورود و ثبت‌نام",
        )
        db.add(setting)
    else:
        try:
            images = json.loads(setting.value)
            if not isinstance(images, list):
                images = []
        except (json.JSONDecodeError, ValueError):
            images = []
        images.append(relative_url)
        setting.value = json.dumps(images)

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        _delete_hero_image(relative_url)
        raise
    await db.refresh(setting)
    from app.services.cache_service import invalidate_admin_list_cache

    await invalidate_admin_list_cache("settings")
    await log_action(
        db,
        _.id,
        "hero_image_uploaded",
        f"آپلود عکس | عکس صفحه ورود/ثبت‌نام ذخیره شد: {relative_url}",
    )
    return {"urls": json.loads(setting.value)}


@router.delete("/settings/{setting_id}/hero-images/{index}", summary="Delete a hero image by index")
async def delete_hero_image(
    setting_id: int,
    index: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Remove a hero image from the list and delete the underlying file."""
    setting = await db.get(Setting, setting_id)
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="تنظیمات یافت نشد")

    try:
        images = json.loads(setting.value)
        if not isinstance(images, list) or index < 0 or index >= len(images):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="تصویر یافت نشد")
        removed = images.pop(index)
        setting.value = json.dumps(images)
        await db.commit()
        await db.refresh(setting)
        # Commit the authoritative setting first. An unlink failure can leave
        # an orphan, but cannot leave the database pointing at a deleted file.
        _delete_hero_image(removed)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="فرمت داده نامعتبر است")

    from app.services.cache_service import invalidate_admin_list_cache

    await invalidate_admin_list_cache("settings")
    await log_action(
        db,
        _.id,
        "hero_image_deleted",
        f"حذف عکس | تصویر صفحه ورود/ثبت‌نام حذف شد: {removed}",
    )
    return {"urls": json.loads(setting.value)}


class SeedAdminRequest(BaseModel):
    phone: str
    password: str
    full_name: str = "مدیر سیستم"


@router.post("/seed-admin", status_code=status.HTTP_201_CREATED, summary="Create initial admin")
async def seed_admin(
    data: SeedAdminRequest,
    x_bootstrap_secret: str | None = Header(default=None, alias="X-Bootstrap-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Create the first admin user. Only works when no admin exists yet.
    Once an admin is created, use the admin dashboard to manage users."""
    from sqlalchemy import func, select

    if not settings.is_development_or_bootstrap or not settings.bootstrap_admin_secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="این مسیر در محیط فعلی فعال نیست",
        )
    if not x_bootstrap_secret or not hmac.compare_digest(
        x_bootstrap_secret, settings.bootstrap_admin_secret
    ):
        await log_action(
            db,
            None,
            "seed_admin_failed",
            "تلاش ناموفق برای bootstrap ادمین | secret نامعتبر",
            severity="WARNING",
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="دسترسی غیرمجاز")

    phone = normalize_phone(data.phone)
    repo = UserRepository(db)

    # Serialize first-admin bootstrap so two concurrent requests cannot both
    # observe admin_count=0 before inserting.
    await db.execute(text("SELECT pg_advisory_xact_lock(9021001)"))

    admin_count = (
        await db.execute(select(func.count(User.id)).where(User.role == "admin"))
    ).scalar_one()

    if admin_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="یک ادمین قبلاً وجود دارد. از طریق داشبورد ادمین کاربر جدید ایجاد کنید.",
        )

    existing = await repo.get_by_phone(phone)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="این شماره تلفن قبلاً ثبت شده است",
        )

    from app.models.user import UserRole

    try:
        user = User(
            phone=phone,
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(user)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="این شماره تلفن قبلاً ثبت شده است",
        )
    await db.refresh(user)
    await log_action(
        db,
        user.id,
        "seed_admin_created",
        f"اولین ادمین با شماره {phone} ساخته شد",
        severity="WARNING",
    )
    await db.commit()

    return {
        "id": user.id,
        "phone": user.phone,
        "full_name": user.full_name,
        "role": user.role.value,
    }


# ── Admin session management ─────────────────────────────────────────


@router.post(
    "/users/{user_id}/revoke-sessions",
    status_code=status.HTTP_200_OK,
    summary="Revoke all sessions for a user",
)
async def admin_revoke_user_sessions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Revoke all refresh tokens and bump token_version for a target user."""
    from app.repositories.refresh_token_repo import RefreshTokenRepo
    from app.repositories.user_repo import UserRepository
    from app.services.auth_service import AuthService

    repo = UserRepository(db)
    refresh_repo = RefreshTokenRepo(db)
    service = AuthService(repo, refresh_repo)
    count = await service.admin_revoke_user_sessions(db, _admin, user_id)
    return {"revoked_sessions": count}
