import asyncio
import random
from datetime import datetime, timedelta
from decimal import Decimal

from passlib.context import CryptContext

from app.core.database import async_session_factory
from app.models.booking import Booking, BookingStatus
from app.models.court import Court, SportType
from app.models.review import Review
from app.models.time_slot import TimeSlot
from app.models.user import User, UserRole
from app.models.wallet import Wallet

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


async def seed():
    async with async_session_factory() as db:
        # Users
        users = [
            User(
                full_name="مدیر سیستم",
                phone="09120000001",
                password_hash=hash_password("admin123"),
                role=UserRole.ADMIN,
            ),
            User(
                full_name="مدیر زمین ۱",
                phone="09120000002",
                password_hash=hash_password("manager123"),
                role=UserRole.MANAGER,
            ),
            User(
                full_name="مدیر زمین ۲",
                phone="09120000003",
                password_hash=hash_password("manager123"),
                role=UserRole.MANAGER,
            ),
            User(
                full_name="کاربر تست ۱",
                phone="09120000004",
                password_hash=hash_password("user123"),
                role=UserRole.USER,
            ),
            User(
                full_name="کاربر تست ۲",
                phone="09120000005",
                password_hash=hash_password("user123"),
                role=UserRole.USER,
            ),
        ]
        db.add_all(users)
        await db.flush()

        # Courts
        courts = [
            Court(
                manager_id=users[1].id,
                name="زمین فوتسال آزادی",
                sport_type=SportType.FUTSAL,
                address="تهران، خیابان آزادی",
                latitude=35.7,
                longitude=51.4,
                capacity=10,
            ),
            Court(
                manager_id=users[1].id,
                name="زمین بسکتبال انقلاب",
                sport_type=SportType.BASKETBALL,
                address="تهران، خیابان انقلاب",
                latitude=35.7,
                longitude=51.4,
                capacity=12,
            ),
            Court(
                manager_id=users[2].id,
                name="زمین والیبال دانشگاه",
                sport_type=SportType.VOLLEYBALL,
                address="تهران، خیابان دانشگاه",
                latitude=35.7,
                longitude=51.4,
                capacity=8,
            ),
            Court(
                manager_id=users[2].id,
                name="زمین فوتسال نوآوری",
                sport_type=SportType.FUTSAL,
                address="تهران، خیابان نوآوری",
                latitude=35.7,
                longitude=51.4,
                capacity=10,
            ),
        ]
        db.add_all(courts)
        await db.flush()

        # Wallets
        wallets = [
            Wallet(user_id=users[0].id, balance=Decimal("150000")),
            Wallet(user_id=users[1].id, balance=Decimal("85000")),
            Wallet(user_id=users[2].id, balance=Decimal("42000")),
            Wallet(user_id=users[3].id, balance=Decimal("250000")),
            Wallet(user_id=users[4].id, balance=Decimal("75000")),
        ]
        db.add_all(wallets)
        await db.flush()

        # Time slots (next 7 days, 2 slots per court)
        now = datetime.now()
        slots = []
        for court in courts:
            for day_offset in range(7):
                for hour in [10, 16]:
                    start = now.replace(hour=hour, minute=0, second=0, microsecond=0) + timedelta(
                        days=day_offset
                    )
                    end = start + timedelta(hours=2)
                    slots.append(
                        TimeSlot(
                            court_id=court.id,
                            start_time=start,
                            end_time=end,
                            base_price=Decimal(str(random.randint(500, 1500) * 1000)),
                        )
                    )
        db.add_all(slots)
        await db.flush()

        # Bookings
        bookings = [
            Booking(
                user_id=users[3].id,
                slot_id=slots[0].id,
                status=BookingStatus.PENDING_PAYMENT,
                price_paid=slots[0].base_price,
            ),
            Booking(
                user_id=users[4].id,
                slot_id=slots[1].id,
                status=BookingStatus.CONFIRMED,
                price_paid=slots[1].base_price,
            ),
        ]
        db.add_all(bookings)
        await db.flush()

        # Mark slots as reserved
        slots[0].is_reserved = True
        slots[1].is_reserved = True

        # Reviews
        reviews = [
            Review(
                user_id=users[3].id,
                court_id=courts[0].id,
                booking_id=bookings[0].id,
                rating=5,
                comment="زمین عالی، مناسب برای بازی",
            ),
            Review(
                user_id=users[4].id,
                court_id=courts[0].id,
                booking_id=bookings[1].id,
                rating=4,
                comment="کیفیت خوب ولی قیمت بالاست",
            ),
        ]
        db.add_all(reviews)
        await db.commit()

        print("Seed completed!")


if __name__ == "__main__":
    asyncio.run(seed())
