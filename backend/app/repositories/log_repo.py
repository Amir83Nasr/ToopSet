from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.log import Log


class LogRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, user_id: int | None, action: str, details: str | None = None) -> Log:
        log = Log(user_id=user_id, action=action, details=details)
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log

    async def list(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        action: str | None = None,
        user_id: int | None = None,
    ) -> tuple[list[Log], int]:
        query = select(Log)
        count_q = select(func.count(Log.id))
        if action:
            query = query.where(Log.action == action)
            count_q = count_q.where(Log.action == action)
        if user_id is not None:
            query = query.where(Log.user_id == user_id)
            count_q = count_q.where(Log.user_id == user_id)
        query = query.order_by(Log.created_at.desc())
        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        logs = list(result.scalars().all())
        return logs, total
