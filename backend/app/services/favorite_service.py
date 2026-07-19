from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.vendor import Vendor
from app.repositories.favorite_repo import FavoriteRepo


class FavoriteService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.repo = FavoriteRepo(db)
        self.current_user = current_user

    async def add_favorite(self, vendor_id: int):
        vendor = await self.repo.db.get(Vendor, vendor_id)
        can_see_inactive = bool(
            vendor
            and (self.current_user.role == "admin" or vendor.manager_id == self.current_user.id)
        )
        if vendor is None or (not vendor.is_active and not can_see_inactive):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="مجموعه یافت نشد",
            )
        existing = await self.repo.is_favorited(self.current_user.id, vendor_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="قبلاً به علاقه‌مندی‌ها اضافه شده است"
            )
        return await self.repo.add(self.current_user.id, vendor_id)

    async def remove_favorite(self, vendor_id: int):
        removed = await self.repo.remove(self.current_user.id, vendor_id)
        if not removed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="علاقه‌مندی یافت نشد")

    async def list_favorites(self, skip: int = 0, limit: int = 50):
        return await self.repo.list_by_user(self.current_user.id, skip=skip, limit=limit)

    async def check_favorites(self, vendor_ids: list[int]) -> list[int]:
        return await self.repo.check_favorited_ids(self.current_user.id, vendor_ids)
