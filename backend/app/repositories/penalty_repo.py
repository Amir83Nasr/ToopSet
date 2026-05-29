from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.penalty import Penalty


class PenaltyRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, user_id: int, booking_id: int, amount: float, reason: str) -> Penalty:
        penalty = Penalty(user_id=user_id, booking_id=booking_id, amount=amount, reason=reason)
        self.db.add(penalty)
        await self.db.commit()
        await self.db.refresh(penalty)
        return penalty

    async def list_by_user(
        self, user_id: int, *, skip: int = 0, limit: int = 20
    ) -> tuple[list[Penalty], int]:
        from sqlalchemy import func as sa_func

        count_q = select(sa_func.count()).select_from(Penalty).where(Penalty.user_id == user_id)
        total = (await self.db.execute(count_q)).scalar_one()

        stmt = (
            select(Penalty)
            .where(Penalty.user_id == user_id)
            .order_by(Penalty.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total
