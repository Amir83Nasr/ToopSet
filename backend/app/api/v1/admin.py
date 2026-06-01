from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.core.logger import log_action
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


@router.post("/notifications/broadcast")
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
    action: str
    details: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class LogListResponse(BaseModel):
    logs: list[LogResponse]
    total: int


@router.get("/logs", response_model=LogListResponse)
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
    repo = LogRepo(db)
    logs, total = await repo.list(
        skip=skip,
        limit=limit,
        action=action,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
    )
    return LogListResponse(logs=[LogResponse.model_validate(log) for log in logs], total=total)


@router.delete("/logs/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_logs(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    repo = LogRepo(db)
    await repo.clear_all()


@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    repo = LogRepo(db)
    await repo.delete_by_id(log_id)


# ── Court approval (pending courts) ──────────────────────────────────


class CourtApprovalResponse(BaseModel):
    id: int
    name: str
    manager_name: str
    sport_types: list[str]
    address: str
    capacity: int
    created_at: datetime


@router.get("/pending-courts")
async def list_pending_courts(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from sqlalchemy import select

    result = await db.execute(select(Court).where(Court.is_active == False))
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
    return {"courts": courts_data, "total": len(courts_data)}


@router.post("/courts/{court_id}/approve", response_model=CourtResponse)
async def approve_court(
    court_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.services.court_service import CourtService

    service = CourtService(db=db, current_user=_)
    result = await service.toggle_court_status(court_id, is_active=True)
    await log_action(
        db, _.id, "court_approved", f"تایید مجموعه | مجموعه (id={court_id}) توسط ادمین تایید شد"
    )
    return result


@router.post("/courts/{court_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_court(
    court_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    repo = CourtRepo(db)
    court = await repo.get_by_id(court_id)
    if not court:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
    name = court.name
    await repo.delete(court)
    await log_action(
        db, _.id, "court_rejected", f"رد مجموعه | '{name}' (id={court_id}) توسط ادمین رد شد"
    )


# ── Hard-delete endpoints ───────────────────────────────────────────


@router.delete("/courts/{court_id}", status_code=status.HTTP_204_NO_CONTENT)
async def hard_delete_court(
    court_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Permanently delete a court from the database."""
    repo = CourtRepo(db)
    court = await repo.get_by_id(court_id)
    if not court:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
    await repo.delete(court)
    await log_action(
        db, _.id, "court_deleted", f"حذف دائمی مجموعه | مجموعه (id={court_id}) توسط ادمین حذف شد"
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

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
            detail="این کاربر مدیر مجموعه است. ابتدا مجموعه‌ها را حذف کنید.",
        )
    if booking_count or review_count or penalty_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="این کاربر دارای رزرو، نظر یا جریمه است. ابتدا آن‌ها را حذف کنید.",
        )

    name = user.full_name
    await db.delete(user)
    await db.commit()
    await log_action(
        db, _.id, "user_deleted", f"حذف دائمی کاربر | '{name}' (id={user_id}) توسط ادمین حذف شد"
    )


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def hard_delete_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Permanently delete a review from the database."""
    repo = ReviewRepo(db)
    review = await repo.get_by_id(review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    await repo.delete(review)
    await log_action(
        db, _.id, "review_deleted", f"حذف دائمی نظر | نظر (id={review_id}) توسط ادمین حذف شد"
    )


# ── System settings ─────────────────────────────────────────────────


@router.get("/settings", response_model=list[SettingResponse])
async def list_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from sqlalchemy import select

    from app.models.setting import Setting

    result = await db.execute(select(Setting).order_by(Setting.key))
    return result.scalars().all()


@router.put("/settings/{setting_id}", response_model=SettingResponse)
async def update_setting(
    setting_id: int,
    data: SettingUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.models.setting import Setting

    setting = await db.get(Setting, setting_id)
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setting not found")
    old_value = setting.value
    setting.value = data.value
    await db.commit()
    await db.refresh(setting)
    await log_action(
        db,
        _.id,
        "setting_updated",
        f"Setting '{setting.key}' changed: '{old_value}' → '{data.value}'",
    )
    return setting


@router.post("/settings/seed", status_code=status.HTTP_201_CREATED)
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
    ]
    count = 0
    for d in defaults:
        existing = await db.execute(select(Setting).where(Setting.key == d["key"]))
        if not existing.scalar_one_or_none():
            db.add(Setting(**d))
            count += 1
    await db.commit()
    return {"seeded": count}
