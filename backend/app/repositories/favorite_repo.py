from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.favorite import Favorite


class FavoriteRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add(self, user_id: int, vendor_id: int) -> Favorite:
        fav = Favorite(user_id=user_id, vendor_id=vendor_id)
        self.db.add(fav)
        await self.db.flush()
        await self.db.refresh(fav)
        return fav

    async def remove(self, user_id: int, vendor_id: int) -> bool:
        result = await self.db.execute(
            select(Favorite).where(Favorite.user_id == user_id, Favorite.vendor_id == vendor_id)
        )
        fav = result.scalar_one_or_none()
        if fav:
            await self.db.delete(fav)
            await self.db.flush()
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

    async def is_favorited(self, user_id: int, vendor_id: int) -> bool:
        result = await self.db.execute(
            select(Favorite).where(Favorite.user_id == user_id, Favorite.vendor_id == vendor_id)
        )
        return result.scalar_one_or_none() is not None

    async def count_by_user(self, user_id: int) -> int:
        from sqlalchemy import func as sa_func

        result = await self.db.execute(
            select(sa_func.count()).select_from(Favorite).where(Favorite.user_id == user_id)
        )
        return result.scalar_one()

    async def check_favorited_ids(self, user_id: int, vendor_ids: list[int]) -> list[int]:
        result = await self.db.execute(
            select(Favorite.vendor_id).where(
                Favorite.user_id == user_id, Favorite.vendor_id.in_(vendor_ids)
            )
        )
        return [row[0] for row in result.all()]
