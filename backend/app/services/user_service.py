from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.repositories.user_repo import UserRepository


class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
    ):
        users, total = await self.repo.list_users(
            skip=skip, limit=limit, search=search, role=role, is_active=is_active
        )
        return {"users": users, "total": total}

    async def get_user(self, user_id: int):
        user = await self.repo.get_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد")
        return user

    async def update_role(self, admin_user: User, target_id: int, new_role: str):
        # Cannot change own role
        if admin_user.id == target_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="نمی‌توانید نقش خود را تغییر دهید"
            )

        user = await self.repo.get_by_id(target_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد")

        # Cannot remove the last admin
        if user.role == "admin" and new_role != "admin":
            admin_count = await self.repo.count_by_role("admin")
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="نمی‌توانید آخرین ادمین را تغییر دهید",
                )

        updated = await self.repo.update_role(target_id, new_role)
        return updated

    async def toggle_active(self, admin_user: User, target_id: int):
        # Cannot disable yourself
        if admin_user.id == target_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="نمی‌توانید وضعیت خود را تغییر دهید"
            )

        user = await self.repo.get_by_id(target_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد")

        # Cannot disable the last admin
        if user.role == "admin":
            admin_count = await self.repo.count_by_role("admin")
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="نمی‌توانید آخرین ادمین را غیرفعال کنید",
                )

        updated = await self.repo.toggle_active(target_id)
        return updated


async def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)
