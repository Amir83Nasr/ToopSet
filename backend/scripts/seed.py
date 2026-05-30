import asyncio
import random
from datetime import datetime, timedelta
from decimal import Decimal

from passlib.context import CryptContext

from app.core.database import async_session_factory
from app.models.booking import Booking, BookingStatus
from app.models.court import Court, SportType
from app.models.favorite import Favorite
from app.models.notification import Notification
from app.models.penalty import Penalty
from app.models.review import Review
from app.models.time_slot import TimeSlot
from app.models.user import User, UserRole
from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


async def seed():
    async with async_session_factory() as db:
        # Clear existing data in FK-safe order
        await db.execute(Penalty.__table__.delete())
        await db.execute(Notification.__table__.delete())
        await db.execute(Review.__table__.delete())
        await db.execute(WalletTransaction.__table__.delete())
        await db.execute(Booking.__table__.delete())
        await db.execute(Wallet.__table__.delete())
        await db.execute(TimeSlot.__table__.delete())
        await db.execute(Court.__table__.delete())
        await db.execute(User.__table__.delete())
        await db.commit()
        # Users
        users = [
            User(
                full_name="مدیر سیستم",
                phone="09120000001",
                password_hash=hash_password("admin123"),
                role=UserRole.ADMIN,
            ),
            User(
                full_name="مدیر مجموعه ۱",
                phone="09120000002",
                password_hash=hash_password("manager123"),
                role=UserRole.MANAGER,
            ),
            User(
                full_name="مدیر مجموعه ۲",
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

        # Courts — real locations in Qom
        courts = [
            Court(
                manager_id=users[1].id,
                name="مجموعه ورزشی تختی قم",
                sport_types=[SportType.FUTSAL.value, SportType.VOLLEYBALL.value],
                address="قم، بلوار امین، مجموعه ورزشی تختی",
                latitude=34.63941,
                longitude=50.87614,
                capacity=20,
            ),
            Court(
                manager_id=users[1].id,
                name="سالن ۲۲ بهمن قم",
                sport_types=[SportType.BASKETBALL.value],
                address="قم، خیابان ۲۲ بهمن، سالن ورزشی ۲۲ بهمن",
                latitude=34.62572,
                longitude=50.87031,
                capacity=30,
            ),
            Court(
                manager_id=users[1].id,
                name="زمین فوتسال الغدیر",
                sport_types=[SportType.FUTSAL.value],
                address="قم، بلوار الغدیر، مجموعه ورزشی الغدیر",
                latitude=34.61887,
                longitude=50.89103,
                capacity=14,
            ),
            Court(
                manager_id=users[2].id,
                name="سالن ورزشی حضرت معصومه",
                sport_types=[SportType.VOLLEYBALL.value, SportType.HANDBALL.value],
                address="قم، خیابان دورشهر، جنب حرم مطهر",
                latitude=34.64219,
                longitude=50.87827,
                capacity=24,
            ),
            Court(
                manager_id=users[2].id,
                name="مجموعه ورزشی یادگار امام",
                sport_types=[SportType.FUTSAL.value, SportType.BASKETBALL.value],
                address="قم، بلوار امین، مجموعه یادگار امام",
                latitude=34.64876,
                longitude=50.86812,
                capacity=18,
            ),
            Court(
                manager_id=users[2].id,
                name="زمین والیبال دانشگاه قم",
                sport_types=[SportType.VOLLEYBALL.value],
                address="قم، بلوار جمهوری اسلامی، دانشگاه قم",
                latitude=34.65253,
                longitude=50.88055,
                capacity=16,
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
