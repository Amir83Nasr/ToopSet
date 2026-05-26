from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.court import Court, SportType


class CourtRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        sport_type: SportType | None = None,
        is_active: bool | None = True,
        search: str | None = None,
    ) -> tuple[list[Court], int]:
        query = select(Court)
        count_query = select(Court.id)

        if sport_type:
            query = query.where(Court.sport_type == sport_type)
            count_query = count_query.where(Court.sport_type == sport_type)
        if is_active is not None:
            query = query.where(Court.is_active == is_active)
            count_query = count_query.where(Court.is_active == is_active)
        if search:
            pattern = f"%{search}%"
            query = query.where(Court.name.ilike(pattern))
            count_query = count_query.where(Court.name.ilike(pattern))

        total = len((await self.db.execute(count_query)).scalars().all())

        result = await self.db.execute(query.offset(skip).limit(limit).order_by(Court.created_at.desc()))
        courts = list(result.scalars().all())
        return courts, total

    async def get_by_id(self, court_id: int) -> Court | None:
        result = await self.db.execute(select(Court).where(Court.id == court_id))
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> Court:
        court = Court(**data)
        self.db.add(court)
        await self.db.commit()
        await self.db.refresh(court)
        return court

    async def update(self, court: Court, data: dict) -> Court:
        for key, value in data.items():
            if value is not None:
                setattr(court, key, value)
        await self.db.commit()
        await self.db.refresh(court)
        return court

    async def delete(self, court: Court) -> None:
        await self.db.delete(court)
        await self.db.commit()
