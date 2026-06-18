from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.core.logger import log_action
from app.core.security import hash_password
from app.core.upload import delete_upload
from app.models.court import Court
from app.models.user import User
from app.repositories.court_repo import CourtRepo
from app.repositories.log_repo import LogRepo
from app.repositories.notification_repo import NotificationRepo
from app.repositories.review_repo import ReviewRepo
from app.repositories.user_repo import UserRepository
from app.schemas.court import CourtResponse
from app.schemas.setting import SettingResponse, SettingUpdateRequest

router = APIRouter(prefix="/admin", tags=["admin"])


class BroadcastRequest(BaseModel):
    type: str = "broadcast"
    message: str


@router.post("/notifications/broadcast", summary="Send broadcast notification")
async def broadcast_notification(
    data: BroadcastRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    repo = NotificationRepo(db)
    count = await repo.create_for_all_users(type_=data.type, message=data.message)
    await log_action(
        db, _.id, "broadcast", f"اعلان همگانی | ارسال به {count} کاربر: {data.message[:100]}"
    )
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


@router.get("/logs", response_model=LogListResponse, summary="View audit logs")
async def list_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    action: str | None = None,
    user_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import cache_admin_list, get_cached_admin_list

    cache_params = {
        "skip": skip,
        "limit": limit,
        "action": action,
        "user_id": user_id,
        "date_from": str(date_from) if date_from else None,
        "date_to": str(date_to) if date_to else None,
    }
    cached = await get_cached_admin_list("logs", cache_params)
    if cached is not None:
        return LogListResponse.model_validate(cached)

    repo = LogRepo(db)
    logs, total = await repo.list(
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

    await cache_admin_list(
        "logs",
        cache_params,
        {"logs": [r.model_dump(mode="json") for r in log_responses], "total": total},
        ttl=30,
    )
    return LogListResponse(logs=log_responses, total=total)


@router.delete("/logs/clear", status_code=status.HTTP_204_NO_CONTENT, summary="Clear all logs")
async def clear_logs(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import invalidate_admin_list_cache

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

    repo = LogRepo(db)
    await repo.delete_by_id(log_id)
    await invalidate_admin_list_cache("logs")


# ── Court approval (pending courts) ──────────────────────────────────


class CourtApprovalResponse(BaseModel):
    id: int
    name: str
    manager_name: str
    sport_types: list[str]
    address: str
    capacity: int
    created_at: datetime


@router.get("/pending-courts", summary="Pending court approvals")
async def list_pending_courts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from sqlalchemy import func, select

    from app.services.cache_service import cache_admin_list, get_cached_admin_list

    cache_params = {"skip": skip, "limit": limit}
    cached = await get_cached_admin_list("pending_courts", cache_params)
    if cached is not None:
        return cached

    count_q = select(func.count(Court.id)).where(Court.is_active == False)
    total = (await db.execute(count_q)).scalar_one()

    result = await db.execute(
        select(Court)
        .where(Court.is_active == False)
        .order_by(Court.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    courts = result.scalars().all()

    courts_data = []
    for c in courts:
        manager = await db.get(User, c.manager_id)
        courts_data.append(
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

    result_data = {"courts": courts_data, "total": total}
    await cache_admin_list("pending_courts", cache_params, result_data)
    return result_data


@router.post("/courts/{court_id}/approve", response_model=CourtResponse, summary="Approve court")
async def approve_court(
    court_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import invalidate_admin_list_cache
    from app.services.court_service import CourtService

    service = CourtService(db=db, current_user=_)
    result = await service.toggle_court_status(court_id, is_active=True)
    await invalidate_admin_list_cache("pending_courts")
    await log_action(
        db, _.id, "court_approved", f"تایید مجموعه | مجموعه (id={court_id}) توسط ادمین تایید شد"
    )
    return result


@router.post(
    "/courts/{court_id}/reject", status_code=status.HTTP_204_NO_CONTENT, summary="Reject court"
)
async def reject_court(
    court_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import invalidate_admin_list_cache

    repo = CourtRepo(db)
    court = await repo.get_by_id(court_id)
    if not court:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
    name = court.name
    for img in court.court_images or []:
        delete_upload(img.url)
    await repo.delete(court)
    await invalidate_admin_list_cache("pending_courts")
    await log_action(
        db, _.id, "court_rejected", f"رد مجموعه | '{name}' (id={court_id}) توسط ادمین رد شد"
    )


# ── Hard-delete endpoints ───────────────────────────────────────────


@router.delete(
    "/courts/{court_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Permanently delete court"
)
async def hard_delete_court(
    court_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Permanently delete a court from the database."""
    repo = CourtRepo(db)
    court = await repo.get_by_id(court_id)
    if not court:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
    for img in court.court_images or []:
        delete_upload(img.url)
    await repo.delete(court)
    await log_action(
        db,
        _.id,
        "court_hard_deleted",
        f"حذف دائمی مجموعه | مجموعه (id={court_id}) توسط ادمین حذف شد",
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

    Raises 400 if the user has related data (courts, bookings, etc.).
    """
    from sqlalchemy import func, select

    from app.models.booking import Booking
    from app.models.penalty import Penalty
    from app.models.review import Review

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد")

    # Pre-check related data to avoid FK violations
    court_count = (
        await db.execute(select(func.count()).select_from(Court).where(Court.manager_id == user_id))
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

    if court_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"این کاربر مدیر {court_count} مجموعه است. ابتدا مجموعه‌ها را حذف کنید.",
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
    await db.commit()
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
    from app.models.court_image import CourtImage
    from app.models.payment import Payment
    from app.models.penalty import Penalty
    from app.models.review import Review
    from app.models.time_slot import TimeSlot

    # Lookup user name first
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد")
    name = user.full_name

    delete_upload(user.avatar_url)

    # Collect court IDs for this user
    court_ids = (
        (await db.execute(select(Court.id).where(Court.manager_id == user_id))).scalars().all()
    )

    # 1 ── Delete courts and all data referencing them ───────────────
    for cid in court_ids:
        # a) Booking-related data for time slots in this court
        slot_ids = (
            (await db.execute(select(TimeSlot.id).where(TimeSlot.court_id == cid))).scalars().all()
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
            await db.execute(delete(TimeSlot).where(TimeSlot.court_id == cid))

        # b) Court images — delete files first, then remove records
        image_urls = (
            (await db.execute(select(CourtImage.url).where(CourtImage.court_id == cid)))
            .scalars()
            .all()
        )
        for url in image_urls:
            delete_upload(url)
        await db.execute(delete(CourtImage).where(CourtImage.court_id == cid))
        await db.execute(delete(Review).where(Review.court_id == cid))

    # c) The courts themselves
    await db.execute(delete(Court).where(Court.manager_id == user_id))

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
    await db.commit()

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
    repo = ReviewRepo(db)
    review = await repo.get_by_id(review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="نظر یافت نشد")
    await repo.delete(review)
    await log_action(
        db, _.id, "review_deleted", f"حذف دائمی نظر | نظر (id={review_id}) توسط ادمین حذف شد"
    )


# ── System settings ─────────────────────────────────────────────────


@router.get("/settings", response_model=list[SettingResponse], summary="List system settings")
async def list_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from sqlalchemy import select

    from app.models.setting import Setting

    result = await db.execute(select(Setting).order_by(Setting.key))
    return result.scalars().all()


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
        {"key": "cancel_window_hours", "value": "24", "description": "مهلت کنسل کردن (ساعت)"},
        {"key": "rules_text", "value": "", "description": "متن قوانین و مقررات"},
        {"key": "faq_text", "value": "", "description": "متن سوالات متداول"},
        {
            "key": "pagination_limit",
            "value": "15",
            "description": "تعداد آیتم در هر صفحه برای جداول",
        },
    ]
    count = 0
    for d in defaults:
        existing = await db.execute(select(Setting).where(Setting.key == d["key"]))
        if not existing.scalar_one_or_none():
            db.add(Setting(**d))
            count += 1
    await db.commit()
    await log_action(db, _.id, "settings_seeded", f"مقداردهی تنظیمات | {count} تنظیم جدید اضافه شد")
    return {"seeded": count}


class SeedAdminRequest(BaseModel):
    phone: str
    password: str
    full_name: str = "مدیر سیستم"


@router.post("/seed-admin", status_code=status.HTTP_201_CREATED, summary="Create initial admin")
async def seed_admin(
    data: SeedAdminRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create the first admin user. Only works when no admin exists yet.
    Once an admin is created, use the admin dashboard to manage users."""
    from sqlalchemy import func, select

    repo = UserRepository(db)
    admin_count = (
        await db.execute(select(func.count(User.id)).where(User.role == "admin"))
    ).scalar_one()

    if admin_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="یک ادمین قبلاً وجود دارد. از طریق داشبورد ادمین کاربر جدید ایجاد کنید.",
        )

    existing = await repo.get_by_phone(data.phone)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="این شماره تلفن قبلاً ثبت شده است",
        )

    from app.models.user import UserRole

    user = User(
        phone=data.phone,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "id": user.id,
        "phone": user.phone,
        "full_name": user.full_name,
        "role": user.role.value,
    }
