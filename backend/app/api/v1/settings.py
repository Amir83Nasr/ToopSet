"""Public settings endpoints — any authenticated user can read settings by key."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.setting import Setting
from app.models.user import User

router = APIRouter(prefix="/settings", tags=["settings"])

_PUBLIC_KEYS = {"rules_text", "privacy_text"}

_CONTACT_KEYS = {"support_phone", "support_email", "messenger_id"}

_DEFAULT_SETTING_VALUES = {
    "pagination_limit": "15",
}


@router.get("/public/hero-slides", summary="Get hero images for auth pages (public)")
async def get_hero_images_public(
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — no authentication required.

    Returns the list of hero image URLs displayed on login/register pages.
    The value is either a JSON array of strings (URLs) or a JSON array of
    objects with ``text``/``subtitle`` (legacy text slides).
    """
    result = await db.execute(select(Setting).where(Setting.key == "login_hero_slides"))
    setting = result.scalar_one_or_none()
    if not setting or not setting.value:
        return []
    try:
        return json.loads(setting.value)
    except (json.JSONDecodeError, ValueError):
        return []


@router.get("/public/contact", summary="Get contact info (phone, email, messenger) — public")
async def get_public_contact_info(
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — no authentication required.

    Returns the contact settings as a flat JSON object:
    ``{ "support_phone": "...", "support_email": "...", "messenger_id": "..." }``
    Missing keys are omitted from the result.
    """
    result = await db.execute(select(Setting).where(Setting.key.in_(_CONTACT_KEYS)))
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}


@router.get(
    "/public/text/{key}", summary="Get public text setting by key (rules_text, privacy_text)"
)
async def get_public_text_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — no authentication required.

    Returns the value of ``rules_text`` or ``privacy_text`` as a JSON object
    with ``key``, ``value``, and ``updated_at`` fields. The value is a
    JSON-encoded list of strings (e.g. ``["item 1", "item 2"]``).
    """
    if key not in _PUBLIC_KEYS:
        raise HTTPException(status_code=404, detail="تنظیمات یافت نشد")
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    if not setting or not setting.value:
        return {"key": key, "value": "[]", "updated_at": None}
    return {
        "key": key,
        "value": setting.value,
        "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
    }


@router.get("/{key}", summary="Read a setting by key")
async def get_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return the value of a system setting by key.

    Any authenticated user can read settings.
    Returns 404 if the key doesn't exist.
    """
    setting = (await db.execute(select(Setting).where(Setting.key == key))).scalar_one_or_none()

    if not setting:
        default_value = _DEFAULT_SETTING_VALUES.get(key)
        if default_value is not None:
            now = datetime.now(timezone.utc)
            return {
                "id": 0,
                "key": key,
                "value": default_value,
                "description": "تنظیم پیش‌فرض سیستم",
                "created_at": now,
                "updated_at": now,
            }
        raise HTTPException(status_code=404, detail="تنظیمات یافت نشد")

    return setting
