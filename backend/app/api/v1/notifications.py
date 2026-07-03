from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.pagination import decode_cursor, encode_cursor
from app.models.user import User
from app.repositories.notification_repo import NotificationRepo
from app.schemas.notification import NotificationListResponse, NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse, summary="List notifications")
async def list_notifications(
    cursor: str | None = Query(None, description="Cursor for next page"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    search: str | None = Query(None),
    notification_type: str | None = Query(None, alias="type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    response: Response = None,
):
    from app.services.cache_service import cache_admin_list, get_cached_admin_list

    cursor_id = int(decode_cursor(cursor)) if cursor else None
    cache_params = {
        "cursor": cursor,
        "user_id": current_user.id,
        "skip": skip,
        "limit": limit,
        "unread_only": unread_only,
        "search": search,
        "type": notification_type,
    }
    cached = await get_cached_admin_list("notifications", cache_params)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return NotificationListResponse.model_validate(cached)

    repo = NotificationRepo(db)
    notifications, total = await repo.list_by_user(
        current_user.id,
        after_id=cursor_id,
        skip=skip,
        limit=limit,
        unread_only=unread_only,
        search=search,
        type_filter=notification_type,
    )
    next_cursor = None
    if notifications and len(notifications) == limit:
        next_cursor = encode_cursor(notifications[-1].id)
    result = NotificationListResponse(
        notifications=[NotificationResponse.model_validate(n) for n in notifications],
        total=total,
        next_cursor=next_cursor,
    )

    await cache_admin_list("notifications", cache_params, result.model_dump(mode="json"))
    response.headers["X-Cache"] = "MISS"
    return result


@router.get("/unread-count", summary="Unread notification count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = NotificationRepo(db)
    count = await repo.count_unread(current_user.id)
    return {"count": count}


@router.post(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark notification as read",
)
async def mark_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.cache_service import invalidate_admin_list_cache

    repo = NotificationRepo(db)
    n = await repo.mark_read_for_user(notification_id, current_user.id)
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="اعلان یافت نشد")
    await invalidate_admin_list_cache("notifications")
    return NotificationResponse.model_validate(n)


@router.post("/read-all", summary="Mark all notifications as read")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.cache_service import invalidate_admin_list_cache

    repo = NotificationRepo(db)
    await repo.mark_all_read(current_user.id)
    await invalidate_admin_list_cache("notifications")
    return {"success": True}
