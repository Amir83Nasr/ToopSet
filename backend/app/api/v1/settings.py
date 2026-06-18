"""Public settings endpoints — any authenticated user can read settings by key."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.setting import Setting
from app.models.user import User

router = APIRouter(prefix="/settings", tags=["settings"])


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
        raise HTTPException(status_code=404, detail="تنظیمات یافت نشد")

    return setting
