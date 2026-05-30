from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.log_repo import LogRepo


async def log_action(
    db: AsyncSession,
    user_id: int | None,
    action: str,
    details: str | None = None,
) -> None:
    """Convenience helper — create a system log entry."""
    repo = LogRepo(db)
    await repo.create(user_id=user_id, action=action, details=details)
