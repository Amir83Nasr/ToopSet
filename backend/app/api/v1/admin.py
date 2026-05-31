from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.core.logger import log_action
from app.core.security import hash_password
from app.models.court import Court
from app.models.user import User
from app.repositories.court_repo import CourtRepo
from app.repositories.log_repo import LogRepo
from app.repositories.notification_repo import NotificationRepo
from app.repositories.review_repo import ReviewRepo
from app.repositories.user_repo import UserRepository
from app.schemas.court import CourtResponse
from app.schemas.setting import SettingResponse, SettingUpdateRequest
from app.schemas.user import AdminCreateUserRequest, AdminCreateUserResponse

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
    await log_action(db, _.id, "broadcast", f"Broadcast to {count} users: {data.message}")
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
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    repo = LogRepo(db)
    logs, total = await repo.list(skip=skip, limit=limit, action=action, user_id=user_id)
    return LogListResponse(logs=[LogResponse.model_validate(log) for log in logs], total=total)


# ── User management ────────────────────────────────────────────────


@router.post("/users", response_model=AdminCreateUserResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    data: AdminCreateUserRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    repo = UserRepository(db)
    existing = await repo.get_by_phone(data.phone)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="کاربر با این شماره وجود دارد")

    password_hash = hash_password(data.password)
    user = await repo.create(
        phone=data.phone,
        password_hash=password_hash,
        full_name=data.full_name,
        role=data.role.value,
    )
    await log_action(
        db, _.id, "user_created",
        f"User '{data.full_name}' (id={user.id}) role={data.role.value}",
    )
    return user


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

    result = await db.execute(
        select(Court).where(Court.is_active == False, Court.is_deleted == False)
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
    await log_action(db, _.id, "court_approved", f"Court (id={court_id}) approved")
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
    await log_action(db, _.id, "court_rejected", f"Court '{name}' (id={court_id}) rejected")


# ── Soft-delete endpoints ───────────────────────────────────────────


@router.delete("/courts/{court_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_court(
    court_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Soft-delete a court (sets is_deleted = True)."""
    repo = CourtRepo(db)
    court = await repo.get_by_id(court_id)
    if not court:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Court not found")
    await repo.delete(court)
    await log_action(db, _.id, "court_deleted", f"Court (id={court_id}) soft-deleted")


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Soft-delete a user (sets is_deleted = True)."""
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.soft_delete()
    await db.commit()
    await log_action(db, _.id, "user_deleted", f"User (id={user_id}) soft-deleted")


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Soft-delete a review (sets is_deleted = True)."""
    repo = ReviewRepo(db)
    review = await repo.get_by_id(review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    await repo.delete(review)
    await log_action(db, _.id, "review_deleted", f"Review (id={review_id}) soft-deleted")


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
        db, _.id, "setting_updated",
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
        {"key": "support_email", "value": "amirhossein.nasrollahi.main@gmail.com", "description": "ایمیل پشتیبانی"},
        {"key": "commission_percent", "value": "10", "description": "درصد کمیسیون"},
        {"key": "cancel_window_hours", "value": "24", "description": "مهلت کنسل کردن (ساعت)"},
    ]
    count = 0
    for d in defaults:
        existing = await db.execute(select(Setting).where(Setting.key == d["key"]))
        if not existing.scalar_one_or_none():
            db.add(Setting(**d))
            count += 1
    await db.commit()
    return {"seeded": count}
