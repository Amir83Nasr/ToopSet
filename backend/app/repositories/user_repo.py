from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_phone(self, phone: str) -> User | None:
        result = await self.db.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create(
        self, phone: str, password_hash: str, full_name: str, role: str = "user"
    ) -> User:
        user = User(
            phone=phone,
            password_hash=password_hash,
            full_name=full_name,
            role=UserRole(role),
        )
        self.db.add(user)
        await self.db.flush()
        return user

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:
        """List users with optional filters and pagination. Returns (users, total_count)."""
        from sqlalchemy import func, or_

        query = select(User)
        count_query = select(func.count(User.id))

        if search:
            pattern = f"%{search}%"
            query = query.where(or_(User.full_name.ilike(pattern), User.phone.ilike(pattern)))
            count_query = count_query.where(
                or_(User.full_name.ilike(pattern), User.phone.ilike(pattern))
            )
        if role:
            query = query.where(User.role == role)
            count_query = count_query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active == is_active)
            count_query = count_query.where(User.is_active == is_active)

        query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)

        result = await self.db.execute(query)
        users = result.scalars().all()

        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        return list(users), total

    async def update_role(self, user_id: int, role: str) -> User | None:
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.role = role
        await self.db.flush()
        return user

    async def toggle_active(self, user_id: int) -> User | None:
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.is_active = not user.is_active
        await self.db.flush()
        return user

    async def update_user(self, user_id: int, data: dict) -> User | None:
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        for key, value in data.items():
            if value is not None:
                setattr(user, key, value)
        await self.db.flush()
        return user

    async def count_by_role(self, role: str) -> int:
        from sqlalchemy import func

        result = await self.db.execute(select(func.count(User.id)).where(User.role == role))
        return result.scalar_one()

    async def count_all(self) -> int:
        from sqlalchemy import func

        result = await self.db.execute(select(func.count(User.id)))
        return result.scalar_one()
