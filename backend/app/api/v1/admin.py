from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.user import User
from app.repositories.log_repo import LogRepo
from app.repositories.notification_repo import NotificationRepo

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
