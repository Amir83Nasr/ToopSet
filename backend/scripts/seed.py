import asyncio
import random
from datetime import datetime, timedelta
from decimal import Decimal

from passlib.context import CryptContext
from sqlalchemy import text as sa_text

import app.models  # noqa: F401
from app.core.database import Base, async_session_factory, engine
from app.core.timezone import iran_to_utc, now_iran
from app.models.bank_card import BankCard, BankCardStatus
from app.models.booking import Booking, BookingSource, BookingStatus, SettlementStatus
from app.models.contact import ContactMessage
from app.models.favorite import Favorite
from app.models.log import Log
from app.models.notification import Notification, NotificationDelivery
from app.models.payment import Payment, PaymentStatus
from app.models.penalty import Penalty
from app.models.refund import Refund, RefundStatus, RefundType
from app.models.review import Review
from app.models.setting import Setting
from app.models.settlement import Settlement, SettlementItem, SettlementRequestStatus
from app.models.slot_cancellation import SlotCancellation
from app.models.time_slot import SlotGender, SlotStatus, TimeSlot
from app.models.user import User, UserRole
from app.models.vendor import SportType, Vendor
from app.models.vendor_image import VendorImage
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

# ── Vendors — real locations in Qom ──────────────────────────────────────────

AMENITY_PROFILES = {
    "premium": {
        "رختکن": True,
        "دوش": True,
        "سرویس بهداشتی": True,
        "پارکینگ": True,
        "نورپردازی": "LED حرفه‌ای",
        "کفپوش": "استاندارد بین‌المللی",
        "سالن سرپوشیده": True,
        "بوفه": True,
        "اینترنت وای‌فای": True,
        "دوربین مداربسته": True,
    },
    "standard": {
        "رختکن": True,
        "دوش": True,
        "سرویس بهداشتی": True,
        "پارکینگ": True,
        "نورپردازی": "استاندارد",
        "کفپوش": "استاندارد",
        "سالن سرپوشیده": True,
        "بوفه": False,
        "اینترنت وای‌فای": False,
        "دوربین مداربسته": True,
    },
    "basic": {
        "رختکن": True,
        "دوش": False,
        "سرویس بهداشتی": True,
        "پارکینگ": False,
        "نورپردازی": "معمولی",
        "کفپوش": "استاندارد",
        "سالن سرپوشیده": True,
        "بوفه": False,
        "دوربین مداربسته": True,
    },
    "open_air": {
        "رختکن": False,
        "دوش": False,
        "سرویس بهداشتی": True,
        "پارکینگ": True,
        "نورپردازی": "استاندارد",
        "کفپوش": "چمن مصنوعی",
        "سالن سرپوشیده": False,
        "بوفه": False,
        "دوربین مداربسته": False,
    },
    "full_service": {
        "رختکن": True,
        "دوش": True,
        "سرویس بهداشتی": True,
        "پارکینگ": "رایگان",
        "نورپردازی": "LED حرفه‌ای",
        "کفپوش": "استاندارد بین‌المللی",
        "سالن سرپوشیده": True,
        "بوفه": True,
        "اینترنت وای‌فای": True,
        "دوربین مداربسته": True,
        "سالن بدنسازی": True,
        "کافه": True,
    },
}

ALL_VENDORS = [
    Vendor(
        name="مجموعه ورزشی تختی قم",
        sport_types=[SportType.FUTSAL.value, SportType.VOLLEYBALL.value],
        address="قم، بلوار امین، جنب پارک شهر، مجموعه ورزشی تختی",
        latitude=34.63941,
        longitude=50.87614,
        capacity=20,
        amenities=AMENITY_PROFILES["standard"],
    ),
    Vendor(
        name="سالن بسکتبال ۲۲ بهمن",
        sport_types=[SportType.BASKETBALL.value],
        address="قم، خیابان ۲۲ بهمن، نرسیده به میدان جانبازان",
        latitude=34.62572,
        longitude=50.87031,
        capacity=30,
        amenities=AMENITY_PROFILES["standard"],
    ),
    Vendor(
        name="زمین فوتسال الغدیر",
        sport_types=[SportType.FUTSAL.value],
        address="قم، بلوار الغدیر، نبش کوچه ۲۱",
        latitude=34.61887,
        longitude=50.89103,
        capacity=14,
        amenities=AMENITY_PROFILES["basic"],
    ),
    Vendor(
        name="سالن ورزشی حضرت معصومه",
        sport_types=[SportType.VOLLEYBALL.value, SportType.HANDBALL.value],
        address="قم، خیابان دورشهر، کوچه شهید رحیمی، پلاک ۱۲",
        latitude=34.64219,
        longitude=50.87827,
        capacity=24,
        amenities=AMENITY_PROFILES["premium"],
    ),
    Vendor(
        name="مجموعه ورزشی شهدای قم",
        sport_types=[SportType.FUTSAL.value, SportType.BASKETBALL.value],
        address="قم، بلوار امین، روبروی بوستان شهید بنایی",
        latitude=34.64876,
        longitude=50.86812,
        capacity=18,
        amenities=AMENITY_PROFILES["standard"],
    ),
    Vendor(
        name="زمین والیبال دانشگاه قم",
        sport_types=[SportType.VOLLEYBALL.value],
        address="قم، بلوار جمهوری اسلامی، پردیس دانشگاه قم",
        latitude=34.65253,
        longitude=50.88055,
        capacity=16,
        amenities=AMENITY_PROFILES["basic"],
    ),
    Vendor(
        name="سالن ورزشی صدرا",
        sport_types=[SportType.FUTSAL.value, SportType.VOLLEYBALL.value],
        address="قم، شهرک صدرا، فاز ۳، بلوار ورزش",
        latitude=34.61012,
        longitude=50.85001,
        capacity=22,
        amenities=AMENITY_PROFILES["premium"],
    ),
    Vendor(
        name="زمین چمن مجموعه حرم",
        sport_types=[SportType.FOOTBALL.value],
        address="قم، خیابان ارم، جنب حرم مطهر حضرت معصومه",
        latitude=34.64190,
        longitude=50.88060,
        capacity=28,
        amenities=AMENITY_PROFILES["open_air"],
    ),
    Vendor(
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
        amenities=AMENITY_PROFILES["full_service"],
    ),
    Vendor(
        name="زمین تنیس هتل پارسیا",
        sport_types=[SportType.VOLLEYBALL.value],
        address="قم، بلوار جمهوری اسلامی، روبروی هتل پارسیا",
        latitude=34.64780,
        longitude=50.87750,
        capacity=8,
        amenities=AMENITY_PROFILES["premium"],
    ),
    Vendor(
        name="سالن هندبال شهید زینالدین",
        sport_types=[SportType.HANDBALL.value, SportType.FUTSAL.value],
        address="قم، خیابان امام خمینی، کوچه شهید زینالدین",
        latitude=34.64010,
        longitude=50.86980,
        capacity=20,
        amenities=AMENITY_PROFILES["standard"],
    ),
    Vendor(
        name="مجموعه ورزشی قدس",
        sport_types=[SportType.BASKETBALL.value, SportType.VOLLEYBALL.value],
        address="قم، شهرک قدس، بلوار امام رضا، نبش کوچه ۱۰",
        latitude=34.62050,
        longitude=50.86030,
        capacity=26,
        amenities=AMENITY_PROFILES["standard"],
    ),
    Vendor(
        name="زمین فوتسال بعثت",
        sport_types=[SportType.FUTSAL.value],
        address="قم، خیابان بعثت، کوچه ۱۸، پلاک ۳",
        latitude=34.63120,
        longitude=50.87560,
        capacity=14,
        amenities=AMENITY_PROFILES["basic"],
    ),
    Vendor(
        name="سالن ورزشی شهید بهشتی",
        sport_types=[SportType.VOLLEYBALL.value, SportType.HANDBALL.value],
        address="قم، بلوار امین، مجتمع فرهنگی ورزشی شهید بهشتی",
        latitude=34.64550,
        longitude=50.87240,
        capacity=30,
        amenities=AMENITY_PROFILES["premium"],
    ),
    Vendor(
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
        amenities=AMENITY_PROFILES["full_service"],
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


# ── Real uploaded filenames for vendor images ────────────────────────────────

VENDOR_IMAGE_FILES = [
    "082eff1f329f46a4bbc5261b1e907927.jpeg",
    "46fa6af19d634b0f8484200d5cde0e4f.jpeg",
    "5a38bfc3ab00439e885ae428d9c72982.jpeg",
    "5b518ca817834edf8e2f45c2df3b1c0d.jpeg",
    "5c8d45c9471e470b92337795bb0e1281.jpeg",
    "677429b5caed476e8a3b867e3892c1c1.jpg",
    "922131acb6b64cf581607c67e88f857f.jpeg",
    "9bab887eebcd463586bca8c65a2c64ca.jpeg",
    "a64da5ecac024a9eb37209f3121b9fe9.jpeg",
    "ba545dda754c4652aa81d2956fc506d9.jpg",
    "c386c718f8ba49248dbb0f727b6afe75.jpeg",
    "c578c51b2e594535a49ab9801af85a55.jpg",
    "d86126fe7f4b4e12821b4d6f5ff21429.png",
    "d920e46c57204c58a3290e60f7f0f84b.png",
    "da1693f5a8ec46e1b38cea8283a25264.jpeg",
    "db7ccabec4904dd488fdc184b6e2aa0b.jpeg",
    "de00f2113ed543b29b2caf9f8c735263.jpeg",
    "debbbb0229124cb4ab3a20c236c763e7.png",
    "2575658a4a7045508881fcbc16319a3c.jpg",
    "70f1cda56a7f4cc38aea1cbb14cb5cd5.jpeg",
    "9e4d856082604c0686aa70f32792be0b.jpeg",
    "e7bd300ab69d4fca88d823d0b3d8aa68.jpeg",
]


def assign_participants(sport_types: list[str]) -> int:
    """Return a realistic participants count based on sport type."""
    sport = sport_types[0] if sport_types else "futsal"
    counts = {
        SportType.FUTSAL.value: random.randint(8, 12),
        SportType.VOLLEYBALL.value: random.randint(10, 14),
        SportType.BASKETBALL.value: random.randint(8, 12),
        SportType.HANDBALL.value: random.randint(12, 16),
        SportType.FOOTBALL.value: random.randint(18, 24),
    }
    return counts.get(sport, 10)


def assign_gender(vendor_index: int) -> SlotGender:
    """Assign FEMALE to vendors at even indices for gender diversity."""
    return SlotGender.FEMALE if vendor_index % 3 == 0 else SlotGender.MALE


# ── Helpers ──────────────────────────────────────────────────────────────────


def assign_manager(users: list[User]) -> User:
    """Return the existing manager user."""
    for u in users:
        if u.role == UserRole.MANAGER:
            return u
    return users[0]


async def seed():
    async with engine.begin() as conn:
        # Drop all tables with CASCADE to handle legacy tables (e.g. old `courts`)
        # that may still reference our tables via foreign keys.
        await conn.execute(sa_text("DROP SCHEMA public CASCADE"))
        await conn.execute(sa_text("CREATE SCHEMA public"))
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        # ── Users ──
        db.add_all(ALL_USERS)
        await db.flush()
        users: list[User] = ALL_USERS
        regular_users = [u for u in users if u.role == UserRole.USER]
        manager = assign_manager(users)
        admin = users[0]

        # ── Vendors ──
        for vendor in ALL_VENDORS:
            vendor.manager_id = manager.id
        db.add_all(ALL_VENDORS)
        await db.flush()
        vendors: list[Vendor] = ALL_VENDORS

        # ── Vendor Images ──
        vendor_images: list[VendorImage] = []
        for vi, vendor in enumerate(vendors):
            # Each vendor gets 1-2 images, cycling through real filenames
            img_count = 2 if vi % 3 != 0 else 1
            for img_idx in range(img_count):
                file_idx = (vi * 2 + img_idx) % len(VENDOR_IMAGE_FILES)
                filename = VENDOR_IMAGE_FILES[file_idx]
                vendor_images.append(
                    VendorImage(
                        vendor_id=vendor.id,
                        url=f"/uploads/courts/{filename}",
                        order=img_idx,
                    )
                )
        db.add_all(vendor_images)
        await db.flush()

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

        # ── Bank Cards ──
        bank_cards: list[BankCard] = [
            BankCard(
                user_id=admin.id,
                encrypted_card_number="enc:AQEAAAABAAAAQJ9nF8k3m2x5R6v7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
                masked_card_number="603799******4281",
                card_fingerprint="fp_admin_001_603799",
                holder_name=admin.full_name,
                status=BankCardStatus.VERIFIED,
                verified_at=now_iran(),
            ),
            BankCard(
                user_id=manager.id,
                encrypted_card_number="enc:AQEAAAABAAAAQK8mF8k3m2x5R6v7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2g",
                masked_card_number="589210******7632",
                card_fingerprint="fp_manager_001_589210",
                holder_name=manager.full_name,
                status=BankCardStatus.VERIFIED,
                verified_at=now_iran(),
            ),
            BankCard(
                user_id=regular_users[0].id,
                encrypted_card_number="enc:AQEAAAABAAAAQJ9nF8k3m2x5R6v7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2h",
                masked_card_number="627353******1155",
                card_fingerprint="fp_user_002_627353",
                holder_name=regular_users[0].full_name,
                status=BankCardStatus.VERIFIED,
                verified_at=now_iran(),
            ),
            BankCard(
                user_id=regular_users[3].id,
                encrypted_card_number="enc:AQEAAAABAAAAQJ9nF8k3m2x5R6v7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2i",
                masked_card_number="502229******3344",
                card_fingerprint="fp_user_005_502229",
                holder_name=regular_users[3].full_name,
                status=BankCardStatus.PENDING_CONFIRMATION,
            ),
            BankCard(
                user_id=regular_users[8].id,
                encrypted_card_number="enc:AQEAAAABAAAAQJ9nF8k3m2x5R6v7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2j",
                masked_card_number="610433******5566",
                card_fingerprint="fp_user_010_610433",
                holder_name=regular_users[8].full_name,
                status=BankCardStatus.PENDING_CONFIRMATION,
            ),
        ]
        db.add_all(bank_cards)
        await db.flush()

        # ── Time slots (next 60 days, 5 fixed slots per vendor per day) ──
        now = now_iran()
        slots: list[TimeSlot] = []
        slot_by_vendor_day: dict[tuple[int, int], list[TimeSlot]] = {}
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
        for vi, vendor in enumerate(vendors):
            for day_offset in range(60):
                target_date = now + timedelta(days=day_offset)
                day_slots: list[TimeSlot] = []
                slot_gender = assign_gender(vi)
                # 60 days × 7 slots = 420 slots per vendor — pick 5 random per day
                for hour, minute, duration in random.sample(slot_schedules, 5):
                    start_iran = target_date.replace(
                        hour=hour, minute=minute, second=0, microsecond=0
                    )
                    end_iran = start_iran + timedelta(hours=duration)
                    slot = TimeSlot(
                        vendor_id=vendor.id,
                        start_time=iran_to_utc(start_iran),
                        end_time=iran_to_utc(end_iran),
                        base_price=random_price(),
                        ball_available=random.random() < 0.35,
                        ball_price=random_price(50, 150),
                        gender=slot_gender,
                    )
                    day_slots.append(slot)
                slots.extend(day_slots)
                slot_by_vendor_day[(vendor.id, day_offset)] = day_slots
        db.add_all(slots)
        await db.flush()
        slot_by_id = {slot.id: slot for slot in slots}

        # ── Bookings & payments ──
        # Create bookings spread across users and vendors, then payments for confirmed ones
        bookings: list[Booking] = []
        payments: list[Payment] = []

        booking_specs = [
            # (user_index, vendor_index, day_offset, slot_in_day, status)
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

        for user_idx, vendor_idx, day_off, slot_in_day, status in booking_specs:
            vendor = vendors[vendor_idx]
            day_slots = slot_by_vendor_day.get((vendor.id, day_off), [])
            if slot_in_day >= len(day_slots):
                continue
            slot = day_slots[slot_in_day]
            user = regular_users[user_idx % len(regular_users)]
            with_ball = slot.ball_available and random.random() < 0.4
            ball_price = slot.ball_price if with_ball else Decimal("0")
            total_price = slot.base_price + ball_price
            participants = assign_participants(vendor.sport_types)

            if status == "confirmed":
                b = Booking(
                    user_id=user.id,
                    slot_id=slot.id,
                    status=BookingStatus.CONFIRMED,
                    source=BookingSource.ONLINE,
                    settlement_status=SettlementStatus.NOT_SETTLED,
                    price_paid=total_price,
                    slot_price=slot.base_price,
                    ball_price=ball_price,
                    with_ball=with_ball,
                    participants_count=participants,
                )
                bookings.append(b)
            elif status == "pending_payment":
                b = Booking(
                    user_id=user.id,
                    slot_id=slot.id,
                    status=BookingStatus.PENDING_PAYMENT,
                    source=BookingSource.ONLINE,
                    settlement_status=SettlementStatus.NOT_SETTLED,
                    price_paid=total_price,
                    slot_price=slot.base_price,
                    ball_price=ball_price,
                    with_ball=with_ball,
                    participants_count=participants,
                    expires_at=iran_to_utc(now + timedelta(minutes=15)),
                )
                bookings.append(b)
            elif status == "cancelled":
                penalty_amount = (total_price * Decimal("0.10")).quantize(Decimal("1"))
                b = Booking(
                    user_id=user.id,
                    slot_id=slot.id,
                    status=BookingStatus.CANCELLED,
                    source=BookingSource.ONLINE,
                    settlement_status=SettlementStatus.EXCLUDED_DUE_TO_REFUND,
                    price_paid=total_price,
                    slot_price=slot.base_price,
                    ball_price=ball_price,
                    with_ball=with_ball,
                    penalty_amount=penalty_amount,
                    participants_count=participants,
                )
                bookings.append(b)

        db.add_all(bookings)
        await db.flush()

        # Mark slot availability according to the active booking state.
        for b in bookings:
            slot = slot_by_id[b.slot_id]
            if b.status == BookingStatus.CONFIRMED:
                slot.is_reserved = True
                slot.status = SlotStatus.RESERVED
            elif b.status == BookingStatus.PENDING_PAYMENT:
                slot.is_reserved = True
                slot.status = SlotStatus.RESERVING
            elif b.status == BookingStatus.CANCELLED:
                slot.is_reserved = False
                slot.status = SlotStatus.OPEN

        # ── Payments (confirmed → success, pending_payment → 30% failed) ──
        payment_counter = 1
        for b in bookings:
            if b.status == BookingStatus.CONFIRMED:
                card, bank = random_card()
                paid = b.created_at or now_iran()
                gateway_fee = (b.price_paid * Decimal("0.008")).quantize(Decimal("1"))
                payments.append(
                    Payment(
                        booking_id=b.id,
                        amount=b.price_paid,
                        status=PaymentStatus.SUCCESS,
                        gateway_name=f"زرین‌پال ({bank})",
                        gateway_transaction_id=f"ZP-{paid.strftime('%Y%m%d')}-{random.randint(1000000, 9999999)}",
                        ref_id=f"REF-{paid.strftime('%Y%m')}-{payment_counter:04d}",
                        gateway_fee=gateway_fee,
                        card_number=card,
                        paid_at=paid,
                    )
                )
                payment_counter += 1
            elif b.status == BookingStatus.PENDING_PAYMENT:
                # Some pending bookings have failed payments
                if random.random() < 0.3:
                    payments.append(
                        Payment(
                            booking_id=b.id,
                            amount=b.price_paid,
                            status=PaymentStatus.FAILED,
                            gateway_name=None,
                            gateway_transaction_id=None,
                            card_number=None,
                        )
                    )

        db.add_all(payments)
        await db.flush()

        # ── Manager-created bookings, refunds, cancellations and settlements ──
        refunds: list[Refund] = []
        slot_cancellations: list[SlotCancellation] = []
        notification_deliveries: list[NotificationDelivery] = []
        settlements: list[Settlement] = []
        settlement_items: list[SettlementItem] = []

        def free_slots_for_vendor(vendor: Vendor) -> list[TimeSlot]:
            return sorted(
                [
                    slot
                    for slot in slots
                    if slot.vendor_id == vendor.id
                    and not slot.is_reserved
                    and slot.status == SlotStatus.OPEN
                    and slot.start_time > iran_to_utc(now)
                ],
                key=lambda slot: slot.start_time,
            )

        # Manual one-off booking by manager. It has no online payment and should not be settled.
        manual_slot = free_slots_for_vendor(vendors[0])[0]
        manual_user = regular_users[0]
        manual_booking = Booking(
            user_id=manual_user.id,
            slot_id=manual_slot.id,
            status=BookingStatus.CONFIRMED,
            source=BookingSource.MANAGER_MANUAL,
            settlement_status=SettlementStatus.EXCLUDED_DUE_TO_CANCELLATION,
            created_by_manager_id=manager.id,
            customer_full_name=manual_user.full_name,
            customer_phone=manual_user.phone,
            price_paid=Decimal("0"),
            slot_price=manual_slot.base_price,
            ball_price=Decimal("0"),
            with_ball=False,
            participants_count=10,
        )
        bookings.append(manual_booking)
        manual_slot.is_reserved = True
        manual_slot.status = SlotStatus.RESERVED

        # Recurring manager bookings: sample data for the weekly table and manager booking flow.
        recurring_slots = free_slots_for_vendor(vendors[1])[:4]
        for idx, slot in enumerate(recurring_slots, start=1):
            recurring_booking = Booking(
                user_id=regular_users[1].id,
                slot_id=slot.id,
                status=BookingStatus.CONFIRMED,
                source=BookingSource.MANAGER_MANUAL,
                settlement_status=SettlementStatus.EXCLUDED_DUE_TO_CANCELLATION,
                created_by_manager_id=manager.id,
                customer_full_name="تیم ثابت شنبه شب",
                customer_phone="09127001122",
                price_paid=Decimal("0"),
                slot_price=slot.base_price,
                ball_price=Decimal("0"),
                with_ball=False,
                participants_count=12,
            )
            bookings.append(recurring_booking)
            slot.is_reserved = True
            slot.status = SlotStatus.RESERVED

        # Manager cancellation of an online-paid booking, blocked without releasing the slot.
        manager_cancel_slot = free_slots_for_vendor(vendors[2])[0]
        manager_cancel_user = regular_users[2]
        manager_cancel_total = manager_cancel_slot.base_price
        manager_cancel_booking = Booking(
            user_id=manager_cancel_user.id,
            slot_id=manager_cancel_slot.id,
            status=BookingStatus.CANCELLED,
            source=BookingSource.ONLINE,
            settlement_status=SettlementStatus.EXCLUDED_DUE_TO_CANCELLATION,
            price_paid=manager_cancel_total,
            slot_price=manager_cancel_slot.base_price,
            ball_price=Decimal("0"),
            with_ball=False,
            penalty_amount=Decimal("0"),
            participants_count=10,
        )
        bookings.append(manager_cancel_booking)
        manager_cancel_slot.is_reserved = False
        manager_cancel_slot.status = SlotStatus.BLOCKED

        db.add_all([manual_booking, *bookings[-len(recurring_slots) - 1 :]])
        await db.flush()

        paid_at = now_iran()
        payments.append(
            Payment(
                booking_id=manager_cancel_booking.id,
                amount=manager_cancel_booking.price_paid,
                status=PaymentStatus.SUCCESS,
                gateway_name="زرین‌پال (تست لغو سالندار)",
                gateway_transaction_id=f"ZP-MANAGER-CANCEL-{manager_cancel_booking.id}",
                ref_id=f"REF-MC-{manager_cancel_booking.id:04d}",
                gateway_fee=(manager_cancel_booking.price_paid * Decimal("0.008")).quantize(
                    Decimal("1")
                ),
                paid_at=paid_at,
            )
        )

        # Refund rows for user-cancelled online bookings: 10% penalty charged to user.
        for b in bookings:
            if (
                b.status == BookingStatus.CANCELLED
                and b.source == BookingSource.ONLINE
                and b.id != manager_cancel_booking.id
            ):
                slot = slot_by_id[b.slot_id]
                penalty = b.penalty_amount or (b.price_paid * Decimal("0.10")).quantize(
                    Decimal("1")
                )
                refunds.append(
                    Refund(
                        booking_id=b.id,
                        user_id=b.user_id,
                        vendor_id=slot.vendor_id,
                        slot_id=slot.id,
                        slot_start_time=slot.start_time,
                        slot_end_time=slot.end_time,
                        original_amount=b.price_paid,
                        slot_price=b.slot_price,
                        ball_price=b.ball_price,
                        total_paid=b.price_paid,
                        penalty_amount=penalty,
                        refund_amount=b.price_paid - penalty,
                        reason="لغو توسط کاربر بیش از ۴۸ ساعت قبل از شروع سانس",
                        type=RefundType.USER_CANCELLATION,
                        status=RefundStatus.PENDING,
                        penalty_charged_to_user=True,
                        site_bears_penalty=False,
                    )
                )

        refunds.append(
            Refund(
                booking_id=manager_cancel_booking.id,
                user_id=manager_cancel_booking.user_id,
                vendor_id=manager_cancel_slot.vendor_id,
                slot_id=manager_cancel_slot.id,
                slot_start_time=manager_cancel_slot.start_time,
                slot_end_time=manager_cancel_slot.end_time,
                original_amount=manager_cancel_booking.price_paid,
                slot_price=manager_cancel_booking.slot_price,
                ball_price=manager_cancel_booking.ball_price,
                total_paid=manager_cancel_booking.price_paid,
                penalty_amount=Decimal("0"),
                refund_amount=manager_cancel_booking.price_paid,
                reason="لغو توسط سالندار به دلیل تعمیرات مجموعه",
                type=RefundType.MANAGER_CANCELLATION,
                status=RefundStatus.PENDING,
                penalty_charged_to_user=False,
                site_bears_penalty=True,
            )
        )

        cancellation_note = Notification(
            user_id=manager_cancel_user.id,
            type="slot_cancelled_by_manager",
            message="سانس شما توسط سالندار لغو شد. وضعیت عودت وجه در حال بررسی است.",
            is_read=False,
        )
        db.add(cancellation_note)
        await db.flush()

        slot_cancellations.append(
            SlotCancellation(
                slot_id=manager_cancel_slot.id,
                booking_id=manager_cancel_booking.id,
                vendor_id=manager_cancel_slot.vendor_id,
                manager_id=manager.id,
                affected_user_id=manager_cancel_user.id,
                affected_full_name=manager_cancel_user.full_name,
                affected_phone=manager_cancel_user.phone,
                reason="تعمیرات اضطراری کف‌پوش سالن",
                release_slot=False,
                online_paid_amount=manager_cancel_booking.price_paid,
                site_cost_amount=manager_cancel_booking.price_paid,
                sms_status="sent",
                notification_status="sent",
                review_status="pending",
            )
        )
        notification_deliveries.extend(
            [
                NotificationDelivery(
                    notification_id=cancellation_note.id,
                    user_id=manager_cancel_user.id,
                    booking_id=manager_cancel_booking.id,
                    channel="in_app",
                    status="sent",
                    attempts=1,
                    sent_at=paid_at,
                ),
                NotificationDelivery(
                    notification_id=cancellation_note.id,
                    user_id=manager_cancel_user.id,
                    booking_id=manager_cancel_booking.id,
                    channel="sms",
                    phone_number=manager_cancel_user.phone,
                    status="sent",
                    attempts=1,
                    sent_at=paid_at,
                ),
            ]
        )

        db.add_all(payments[-1:])
        db.add_all(refunds)
        db.add_all(slot_cancellations)
        db.add_all(notification_deliveries)
        await db.flush()

        online_confirmed = [
            b
            for b in bookings
            if b.status == BookingStatus.CONFIRMED
            and b.source == BookingSource.ONLINE
            and b.settlement_status == SettlementStatus.NOT_SETTLED
        ]
        pending_items_source = online_confirmed[:3]
        if pending_items_source:
            requested_amount = sum((b.price_paid for b in pending_items_source), Decimal("0"))
            settlement = Settlement(
                manager_id=manager.id,
                vendor_id=slot_by_id[pending_items_source[0].slot_id].vendor_id,
                requested_amount=requested_amount,
                bookings_count=len(pending_items_source),
                period_from=pending_items_source[0].created_at,
                period_to=paid_at,
                status=SettlementRequestStatus.PENDING,
                manager_note="درخواست تسویه نمونه برای رزروهای آنلاین موفق",
            )
            settlements.append(settlement)
            db.add(settlement)
            await db.flush()
            for b in pending_items_source:
                b.settlement_status = SettlementStatus.SETTLEMENT_REQUESTED
                settlement_items.append(
                    SettlementItem(
                        settlement_id=settlement.id,
                        booking_id=b.id,
                        amount=b.price_paid,
                    )
                )

        paid_items_source = online_confirmed[3:5]
        if paid_items_source:
            paid_amount = sum((b.price_paid for b in paid_items_source), Decimal("0"))
            paid_settlement = Settlement(
                manager_id=manager.id,
                vendor_id=slot_by_id[paid_items_source[0].slot_id].vendor_id,
                requested_amount=paid_amount,
                approved_amount=paid_amount,
                bookings_count=len(paid_items_source),
                period_from=paid_items_source[0].created_at,
                period_to=paid_at,
                status=SettlementRequestStatus.PAID,
                manager_note="تسویه پرداخت‌شده نمونه",
                admin_note="پرداخت دستی انجام شد",
                payment_tracking_code="PAY-SEED-1404-001",
                approved_at=paid_at,
                paid_at=paid_at,
            )
            settlements.append(paid_settlement)
            db.add(paid_settlement)
            await db.flush()
            for b in paid_items_source:
                b.settlement_status = SettlementStatus.SETTLED
                settlement_items.append(
                    SettlementItem(
                        settlement_id=paid_settlement.id,
                        booking_id=b.id,
                        amount=b.price_paid,
                    )
                )

        db.add_all(settlement_items)
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
            # Extra reviews for vendors with only 1 review — ensure every vendor has ≥2
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

        # Manager responses for a selection of reviews
        REVIEW_RESPONSES: dict[int, str] = {
            0: "ممنون از نظر شما. همیشه تلاش می‌کنیم بهترین خدمات رو ارائه بدیم.",
            2: "خوشحالیم که راضی بودید. منتظر حضور دوباره شما هستیم.",
            7: "ممنون از نظر سازنده‌تان. به زودی کفپوش سالن رو تعویض می‌کنیم.",
            12: "سپاس از ارزیابی شما. نورپردازی سالن جدیداً به‌روزرسانی شده.",
            14: "ممنون. قیمت‌ها رو نسبت به رقبا مناسب نگه داشتیم.",
            18: "از وقت‌شناسی تیم ما عذرخواهی می‌کنیم. حتماً پیگیری می‌کنیم.",
            25: "ممنون از نظر شما. تخته‌های والیبال رو تعویض کردیم.",
            30: "خوشحالیم که رضایت دارید. همیشه در خدمت شما هستیم.",
        }

        reviews: list[Review] = []
        used_booking_ids: set[int] = set()
        for i, (ui, ci, comment, rating) in enumerate(review_data):
            # find a booking by this user for this vendor that hasn't been used yet
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
                    if slot and slot.vendor_id == vendors[ci].id:
                        booking = b
                        break

            if booking:
                used_booking_ids.add(booking.id)
                response = REVIEW_RESPONSES.get(i)
                reviews.append(
                    Review(
                        user_id=regular_users[ui % len(regular_users)].id,
                        vendor_id=vendors[ci].id,
                        booking_id=booking.id,
                        rating=rating,
                        comment=comment,
                        response=response,
                    )
                )

        db.add_all(reviews)
        await db.flush()

        # ── Update vendor average_rating from reviews ──
        from sqlalchemy import func as sa_func
        from sqlalchemy import select

        for vendor in vendors:
            result = await db.execute(
                select(sa_func.avg(Review.rating)).where(Review.vendor_id == vendor.id)
            )
            avg = result.scalar()
            vendor.average_rating = round(float(avg), 1) if avg else 0.0

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
            {"key": "cancel_window_hours", "value": "48", "description": "مهلت کنسل کردن (ساعت)"},
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
                severity="INFO",
                ip_address="127.0.0.1",
            ),
            Log(
                user_id=admin.id,
                action="vendor_approved",
                details="تأیید مجموعه | مجموعه ورزشی تختی قم تأیید شد",
                severity="INFO",
                ip_address="127.0.0.1",
            ),
            Log(
                user_id=manager.id,
                action="booking_created",
                details="رزرو جدید | رزرو زمین فوتسال الغدیر توسط مهدی امامی",
                severity="INFO",
                ip_address="10.0.0.5",
            ),
            Log(
                user_id=admin.id,
                action="broadcast_sent",
                details="ارسال پیام همگانی | پیام تخفیف عید قربان برای همه کاربران ارسال شد",
                severity="INFO",
                ip_address="127.0.0.1",
            ),
            Log(
                user_id=manager.id,
                action="court_updated",
                details="به‌روزرسانی مجموعه | قیمت مجموعه ورزشی تختی قم تغییر کرد",
                severity="INFO",
                ip_address="10.0.0.5",
            ),
            Log(
                user_id=admin.id,
                action="user_role_changed",
                details="تغییر نقش | نقش ایمان کربلایی به مدیر مجموعه تغییر کرد",
                severity="WARNING",
                ip_address="127.0.0.1",
            ),
            Log(
                user_id=admin.id,
                action="settings_updated",
                details="تنظیمات سیستم | مهلت لغو رزرو به ۴۸ ساعت تغییر کرد",
                severity="INFO",
                ip_address="127.0.0.1",
            ),
            Log(
                user_id=manager.id,
                action="manager_slot_cancelled",
                details="لغو سانس توسط سالندار | سانس به دلیل تعمیرات اضطراری مسدود شد",
                severity="WARNING",
                ip_address="10.0.0.5",
            ),
            Log(
                user_id=admin.id,
                action="settlement_requested",
                details="درخواست تسویه | درخواست تسویه نمونه برای مجموعه ثبت شد",
                severity="INFO",
                ip_address="127.0.0.1",
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
                type="withdrawal",
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

        # ── Favorites ──
        favorites: list[Favorite] = []
        favorite_pairs = [
            (2, 0),
            (2, 2),
            (2, 8),
            (3, 3),
            (3, 6),
            (4, 1),
            (4, 4),
            (5, 5),
            (5, 8),
            (6, 0),
            (6, 7),
            (7, 8),
            (7, 14),
            (8, 3),
            (8, 10),
            (9, 4),
            (9, 11),
            (10, 5),
            (10, 6),
            (11, 2),
            (12, 13),
            (13, 0),
            (14, 14),
            (15, 12),
        ]
        for user_idx, vendor_idx in favorite_pairs:
            if user_idx < len(regular_users) and vendor_idx < len(vendors):
                favorites.append(
                    Favorite(
                        user_id=regular_users[user_idx].id,
                        vendor_id=vendors[vendor_idx].id,
                    )
                )
        db.add_all(favorites)
        await db.flush()

        # ── Contact Messages ──
        contact_messages: list[ContactMessage] = [
            ContactMessage(
                name="محمد رضایی",
                email="m.rezaei@example.com",
                phone="09125556677",
                subject="پیشنهاد همکاری",
                message="سلام. من صاحب یک مجموعه ورزشی در شهرک قدس هستم. مایل به همکاری با توپ‌ست برای ثبت مجموعه در سامانه هستم. لطفاً راهنمایی بفرمایید.",
            ),
            ContactMessage(
                name="سارا احمدی",
                phone="09123334455",
                subject="مشکل در پرداخت",
                message="سلام. دیروز برای رزرو زمین فوتسال مبلغ از حساب من کسر شد اما رزرو انجام نشد. لطفاً پیگیری کنید. شماره پیگیری تراکنش: ۱۴۰۴۰۳۲۱-۰۰۴۵",
            ),
            ContactMessage(
                name="رضا کریمی",
                email="r.karimi@example.com",
                phone="09125554433",
                subject="ثبت نام مدیر مجموعه",
                message="سلام. چگونه می‌توانم به عنوان مدیر مجموعه در سامانه ثبت نام کنم؟ مدارک لازم چیست؟",
            ),
            ContactMessage(
                name="زهرا موسوی",
                phone="09128886655",
                subject="انتقاد و پیشنهاد",
                message="سامانه خوبی دارید. کاش امکان رزرو هفتگی هم وجود داشت تا هر هفته مجبور نباشیم جداگانه رزرو کنیم.",
            ),
        ]
        db.add_all(contact_messages)
        await db.flush()

        await db.commit()

        # ── Summary ──
        print("✅ Seed completed!")
        print(f"   Users:              {len(users)}")
        print(f"   Vendors:            {len(vendors)}")
        print(f"   Vendor Images:      {len(vendor_images)}")
        print(f"   Wallets:            {len(wallets)}")
        print(f"   Bank Cards:         {len(bank_cards)}")
        print(f"   Time slots:         {len(slots)}")
        print(f"   Bookings:           {len(bookings)}")
        print(f"   Payments:           {len(payments)}")
        print(f"   Refunds:            {len(refunds)}")
        print(f"   Cancellations:      {len(slot_cancellations)}")
        print(f"   Settlements:        {len(settlements)}")
        print(f"   SettlementItems:    {len(settlement_items)}")
        print(f"   Reviews:            {len(reviews)}")
        print(f"   Notifications:      {len(notes) + 1}")
        print(f"   Deliveries:         {len(notification_deliveries)}")
        print(f"   Logs:               {len(logs)}")
        print(f"   Transactions:       {len(transactions)}")
        print(f"   Penalties:          {len(penalties)}")
        print(f"   Settings:           {len(setting_models)}")
        print(f"   Favorites:          {len(favorites)}")
        print(f"   Contact Messages:   {len(contact_messages)}")


if __name__ == "__main__":
    asyncio.run(seed())
