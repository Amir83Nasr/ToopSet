from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.favorite import Favorite


class FavoriteRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add(self, user_id: int, court_id: int) -> Favorite:
        fav = Favorite(user_id=user_id, court_id=court_id)
        self.db.add(fav)
        await self.db.commit()
        await self.db.refresh(fav)
        return fav

    async def remove(self, user_id: int, court_id: int) -> bool:
        result = await self.db.execute(
            select(Favorite).where(Favorite.user_id == user_id, Favorite.court_id == court_id)
        )
        fav = result.scalar_one_or_none()
        if fav:
            await self.db.delete(fav)
            await self.db.commit()
            return True
        return False

    async def list_by_user(self, user_id: int, skip: int = 0, limit: int = 50) -> list[Favorite]:
        result = await self.db.execute(
            select(Favorite)
            .where(Favorite.user_id == user_id)
            .order_by(Favorite.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def is_favorited(self, user_id: int, court_id: int) -> bool:
        result = await self.db.execute(
            select(Favorite).where(Favorite.user_id == user_id, Favorite.court_id == court_id)
        )
        return result.scalar_one_or_none() is not None

    async def count_by_user(self, user_id: int) -> int:
        result = await self.db.execute(select(Favorite).where(Favorite.user_id == user_id))
        return len(result.scalars().all())
