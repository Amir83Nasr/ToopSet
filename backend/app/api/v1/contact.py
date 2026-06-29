from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.core.rate_limiter import limiter
from app.models.contact import ContactMessage
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactResponse

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post(
    "",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit contact message",
)
@limiter.limit("5/minute")
async def submit_contact(
    request: Request,
    data: ContactCreate,
    db: AsyncSession = Depends(get_db),
):
    msg = ContactMessage(
        name=data.name,
        email=data.email,
        phone=data.phone,
        subject=data.subject,
        message=data.message,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


# ── Admin endpoints ──────────────────────────────────────────────


@router.get("/admin", response_model=list[ContactResponse], summary="List contact messages (admin)")
async def list_contact_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
    response: Response = None,
):
    from app.services.cache_service import cache_admin_list, get_cached_admin_list

    cache_params = {"skip": skip, "limit": limit}
    cached = await get_cached_admin_list("contact_messages", cache_params)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return [ContactResponse.model_validate(item) for item in cached]

    result = await db.execute(
        select(ContactMessage).order_by(ContactMessage.created_at.desc()).offset(skip).limit(limit)
    )
    messages = list(result.scalars().all())
    await cache_admin_list(
        "contact_messages",
        cache_params,
        [ContactResponse.model_validate(m).model_dump(mode="json") for m in messages],
    )
    response.headers["X-Cache"] = "MISS"
    return messages


@router.delete(
    "/admin/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete contact message (admin)",
)
async def delete_contact_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from app.services.cache_service import invalidate_admin_list_cache

    msg = await db.get(ContactMessage, message_id)
    if msg:
        await db.delete(msg)
        await db.commit()
    await invalidate_admin_list_cache("contact_messages")
    return None
