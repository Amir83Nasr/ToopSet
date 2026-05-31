import asyncio

from passlib.context import CryptContext
from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.user import User, UserRole
from app.models.wallet import Wallet

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_admin():
    async with async_session_factory() as db:
        phone = "09306853363"
        result = await db.execute(select(User).where(User.phone == phone))
        existing = result.scalar_one_or_none()

        if existing:
            existing.full_name = "امیرحسین نصراللهی"
            existing.password_hash = pwd_context.hash("Amir83Nasr")
            existing.role = UserRole.ADMIN
            existing.is_deleted = False
            existing.is_active = True
            print(f"✅ Admin updated: {existing.full_name} ({existing.phone})")
        else:
            user = User(
                full_name="امیرحسین نصراللهی",
                phone=phone,
                password_hash=pwd_context.hash("Amir83Nasr"),
                role=UserRole.ADMIN,
            )
            db.add(user)
            await db.flush()

            wallet = Wallet(user_id=user.id, balance=0)
            db.add(wallet)
            print(f"✅ Admin created: {user.full_name} ({user.phone})")

        await db.commit()


if __name__ == "__main__":
    asyncio.run(create_admin())
