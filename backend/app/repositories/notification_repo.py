from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_user(
        self,
        user_id: int,
        *,
        skip: int = 0,
        limit: int = 20,
        unread_only: bool = False,
    ) -> tuple[list[Notification], int]:
        query = select(Notification).where(Notification.user_id == user_id)
        count_q = select(func.count(Notification.id)).where(Notification.user_id == user_id)

        if unread_only:
            query = query.where(Notification.is_read == False)
            count_q = count_q.where(Notification.is_read == False)

        query = query.order_by(Notification.created_at.desc())

        total = (await self.db.execute(count_q)).scalar_one()
        result = await self.db.execute(query.offset(skip).limit(limit))
        notifications = list(result.scalars().all())
        return notifications, total

    async def create_for_all_users(self, type_: str, message: str) -> int:
        from sqlalchemy import select

        from app.models.user import User

        result = await self.db.execute(select(User.id))
        user_ids = [row[0] for row in result.all()]
        for uid in user_ids:
            n = Notification(user_id=uid, type=type_, message=message)
            self.db.add(n)
        await self.db.commit()
        return len(user_ids)

    async def create(self, user_id: int, type_: str, message: str) -> Notification:
        n = Notification(user_id=user_id, type=type_, message=message)
        self.db.add(n)
        await self.db.commit()
        await self.db.refresh(n)
        return n

    async def mark_read(self, notification_id: int) -> Notification | None:
        result = await self.db.execute(
            select(Notification).where(Notification.id == notification_id)
        )
        n = result.scalar_one_or_none()
        if n:
            n.is_read = True
            await self.db.commit()
            await self.db.refresh(n)
        return n

    async def mark_all_read(self, user_id: int) -> None:
        from sqlalchemy import update

        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def count_unread(self, user_id: int) -> int:
        q = select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
        result = await self.db.execute(q)
        return result.scalar_one()
