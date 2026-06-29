from __future__ import annotations

from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.log import Log


class LogRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        user_id: int | None,
        action: str,
        details: str | None = None,
        severity: str = "INFO",
        request_id: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> Log:
        log = Log(
            user_id=user_id,
            action=action,
            details=details,
            severity=severity,
            request_id=request_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)
        return log

    async def delete_by_id(self, log_id: int) -> None:
        await self.db.execute(delete(Log).where(Log.id == log_id))
        await self.db.flush()

    async def clear_all(self) -> None:
        await self.db.execute(delete(Log))
        await self.db.flush()

    async def list(
        self,
        *,
        after_id: int | None = None,
        skip: int = 0,
        limit: int = 50,
        action: str | None = None,
        user_id: int | None = None,
        severity: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> tuple[list[Log], int]:
        count_q = select(func.count(Log.id))
        if action:
            count_q = count_q.where(Log.action == action)
        if user_id is not None:
            count_q = count_q.where(Log.user_id == user_id)
        if severity is not None:
            count_q = count_q.where(Log.severity == severity)
        if date_from is not None:
            count_q = count_q.where(Log.created_at >= date_from)
        if date_to is not None:
            count_q = count_q.where(Log.created_at <= date_to)
        total = (await self.db.execute(count_q)).scalar_one()

        query = select(Log).options(joinedload(Log.user)).order_by(Log.created_at.desc())
        if after_id is not None:
            query = query.where(Log.id > after_id)
        if action:
            query = query.where(Log.action == action)
        if user_id is not None:
            query = query.where(Log.user_id == user_id)
        if severity is not None:
            query = query.where(Log.severity == severity)
        if date_from is not None:
            query = query.where(Log.created_at >= date_from)
        if date_to is not None:
            query = query.where(Log.created_at <= date_to)
        if after_id is not None:
            result = await self.db.execute(query.limit(limit))
        else:
            result = await self.db.execute(query.offset(skip).limit(limit))
        logs = list(result.unique().scalars().all())
        return logs, total
