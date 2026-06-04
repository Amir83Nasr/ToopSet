from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.favorite_repo import FavoriteRepo


class FavoriteService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.repo = FavoriteRepo(db)
        self.current_user = current_user

    async def add_favorite(self, court_id: int):
        existing = await self.repo.is_favorited(self.current_user.id, court_id)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="قبلاً به علاقه‌مندی‌ها اضافه شده است")
        return await self.repo.add(self.current_user.id, court_id)

    async def remove_favorite(self, court_id: int):
        removed = await self.repo.remove(self.current_user.id, court_id)
        if not removed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="علاقه‌مندی یافت نشد")

    async def list_favorites(self, skip: int = 0, limit: int = 50):
        return await self.repo.list_by_user(self.current_user.id, skip=skip, limit=limit)

    async def check_favorites(self, court_ids: list[int]) -> list[int]:
        return await self.repo.check_favorited_ids(self.current_user.id, court_ids)
