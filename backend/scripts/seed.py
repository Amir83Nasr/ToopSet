import asyncio
import random
from datetime import datetime, timedelta
from decimal import Decimal

from passlib.context import CryptContext

from app.core.database import Base, async_session_factory, engine
from app.models.booking import Booking, BookingStatus
from app.models.court import Court, SportType
from app.models.favorite import Favorite
from app.models.log import Log
from app.models.notification import Notification
from app.models.payment import Payment
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
    # Recreate all tables with latest schema (cascades, etc.)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        # ── Users ──
        users = [
            User(
                full_name="امیرحسین نصراللهی",
                phone="09306853363",
                password_hash=hash_password("Amir83Nasr"),
                role=UserRole.ADMIN,
            ),
            User(
                full_name="ایمان کربلایی",
                phone="09962229652",
                password_hash=hash_password("1234"),
                role=UserRole.MANAGER,
            ),
            User(
                full_name="مهدی امامی",
                phone="09129106222",
                password_hash=hash_password("1234"),
                role=UserRole.USER,
            ),
            User(
                full_name="سارا مرادی",
                phone="09127001122",
                password_hash=hash_password("1234"),
                role=UserRole.USER,
            ),
            User(
                full_name="رضا کریمی",
                phone="09125554433",
                password_hash=hash_password("1234"),
                role=UserRole.USER,
            ),
            User(
                full_name="زهرا حسینی",
                phone="09129998877",
                password_hash=hash_password("1234"),
                role=UserRole.USER,
            ),
            User(
                full_name="علی موسوی",
                phone="09126667788",
                password_hash=hash_password("1234"),
                role=UserRole.USER,
            ),
        ]
        db.add_all(users)
        await db.flush()

        # ── Courts — real locations in Qom ──
        courts = [
            Court(
                manager_id=users[1].id,
                name="مجموعه ورزشی تختی قم",
                sport_types=[SportType.FUTSAL.value, SportType.VOLLEYBALL.value],
                address="قم، بلوار امین، جنب پارک شهر، مجموعه ورزشی تختی",
                latitude=34.63941,
                longitude=50.87614,
                capacity=20,
            ),
            Court(
                manager_id=users[1].id,
                name="سالن بسکتبال ۲۲ بهمن",
                sport_types=[SportType.BASKETBALL.value],
                address="قم، خیابان ۲۲ بهمن، نرسیده به میدان جانبازان",
                latitude=34.62572,
                longitude=50.87031,
                capacity=30,
            ),
            Court(
                manager_id=users[1].id,
                name="زمین فوتسال الغدیر",
                sport_types=[SportType.FUTSAL.value],
                address="قم، بلوار الغدیر، نبش کوچه ۲۱",
                latitude=34.61887,
                longitude=50.89103,
                capacity=14,
            ),
            Court(
                manager_id=users[1].id,
                name="سالن ورزشی حضرت معصومه",
                sport_types=[SportType.VOLLEYBALL.value, SportType.HANDBALL.value],
                address="قم، خیابان دورشهر، کوچه شهید رحیمی، پلاک ۱۲",
                latitude=34.64219,
                longitude=50.87827,
                capacity=24,
            ),
            Court(
                manager_id=users[1].id,
                name="مجموعه ورزشی شهدای قم",
                sport_types=[SportType.FUTSAL.value, SportType.BASKETBALL.value],
                address="قم، بلوار امین، روبروی بوستان شهید بنایی",
                latitude=34.64876,
                longitude=50.86812,
                capacity=18,
            ),
            Court(
                manager_id=users[1].id,
                name="زمین والیبال دانشگاه قم",
                sport_types=[SportType.VOLLEYBALL.value],
                address="قم، بلوار جمهوری اسلامی، پردیس دانشگاه قم",
                latitude=34.65253,
                longitude=50.88055,
                capacity=16,
            ),
            Court(
                manager_id=users[1].id,
                name="سالن ورزشی صدرا",
                sport_types=[SportType.FUTSAL.value, SportType.VOLLEYBALL.value],
                address="قم، شهرک صدرا، فاز ۳، بلوار ورزش",
                latitude=34.61012,
                longitude=50.85001,
                capacity=22,
            ),
            Court(
                manager_id=users[1].id,
                name="زمین چمن مجموعه حرم",
                sport_types=[SportType.FOOTBALL.value],
                address="قم، خیابان ارم، جنب حرم مطهر حضرت معصومه",
                latitude=34.64190,
                longitude=50.88060,
                capacity=28,
            ),
        ]
        db.add_all(courts)
        await db.flush()

        # ── Wallets ──
        wallets = [
            Wallet(user_id=users[0].id, balance=Decimal("150000")),
            Wallet(user_id=users[1].id, balance=Decimal("85000")),
            Wallet(user_id=users[2].id, balance=Decimal("42000")),
            Wallet(user_id=users[3].id, balance=Decimal("65000")),
            Wallet(user_id=users[4].id, balance=Decimal("32000")),
            Wallet(user_id=users[5].id, balance=Decimal("93000")),
            Wallet(user_id=users[6].id, balance=Decimal("51000")),
        ]
        db.add_all(wallets)
        await db.flush()

        # ── Time slots (next 14 days, 3 slots per court) ──
        now = datetime.now()
        slots = []
        for court in courts:
            for day_offset in range(14):
                for hour in [9, 14, 18]:
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

        # ── Bookings ──
        bookings = [
            Booking(
                user_id=users[2].id,
                slot_id=slots[0].id,
                status=BookingStatus.PENDING_PAYMENT,
                price_paid=slots[0].base_price,
            ),
            Booking(
                user_id=users[2].id,
                slot_id=slots[1].id,
                status=BookingStatus.CONFIRMED,
                price_paid=slots[1].base_price,
            ),
            Booking(
                user_id=users[3].id,
                slot_id=slots[5].id,
                status=BookingStatus.CONFIRMED,
                price_paid=slots[5].base_price,
            ),
            Booking(
                user_id=users[4].id,
                slot_id=slots[8].id,
                status=BookingStatus.CANCELLED,
                price_paid=slots[8].base_price,
                penalty_amount=Decimal("50000"),
            ),
            Booking(
                user_id=users[5].id,
                slot_id=slots[12].id,
                status=BookingStatus.CONFIRMED,
                price_paid=slots[12].base_price,
            ),
            Booking(
                user_id=users[6].id,
                slot_id=slots[3].id,
                status=BookingStatus.CONFIRMED,
                price_paid=slots[3].base_price,
            ),
        ]
        db.add_all(bookings)
        await db.flush()

        # Mark slots as reserved
        for b in bookings:
            b.slot.is_reserved = True

        # ── Payments ──
        payments = [
            Payment(
                booking_id=bookings[1].id,
                amount=bookings[1].price_paid,
                status="success",
                gateway_name="زرین‌پال",
                gateway_transaction_id="ZP-20240618-9823471",
                card_number="603799******1423",
                paid_at=datetime.now(),
            ),
            Payment(
                booking_id=bookings[2].id,
                amount=bookings[2].price_paid,
                status="success",
                gateway_name="زرین‌پال",
                gateway_transaction_id="ZP-20240618-4598123",
                card_number="589210******7890",
                paid_at=datetime.now(),
            ),
            Payment(
                booking_id=bookings[4].id,
                amount=bookings[4].price_paid,
                status="failed",
                gateway_name="ملی‌پی",
                gateway_transaction_id=None,
                card_number=None,
            ),
            Payment(
                booking_id=bookings[5].id,
                amount=bookings[5].price_paid,
                status="pending",
                gateway_name=None,
                gateway_transaction_id=None,
                card_number=None,
            ),
        ]
        db.add_all(payments)
        await db.flush()

        # ── Reviews ──
        reviews = [
            Review(
                user_id=users[2].id,
                court_id=courts[0].id,
                booking_id=bookings[0].id,
                rating=5,
                comment="زمین عالی، نورپردازی فوق‌العاده، حتما دوباره میایم",
            ),
            Review(
                user_id=users[2].id,
                court_id=courts[1].id,
                booking_id=bookings[1].id,
                rating=4,
                comment="کیفیت خوب ولی قیمت کمی بالاست. رختکن‌ها تمیز بودن",
            ),
            Review(
                user_id=users[3].id,
                court_id=courts[2].id,
                booking_id=bookings[2].id,
                rating=5,
                comment="بهترین زمین فوتسال قم. پارکینگ هم داره",
            ),
            Review(
                user_id=users[5].id,
                court_id=courts[3].id,
                booking_id=bookings[4].id,
                rating=3,
                comment="ساعت کاری مناسب نیست. کاش عصرها زودتر باز کنن",
            ),
        ]
        db.add_all(reviews)
        await db.flush()

        await db.commit()
        print("Seed completed!")


if __name__ == "__main__":
    asyncio.run(seed())


if __name__ == "__main__":
    asyncio.run(seed())
