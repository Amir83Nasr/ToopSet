import asyncio
import random
from datetime import datetime, timedelta
from decimal import Decimal

from passlib.context import CryptContext

from app.core.database import Base, async_session_factory, engine
from app.core.timezone import iran_to_utc, now_iran
from app.models.booking import Booking, BookingStatus
from app.models.court import Court, SportType
from app.models.favorite import Favorite
from app.models.log import Log
from app.models.notification import Notification
from app.models.payment import Payment
from app.models.penalty import Penalty
from app.models.review import Review
from app.models.setting import Setting
from app.models.time_slot import TimeSlot
from app.models.user import User, UserRole
from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# ── Users ────────────────────────────────────────────────────────────────────

ALL_USERS = [
    # admin
    User(
        full_name="امیرحسین نصراللهی",
        phone="09306853363",
        password_hash=hash_password("Amir83Nasr"),
        role=UserRole.ADMIN,
    ),
    # managers
    User(
        full_name="ایمان کربلایی",
        phone="09962229652",
        password_hash=hash_password("1234"),
        role=UserRole.MANAGER,
    ),
    # users
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
    User(
        full_name="فاطمه محمدی",
        phone="09123334455",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
    User(
        full_name="محمد احمدی",
        phone="09124445566",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
    User(
        full_name="نرجس رضایی",
        phone="09127778899",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
    User(
        full_name="حسین جعفری",
        phone="09128889900",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
    User(
        full_name="مریم صادقی",
        phone="09120001122",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
    User(
        full_name="امیر عباسی",
        phone="09121112233",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
    User(
        full_name="الهام نوروزی",
        phone="09122223344",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
    User(
        full_name="سعید رحمانی",
        phone="09122334455",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
    User(
        full_name="زینب کرمی",
        phone="09123445566",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
    User(
        full_name="پویا فتاحی",
        phone="09124556677",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
    User(
        full_name="سمیه گلی",
        phone="09125667788",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
    User(
        full_name="کیوان صالحی",
        phone="09126778899",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
    User(
        full_name="لیلا طاهری",
        phone="09127889900",
        password_hash=hash_password("1234"),
        role=UserRole.USER,
    ),
]

# ── Courts — real locations in Qom ───────────────────────────────────────────

ALL_COURTS = [
    Court(
        name="مجموعه ورزشی تختی قم",
        sport_types=[SportType.FUTSAL.value, SportType.VOLLEYBALL.value],
        address="قم، بلوار امین، جنب پارک شهر، مجموعه ورزشی تختی",
        latitude=34.63941,
        longitude=50.87614,
        capacity=20,
    ),
    Court(
        name="سالن بسکتبال ۲۲ بهمن",
        sport_types=[SportType.BASKETBALL.value],
        address="قم، خیابان ۲۲ بهمن، نرسیده به میدان جانبازان",
        latitude=34.62572,
        longitude=50.87031,
        capacity=30,
    ),
    Court(
        name="زمین فوتسال الغدیر",
        sport_types=[SportType.FUTSAL.value],
        address="قم، بلوار الغدیر، نبش کوچه ۲۱",
        latitude=34.61887,
        longitude=50.89103,
        capacity=14,
    ),
    Court(
        name="سالن ورزشی حضرت معصومه",
        sport_types=[SportType.VOLLEYBALL.value, SportType.HANDBALL.value],
        address="قم، خیابان دورشهر، کوچه شهید رحیمی، پلاک ۱۲",
        latitude=34.64219,
        longitude=50.87827,
        capacity=24,
    ),
    Court(
        name="مجموعه ورزشی شهدای قم",
        sport_types=[SportType.FUTSAL.value, SportType.BASKETBALL.value],
        address="قم، بلوار امین، روبروی بوستان شهید بنایی",
        latitude=34.64876,
        longitude=50.86812,
        capacity=18,
    ),
    Court(
        name="زمین والیبال دانشگاه قم",
        sport_types=[SportType.VOLLEYBALL.value],
        address="قم، بلوار جمهوری اسلامی، پردیس دانشگاه قم",
        latitude=34.65253,
        longitude=50.88055,
        capacity=16,
    ),
    Court(
        name="سالن ورزشی صدرا",
        sport_types=[SportType.FUTSAL.value, SportType.VOLLEYBALL.value],
        address="قم، شهرک صدرا، فاز ۳، بلوار ورزش",
        latitude=34.61012,
        longitude=50.85001,
        capacity=22,
    ),
    Court(
        name="زمین چمن مجموعه حرم",
        sport_types=[SportType.FOOTBALL.value],
        address="قم، خیابان ارم، جنب حرم مطهر حضرت معصومه",
        latitude=34.64190,
        longitude=50.88060,
        capacity=28,
    ),
    Court(
        name="مجموعه ورزشی آفتاب قم",
        sport_types=[
            SportType.FUTSAL.value,
            SportType.VOLLEYBALL.value,
            SportType.BASKETBALL.value,
        ],
        address="قم، بلوار پانزده خرداد، جنب ایستگاه اتوبوس شهید مطهری",
        latitude=34.63500,
        longitude=50.88500,
        capacity=25,
    ),
    Court(
        name="زمین تنیس هتل پارسیا",
        sport_types=[SportType.VOLLEYBALL.value],
        address="قم، بلوار جمهوری اسلامی، روبروی هتل پارسیا",
        latitude=34.64780,
        longitude=50.87750,
        capacity=8,
    ),
    Court(
        name="سالن هندبال شهید زینالدین",
        sport_types=[SportType.HANDBALL.value, SportType.FUTSAL.value],
        address="قم، خیابان امام خمینی، کوچه شهید زینالدین",
        latitude=34.64010,
        longitude=50.86980,
        capacity=20,
    ),
    Court(
        name="مجموعه ورزشی قدس",
        sport_types=[SportType.BASKETBALL.value, SportType.VOLLEYBALL.value],
        address="قم، شهرک قدس، بلوار امام رضا، نبش کوچه ۱۰",
        latitude=34.62050,
        longitude=50.86030,
        capacity=26,
    ),
    Court(
        name="زمین فوتسال بعثت",
        sport_types=[SportType.FUTSAL.value],
        address="قم، خیابان بعثت، کوچه ۱۸، پلاک ۳",
        latitude=34.63120,
        longitude=50.87560,
        capacity=14,
    ),
    Court(
        name="سالن ورزشی شهید بهشتی",
        sport_types=[SportType.VOLLEYBALL.value, SportType.HANDBALL.value],
        address="قم، بلوار امین، مجتمع فرهنگی ورزشی شهید بهشتی",
        latitude=34.64550,
        longitude=50.87240,
        capacity=30,
    ),
    Court(
        name="مجموعه ورزشی کوثر",
        sport_types=[
            SportType.FUTSAL.value,
            SportType.BASKETBALL.value,
            SportType.VOLLEYBALL.value,
        ],
        address="قم، پردیسان، بلوار دانشگاه، پردیس دانشگاهی کوثر",
        latitude=34.59800,
        longitude=50.89800,
        capacity=35,
    ),
]

# ── Carpet-style card numbers (masked) ───────────────────────────────────────

BANK_PREFIXES = ["603799", "589210", "627353", "502229", "610433", "639346"]
BANK_NAMES = [
    "ملی",
    "ملت",
    "تجارت",
    "صادرات",
    "رفاه",
    "پارسیان",
]


def random_card() -> tuple[str, str]:
    prefix = random.choice(BANK_PREFIXES)
    suffix = f"{random.randint(1000, 9999):04d}"
    return f"{prefix}******{suffix}", random.choice(BANK_NAMES)


def random_price(min_: int = 500, max_: int = 2000) -> Decimal:
    return Decimal(str(random.randint(min_, max_) * 1000))


# ── Helpers ──────────────────────────────────────────────────────────────────


def assign_manager(users: list[User]) -> User:
    """Return the existing manager user."""
    for u in users:
        if u.role == UserRole.MANAGER:
            return u
    return users[0]


async def seed():
    # Clean existing data in dependency-safe order before dropping schema
    async with async_session_factory() as db:
        for table in (
            Penalty.__table__,
            WalletTransaction.__table__,
            Notification.__table__,
            Log.__table__,
            Review.__table__,
            Favorite.__table__,
            Payment.__table__,
            Booking.__table__,
            TimeSlot.__table__,
            Wallet.__table__,
            Court.__table__,
            User.__table__,
        ):
            await db.execute(table.delete())
        await db.commit()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        # ── Users ──
        db.add_all(ALL_USERS)
        await db.flush()
        users: list[User] = ALL_USERS
        regular_users = [u for u in users if u.role == UserRole.USER]
        manager = assign_manager(users)
        admin = users[0]

        # ── Courts ──
        for court in ALL_COURTS:
            court.manager_id = manager.id
        db.add_all(ALL_COURTS)
        await db.flush()
        courts: list[Court] = ALL_COURTS

        # ── Wallets ──
        wallet_balances: list[Decimal] = [
            Decimal("500000"),
            Decimal("120000"),
            Decimal("42000"),
            Decimal("65000"),
            Decimal("32000"),
            Decimal("93000"),
            Decimal("51000"),
            Decimal("78000"),
            Decimal("150000"),
            Decimal("46000"),
            Decimal("89000"),
            Decimal("25000"),
            Decimal("110000"),
            Decimal("37000"),
            Decimal("63000"),
            Decimal("82000"),
            Decimal("95000"),
            Decimal("54000"),
            Decimal("71000"),
            Decimal("28000"),
        ]
        wallets = [Wallet(user_id=u.id, balance=bal) for u, bal in zip(users, wallet_balances)]
        db.add_all(wallets)
        await db.flush()

        # ── Time slots (next 60 days, 5 fixed slots per court per day) ──
        now = now_iran()
        slots: list[TimeSlot] = []
        # Fixed slot schedules: (hour, minute, duration_hours)
        slot_schedules = [
            (9, 0, 2),  # 09:00 – 11:00
            (11, 0, 2),  # 11:00 – 13:00
            (13, 0, 2),  # 13:00 – 15:00
            (15, 0, 2),  # 15:00 – 17:00
            (17, 0, 2),  # 17:00 – 19:00
            (19, 0, 2),  # 19:00 – 21:00
            (21, 0, 2),  # 21:00 – 23:00
        ]
        for court in courts:
            for day_offset in range(60):
                # 60 days × 7 slots = 420 slots per court — pick 5 random per day
                for hour, minute, duration in random.sample(slot_schedules, 5):
                    start_iran = now.replace(
                        hour=hour, minute=minute, second=0, microsecond=0
                    ) + timedelta(days=day_offset)
                    end_iran = start_iran + timedelta(hours=duration)
                    slots.append(
                        TimeSlot(
                            court_id=court.id,
                            start_time=iran_to_utc(start_iran),
                            end_time=iran_to_utc(end_iran),
                            base_price=random_price(),
                        )
                    )
        db.add_all(slots)
        await db.flush()

        # ── Bookings & payments ──
        # Create bookings spread across users and courts, then payments for confirmed ones
        bookings: list[Booking] = []
        payments: list[Payment] = []

        booking_specs = [
            # (user_index, court_index, day_offset, hour_offset_in_day, status)
            # user 0 = mehdi, 1 = sara, etc.
            (2, 0, 0, 0, "pending_payment"),
            (2, 1, 0, 1, "confirmed"),
            (2, 0, 3, 1, "confirmed"),
            (3, 2, 1, 0, "confirmed"),
            (3, 4, 2, 2, "confirmed"),
            (4, 1, 1, 2, "cancelled"),
            (4, 5, 3, 0, "confirmed"),
            (5, 3, 0, 2, "confirmed"),
            (5, 6, 2, 1, "confirmed"),
            (5, 7, 4, 0, "pending_payment"),
            (6, 2, 1, 1, "confirmed"),
            (6, 0, 4, 1, "confirmed"),
            (7, 8, 2, 0, "confirmed"),
            (7, 9, 5, 1, "confirmed"),
            (8, 3, 3, 2, "cancelled"),
            (8, 10, 6, 0, "confirmed"),
            (9, 4, 1, 0, "confirmed"),
            (9, 11, 3, 1, "pending_payment"),
            (10, 5, 2, 1, "confirmed"),
            (10, 12, 5, 0, "confirmed"),
            (11, 6, 0, 0, "confirmed"),
            (11, 7, 4, 2, "confirmed"),
            (12, 8, 1, 1, "cancelled"),
            (12, 13, 3, 0, "confirmed"),
            (13, 9, 2, 0, "confirmed"),
            (13, 14, 5, 2, "confirmed"),
            (14, 10, 0, 1, "confirmed"),
            (14, 11, 4, 0, "pending_payment"),
            (15, 12, 1, 0, "confirmed"),
            (15, 13, 3, 2, "confirmed"),
            (16, 14, 2, 1, "cancelled"),
            (16, 0, 5, 1, "confirmed"),
            (17, 1, 0, 2, "confirmed"),
            (17, 2, 4, 1, "confirmed"),
            (18, 3, 1, 2, "confirmed"),
            (18, 4, 3, 1, "pending_payment"),
            (19, 5, 2, 0, "confirmed"),
            (19, 6, 4, 2, "confirmed"),
        ]

        for user_idx, court_idx, day_off, slot_in_day, status in booking_specs:
            # Find a slot belonging to this court on this day offset
            court = courts[court_idx]
            day_slots = [
                s
                for s in slots
                if s.court_id == court.id and (s.start_time.day - now.day) % 30 == day_off
            ]
            if not day_slots or slot_in_day >= len(day_slots):
                continue
            slot = day_slots[slot_in_day]
            user = regular_users[user_idx % len(regular_users)]

            if status == "confirmed":
                b = Booking(
                    user_id=user.id,
                    slot_id=slot.id,
                    status=BookingStatus.CONFIRMED,
                    price_paid=slot.base_price,
                )
                bookings.append(b)
            elif status == "pending_payment":
                b = Booking(
                    user_id=user.id,
                    slot_id=slot.id,
                    status=BookingStatus.PENDING_PAYMENT,
                    price_paid=slot.base_price,
                )
                bookings.append(b)
            elif status == "cancelled":
                b = Booking(
                    user_id=user.id,
                    slot_id=slot.id,
                    status=BookingStatus.CANCELLED,
                    price_paid=slot.base_price,
                    penalty_amount=random_price(200, 500),
                )
                bookings.append(b)

        # need to flush first so bookings have ids for payments
        # We add bookings in batches, alternately flushing
        db.add_all(bookings)
        await db.flush()

        # Mark reserved slots
        for b in bookings:
            b.slot.is_reserved = True

        # ── Payments (confirmed → success, pending_payment → 30% failed) ──
        for b in bookings:
            if b.status == BookingStatus.CONFIRMED:
                card, bank = random_card()
                paid = b.created_at or now_iran()
                payments.append(
                    Payment(
                        booking_id=b.id,
                        amount=b.price_paid,
                        status="success",
                        gateway_name=f"زرین‌پال ({bank})",
                        gateway_transaction_id=f"ZP-{paid.strftime('%Y%m%d')}-{random.randint(1000000, 9999999)}",
                        card_number=card,
                        paid_at=paid,
                    )
                )
            elif b.status == BookingStatus.PENDING_PAYMENT:
                # Some pending bookings have failed payments
                if random.random() < 0.3:
                    payments.append(
                        Payment(
                            booking_id=b.id,
                            amount=b.price_paid,
                            status="failed",
                            gateway_name=None,
                            gateway_transaction_id=None,
                            card_number=None,
                        )
                    )

        db.add_all(payments)
        await db.flush()

        # ── Reviews ──
        review_data = [
            (2, 0, "زمین عالی، نورپردازی فوق‌العاده، حتما دوباره میایم", 5),
            (2, 1, "کیفیت خوب ولی قیمت کمی بالاست. رختکن‌ها تمیز بودن", 4),
            (3, 2, "بهترین زمین فوتسال قم. پارکینگ هم داره", 5),
            (3, 4, "فضای خوبی داره، کاش سرویس بهداشتی تمیزتری داشت", 3),
            (5, 3, "ساعت کاری مناسب نیست. کاش عصرها زودتر باز کنن", 3),
            (5, 6, "محوطه بزرگ و پارکینگ وسیع. حتما دوباره میام", 4),
            (6, 0, "کیفیت چمن مصنوعی عالیه. امتیاز کامل", 5),
            (6, 2, "رختکن‌ها کاملاً استاندارد. دوش آب گرم داره", 4),
            (7, 8, "مجموعه خیلی خوب و مدرسی، نورپردازی قشنگ", 5),
            (8, 3, "کف سالن سر خورنده ست، یکم خطرناکه", 2),
            (9, 4, "دوربین مداربسته داره، امنیت خوبه", 4),
            (10, 5, "تخته‌های والیبال کهنه‌ست، نیاز به تعویض داره", 3),
            (10, 6, "جزو بهترین سالن‌های صدراست. رضایت کامل", 4),
            (11, 7, "زمین چمن عالی برای فوتبال. حتما تجربه کنید", 5),
            (12, 8, "قیمت مناسب نسبت به بقیه سالن‌ها. خوبه", 4),
            (13, 9, "تنیس روی میز هم داره، سالن چندمنظوره خوبی", 4),
            (14, 0, "همیشه شلوغه، بهتره زودتر رزرو کنید", 4),
            (15, 10, "سالن اختصاصی هندبال، خیلی خوبه", 5),
            (16, 1, "متاسفانه وقت شناسی ندارن، ۲۰ دقیقه دیر باز کردن", 2),
            (17, 2, "بچه‌ها عاشق این سالن شدن. همه چی عالیه", 5),
            (18, 3, "نزدیک حرم، دسترسی آسان داره. خوبه", 4),
            (19, 4, "قیمت مناسب، کیفیت بالای زمین. حتما میایم", 5),
            (10, 11, "سالن بزرگیه، برای مسابقه عالیه", 4),
            (11, 12, "فوتسال عالی، کفپوش استاندارد. عالیه", 5),
            (13, 13, "جدید و مدرسه، امکانات کامل داره", 4),
            (14, 14, "خیلی خوبه، پیشنهاد میکنم حتما بیان", 4),
            # Extra reviews for courts with only 1 review — ensure every court has ≥2
            (4, 5, "والیبال عالی، همیشه سالن تمیز و مرتب هست", 4),
            (19, 5, "تخته‌ها نو شده بودن، کیفیت خوبی داشت", 4),
            (5, 7, "چمن مصنوعی خیلی باکیفیته، عالی بود", 5),
            (11, 7, "زمین فوتبال بزرگ و استاندارد، دوباره میام", 5),
            (7, 9, "تنیس روی میز هم داره، جای خوبیه", 4),
            (13, 9, "محوطه مرتب و تمیز، آرامش خوبی داره", 4),
            (8, 10, "سالن هندبال کاملاً استاندارد و خوب", 5),
            (14, 10, "نورپردازی عالی و سرویس‌های بهداشتی تمیز", 4),
            (9, 11, "بسکتبال عالی، حلقه‌ها استاندارد هستن", 4),
            (14, 11, "فضای بزرگ با سقف بلند، برای مسابقه عالیه", 5),
            (10, 12, "زمین فوتسال کوچیک ولی دنج، خوبه", 3),
            (15, 12, "کیفیت فوتسال خوبه، پارکینگ نزدیک داره", 4),
            (12, 13, "جدیدترین سالن قم، همه چی عالیه", 5),
            (15, 13, "سالن بزرگ و مدرس، کفپوش عالی", 4),
            (13, 14, "فضای بزرگ و چندمنظوره، خوبه", 4),
            (16, 14, "جای خوبی برای بسکتبال و والیبال", 4),
        ]

        reviews: list[Review] = []
        used_booking_ids: set[int] = set()
        for i, (ui, ci, comment, rating) in enumerate(review_data):
            # find a booking by this user for this court that hasn't been used yet
            booking = None
            for b in bookings:
                if b.id in used_booking_ids:
                    continue
                if b.user_id == regular_users[ui % len(regular_users)].id:
                    slot = None
                    for s in slots:
                        if s.id == b.slot_id:
                            slot = s
                            break
                    if slot and slot.court_id == courts[ci].id:
                        booking = b
                        break

            if booking:
                used_booking_ids.add(booking.id)
                reviews.append(
                    Review(
                        user_id=regular_users[ui % len(regular_users)].id,
                        court_id=courts[ci].id,
                        booking_id=booking.id,
                        rating=rating,
                        comment=comment,
                    )
                )

        db.add_all(reviews)
        await db.flush()

        # ── Update court average_rating from reviews ──
        from sqlalchemy import func as sa_func
        from sqlalchemy import select

        for court in courts:
            result = await db.execute(
                select(sa_func.avg(Review.rating)).where(Review.court_id == court.id)
            )
            avg = result.scalar()
            court.average_rating = round(float(avg), 1) if avg else 0.0

        # ── Notifications ──
        notes: list[Notification] = []
        for b in bookings:
            if b.status in (BookingStatus.CONFIRMED, BookingStatus.CANCELLED):
                status_text = "تأیید شد" if b.status == BookingStatus.CONFIRMED else "لغو شد"
                notes.append(
                    Notification(
                        user_id=b.user_id,
                        type="booking_status",
                        message=f"رزرو شما با وضعیت {status_text} به‌روزرسانی شد",
                    )
                )
        # broadcast
        notes.append(
            Notification(
                user_id=admin.id,
                type="broadcast",
                message="سامانه توپ‌ست به مناسبت عید سعید قربان تا ۵۰٪ تخفیف دارد",
                is_read=False,
            )
        )
        notes.append(
            Notification(
                user_id=admin.id,
                type="broadcast",
                message="مجموعه ورزشی جدید «کوثر» به سامانه اضافه شد",
                is_read=False,
            )
        )
        db.add_all(notes)
        await db.flush()

        # ── Settings ──
        setting_defaults = [
            {"key": "platform_name", "value": "توپ‌سِت", "description": "نام پلتفرم"},
            {"key": "support_phone", "value": "۰۹۳۰-۶۸۵۳۳۶۳", "description": "شماره پشتیبانی"},
            {
                "key": "support_email",
                "value": "amirhossein.nasrollahi.main@gmail.com",
                "description": "ایمیل پشتیبانی",
            },
            {"key": "commission_percent", "value": "10", "description": "درصد کمیسیون"},
            {"key": "cancel_window_hours", "value": "24", "description": "مهلت کنسل کردن (ساعت)"},
            {"key": "rules_text", "value": "", "description": "متن قوانین و مقررات"},
            {"key": "faq_text", "value": "", "description": "متن سوالات متداول"},
            {
                "key": "pagination_limit",
                "value": "15",
                "description": "تعداد آیتم در هر صفحه برای جداول",
            },
        ]
        setting_models = [Setting(**d) for d in setting_defaults]
        db.add_all(setting_models)
        await db.flush()

        # ── Audit logs ──
        logs: list[Log] = [
            Log(
                user_id=admin.id,
                action="user_created",
                details="ایجاد کاربر جدید | کاربر سارا مرادی با نقش کاربر عادی",
            ),
            Log(
                user_id=admin.id,
                action="court_approved",
                details="تأیید مجموعه | مجموعه ورزشی تختی قم تأیید شد",
            ),
            Log(
                user_id=manager.id,
                action="booking_created",
                details="رزرو جدید | رزرو زمین فوتسال الغدیر توسط مهدی امامی",
            ),
            Log(
                user_id=admin.id,
                action="broadcast_sent",
                details="ارسال پیام همگانی | پیام تخفیف عید قربان برای همه کاربران ارسال شد",
            ),
            Log(
                user_id=manager.id,
                action="court_updated",
                details="به‌روزرسانی مجموعه | قیمت مجموعه ورزشی تختی قم تغییر کرد",
            ),
            Log(
                user_id=admin.id,
                action="user_role_changed",
                details="تغییر نقش | نقش ایمان کربلایی به مدیر مجموعه تغییر کرد",
            ),
            Log(
                user_id=admin.id,
                action="settings_updated",
                details="تنظیمات سیستم | درصد جریمه لغو رزرو به ۵۰٪ تغییر کرد",
            ),
        ]
        db.add_all(logs)
        await db.flush()

        # ── Wallet transactions ──
        transactions: list[WalletTransaction] = [
            WalletTransaction(
                wallet_id=wallets[0].id,
                amount=Decimal("500000"),
                type="deposit",
                description="شارژ اولیه کیف پول",
            ),
            WalletTransaction(
                wallet_id=wallets[1].id,
                amount=Decimal("120000"),
                type="deposit",
                description="شارژ اولیه کیف پول",
            ),
            WalletTransaction(
                wallet_id=wallets[0].id,
                amount=Decimal("150000"),
                type="withdraw",
                description="پرداخت رزرو مجموعه تختی",
            ),
        ]
        for i, user in enumerate(regular_users):
            if i < len(wallets) - 2:
                transactions.append(
                    WalletTransaction(
                        wallet_id=wallets[i + 2].id,
                        amount=wallet_balances[i + 2],
                        type="deposit",
                        description="شارژ اولیه کیف پول",
                    )
                )
        db.add_all(transactions)
        await db.flush()

        # ── Penalties ──
        penalties: list[Penalty] = []
        for b in bookings:
            if b.status == BookingStatus.CANCELLED and b.penalty_amount and b.penalty_amount > 0:
                penalties.append(
                    Penalty(
                        user_id=b.user_id,
                        booking_id=b.id,
                        amount=b.penalty_amount,
                        reason="لغو دیرهنگام (کمتر از ۲۴ ساعت قبل)",
                    )
                )
        db.add_all(penalties)
        await db.flush()

        await db.commit()

        # ── Summary ──
        print("✅ Seed completed!")
        print(f"   Users:           {len(users)}")
        print(f"   Courts:          {len(courts)}")
        print(f"   Wallets:         {len(wallets)}")
        print(f"   Time slots:      {len(slots)}")
        print(f"   Bookings:        {len(bookings)}")
        print(f"   Payments:        {len(payments)}")
        print(f"   Reviews:         {len(reviews)}")
        print(f"   Notifications:   {len(notes)}")
        print(f"   Logs:            {len(logs)}")
        print(f"   Transactions:    {len(transactions)}")
        print(f"   Penalties:       {len(penalties)}")
        print(f"   Settings:        {len(setting_models)}")


if __name__ == "__main__":
    asyncio.run(seed())
