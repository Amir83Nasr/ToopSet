from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_phone(self, phone: str) -> User | None:
        result = await self.db.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: int) -> User | None:
        return await self.db.get(User, user_id)

    async def create(self, phone: str, password_hash: str, full_name: str) -> User:
        user = User(
            phone=phone,
            password_hash=password_hash,
            full_name=full_name,
        )
        self.db.add(user)
        await self.db.flush()
        return user
