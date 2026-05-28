from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.contact import ContactMessage
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactResponse

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def submit_contact(
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


@router.get("/admin", response_model=list[ContactResponse])
async def list_contact_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(ContactMessage).order_by(ContactMessage.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


@router.delete("/admin/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    msg = await db.get(ContactMessage, message_id)
    if msg:
        await db.delete(msg)
        await db.commit()
    return None
