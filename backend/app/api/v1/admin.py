from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.user import User
from app.repositories.court_repo import CourtRepo
from app.repositories.log_repo import LogRepo
from app.repositories.notification_repo import NotificationRepo
from app.repositories.review_repo import ReviewRepo
from app.repositories.user_repo import UserRepository

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
