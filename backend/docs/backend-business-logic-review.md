# گزارش Code Review بک‌اند - سیستم رزرو مجموعه‌های ورزشی

تاریخ بررسی: 2026-06-29  
دامنه بررسی: `backend/app`, `backend/tests`, `backend/migrations`

این گزارش بر اساس Business Logic تعریف‌شده برای سیستم رزرو مجموعه‌های ورزشی تهیه شده است. هدف بررسی صرفاً سینتکس یا کیفیت عمومی کد نیست؛ بلکه تمرکز روی انطباق منطق کسب‌وکار، امنیت، تراکنش‌های مالی، وضعیت‌های رزرو و سانس، کنترل دسترسی، طراحی دیتابیس و edge caseها است.

## خلاصه مدیریتی

پیاده‌سازی فعلی برای یک MVP ساده شامل احراز هویت، مجموعه‌ها، سانس‌ها، رزرو، پرداخت mock، کیف پول و پنل‌های پایه Admin/Manager قابل استفاده است، اما با Business Logic تعریف‌شده فاصله جدی دارد.

مهم‌ترین عدم انطباق‌ها:

- منطق کنسلی ۴۸ ساعته و `Pending Cancellation` پیاده‌سازی نشده است.
- Refund بدون کارت بانکی تأییدشده انجام می‌شود و موجودیت `BankCard` وجود ندارد.
- Race Condition در رزرو، پرداخت، لغو و Refund وجود دارد.
- Manager می‌تواند فرآیند تأیید مجموعه توسط Admin را دور بزند.
- هر Manager فقط یک مجموعه می‌تواند بسازد، در حالی که requirement جدید چند مجموعه را لازم می‌داند.
- مجموعه Pending می‌تواند سانس داشته باشد و در شرایطی قابل رزرو است.
- گزینه رزرو سانس با توپ یا بدون توپ وجود ندارد.
- مدل User طبق تصمیم محصول با `full_name` قابل قبول است، اما `birth_date` و کارت بانکی کاربر در نسخه اولیه وجود نداشتند.
- Facility و SportType نرمال نشده‌اند.
- Vendor reservation رایگان و long-term reservation پیاده‌سازی نشده است.
- وضعیت‌های رزرو و سانس برای پوشش تمام فرآیندها کافی نیستند.

تست هدفمند اجرا شده:

```bash
.venv/bin/python -m pytest tests/test_bookings.py tests/test_time_slots.py -q
```

نتیجه:

```text
21 passed, 8 warnings
```

این تست‌ها فقط مسیرهای پایه booking و time slot را پوشش می‌دهند و edge caseهای اصلی مثل race condition، کنسلی ۴۸ ساعته، pending cancellation، کارت بانکی، گزینه توپ و IDOR manager را پوشش نمی‌دهند.

## وضعیت پیاده‌سازی نقش‌ها

### وضعیت فعلی

در `backend/app/models/user.py` نقش‌ها به صورت enum زیر تعریف شده‌اند:

```python
class UserRole(str, enum.Enum):
    USER = "user"
    MANAGER = "manager"
    ADMIN = "admin"
```

سیستم از `manager` به جای `vendor` استفاده می‌کند. طبق تصمیم محصول، همین mapping درست است: سالن‌دار همان Userی است که Admin به او دسترسی Manager می‌دهد و از مسیر «مجموعه‌های من» در فرانت مجموعه ایجاد می‌کند.

### مشکلات

1. Workflow تبدیل User به Manager با تصمیم محصول سازگار است.
   - تغییر نقش توسط Admin در `UserService.update_role` انجام می‌شود.
   - درخواست مستقل Manager شدن لازم نیست؛ Admin دسترسی Manager را به User می‌دهد.

2. نام roleها قابل قبول است.
   - requirement از `USER | MANAGER | ADMIN` استفاده کرده که با enum فعلی سازگار است.
   - Vendor در متن اولیه همان Manager فعلی محسوب می‌شود.

### ریسک

ریسک پایین. با فرض اینکه اعطای دسترسی Manager عملیاتی ادمین است، مدل فعلی قابل قبول است؛ فقط audit log تغییر role باید حفظ شود.

### پیشنهاد اصلاح

- حفظ تغییر role فقط از مسیر Admin.
- ثبت audit log برای تغییر role.
- تمرکز approval روی خود مجموعه ورزشی، نه روی درخواست Manager شدن.

## User Logic و User Model

### وضعیت فعلی

مدل User شامل این فیلدها است:

- `full_name`
- `phone`
- `password_hash`
- `role`
- `avatar_url`
- `token_version`
- `is_active`
- `created_at`

مسیرهای auth شامل:

- ثبت‌نام با موبایل و رمز عبور
- ورود با موبایل و رمز عبور
- ارسال OTP
- تأیید OTP
- بروزرسانی پروفایل

### عدم انطباق‌ها

1. `full_name` به جای `first_name` و `last_name` استفاده می‌شود.
   - طبق تصمیم محصول، همین مدل قابل قبول است و نقص محسوب نمی‌شود.

2. `birth_date` وجود ندارد.
   - requirement آن را optional می‌داند.

3. `bank_card` یا ارتباط با `BankCard` وجود ندارد.
   - requirement آن را optional می‌داند، ولی برای Refund الزامی عملیاتی است.

4. Validation موبایل کامل نیست.
   - در `RegisterRequest` فقط `min_length=10` و `max_length=16` وجود دارد.
   - pattern مشخص مثل `^09\d{9}$` برای موبایل ایران اعمال نشده است.

5. ثبت‌نام OTP برای کاربر جدید فقط `full_name` می‌گیرد.
   - طبق requirement عملیاتی پروژه، دریافت یک‌باره `full_name` کافی است.

### ریسک

ریسک متوسط. استفاده از `full_name` پذیرفته شده است، اما برای تطبیق مالک کارت باید همین مقدار با پاسخ سرویس بانکی مقایسه یا حداقل در review انسانی قابل مشاهده باشد.

### پیشنهاد اصلاح

مدل پیشنهادی:

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(11), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(128))
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.USER)
```

Schema پیشنهادی:

```python
class RegisterRequest(BaseModel):
    phone: str = Field(..., pattern=r"^09\d{9}$")
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=128)
```

## Authentication و OTP

### نقاط مثبت

- OTP با Redis و TTL نود ثانیه‌ای ذخیره می‌شود.
- ارسال OTP rate limit داخلی per-phone دارد.
- تلاش ناموفق OTP محدود می‌شود.
- refresh token rotation و replay detection وجود دارد.
- JWT شامل `token_version` است و invalidation انجام می‌شود.

### مشکلات

1. کد OTP در development برگردانده می‌شود.
   - اگر config محیط اشتباه باشد، احتمال نشت OTP وجود دارد.

2. validation موبایل ضعیف است.

3. rate limiter اگر Redis در دسترس نباشد به memory fallback می‌کند.
   - در محیط چند instance قابل اتکا نیست.

### ریسک

ریسک متوسط. برای production باید اطمینان حاصل شود provider mock و dev_code هرگز فعال نباشند.

### پیشنهاد اصلاح

- enforce production config.
- حذف کامل `dev_code` در هر محیط غیر local.
- pattern موبایل.
- rate limit مبتنی بر Redis بدون fallback silent در production.

## Reservation Logic

### وضعیت فعلی

رزرو در `BookingService.create_booking` انجام می‌شود:

- slot خوانده می‌شود.
- `is_reserved` بررسی می‌شود.
- `version` بررسی می‌شود.
- ظرفیت بررسی می‌شود.
- وجود booking برای slot بررسی می‌شود.
- booking با status `pending_payment` ساخته می‌شود.

پرداخت در `pay_booking` انجام می‌شود:

- mock gateway فراخوانی می‌شود.
- رکورد payment ساخته می‌شود.
- slot با `is_reserved=True` آپدیت می‌شود.
- booking به `confirmed` تغییر می‌کند.

### مشکلات

1. Race Condition در create booking.
   - منطق check-then-insert بدون row lock انجام می‌شود.
   - Unique روی `bookings.slot_id` وجود دارد، اما خطای race را به شکل business-safe مدیریت نمی‌کند.

2. Race Condition در payment.
   - Gateway قبل از lock قطعی slot فراخوانی می‌شود.
   - دو درخواست پرداخت همزمان می‌توانند هر دو به gateway بروند.

3. تراکنش مالی atomic نیست.
   - پرداخت خارجی، ثبت payment، تغییر slot و تغییر booking در یک طراحی saga/idempotent قرار نگرفته‌اند.

4. رزرو روی مجموعه غیرفعال قابل جلوگیری نیست.
   - `create_booking` active بودن vendor را چک نمی‌کند.

5. رزرو pending جلوی رزرو بعدی را می‌گیرد.
   - چون `bookings.slot_id` unique است، یک `pending_payment` منقضی‌نشده یا حتی منقضی‌شده تا قبل از job cleanup می‌تواند slot را قفل کند.

6. idempotency برای duplicate request وجود ندارد.

### ریسک

ریسک بالا. در شرایط پرداخت و رزرو همزمان، امکان خطای مالی، پرداخت اضافه، conflict دیتابیسی و تجربه کاربری نامعتبر وجود دارد.

### پیشنهاد اصلاح

- استفاده از `SELECT ... FOR UPDATE` روی slot هنگام رزرو/پرداخت/لغو.
- استفاده از status صریح slot:
  - `open`
  - `held`
  - `reserved`
  - `pending_cancellation`
  - `closed`
- افزودن idempotency key برای booking و payment.
- استفاده از saga برای payment:
  - hold slot
  - create pending payment
  - external gateway
  - confirm payment and booking
  - release on failure

نمونه:

```python
slot = await db.scalar(
    select(TimeSlot)
    .where(TimeSlot.id == data.slot_id)
    .with_for_update()
)

if slot.status != SlotStatus.OPEN:
    raise HTTPException(409, "سانس قابل رزرو نیست")

if not slot.vendor.is_active:
    raise HTTPException(409, "مجموعه هنوز فعال نیست")

slot.status = SlotStatus.HELD
booking = Booking(
    user_id=current_user.id,
    slot_id=slot.id,
    status=BookingStatus.PENDING_PAYMENT,
    expires_at=now_utc() + timedelta(minutes=10),
)
```

## Cancellation Logic

### Business Logic مورد انتظار

اگر تا شروع سانس بیشتر از ۴۸ ساعت باقی مانده باشد:

- کاربر می‌تواند لغو کند.
- مبلغ با کسر ۱۰٪ جریمه بازگردد.

اگر کمتر از ۴۸ ساعت باقی مانده باشد:

- کاربر اجازه لغو مستقیم ندارد.
- رزرو وارد `Pending Cancellation` شود.
- اگر شخص دیگری همان سانس را قبل از شروع رزرو کند:
  - رزرو قبلی حذف یا منتقل شود.
  - سانس به کاربر جدید منتقل شود.
  - کاربر قبلی با کسر ۱۰٪ جریمه refund شود.
- اگر تا شروع سانس رزرو نشود:
  - هیچ مبلغی به کاربر قبلی بازنگردد.
  - کل مبلغ درآمد سالن‌دار شود.

### وضعیت فعلی

کد فعلی:

- کمتر از ۲ ساعت: لغو ممنوع.
- کمتر یا مساوی ۲۴ ساعت: ۵۰٪ جریمه و ۵۰٪ refund.
- بیشتر از ۲۴ ساعت: refund کامل.
- وضعیت `pending_cancellation` وجود ندارد.
- انتقال مالکیت reservation وجود ندارد.

### مشکلات

1. پنجره زمانی کاملاً اشتباه است.
   - ۲ و ۲۴ ساعت استفاده شده، نه ۴۸ ساعت.

2. درصد جریمه اشتباه است.
   - ۵۰٪ یا ۰٪ استفاده شده، نه ۱۰٪.

3. مرز دقیق ۴۸ ساعت مدیریت نشده است.

4. `Pending Cancellation` وجود ندارد.

5. منطق rebooking توسط کاربر جدید وجود ندارد.

6. عدم refund در صورت پیدا نشدن جایگزین پیاده نشده است.

7. double refund با race condition ممکن است.

8. Refund بدون کارت بانکی تأییدشده انجام می‌شود.

### ریسک

ریسک بسیار بالا. این بخش مستقیماً روی پول کاربر و درآمد سالن‌دار اثر دارد.

### پیشنهاد اصلاح

افزودن statusها:

```python
class BookingStatus(str, enum.Enum):
    PENDING_PAYMENT = "pending_payment"
    CONFIRMED = "confirmed"
    PENDING_CANCELLATION = "pending_cancellation"
    TRANSFERRED = "transferred"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
```

افزودن فیلدهای لازم:

- `cancellation_requested_at`
- `cancelled_at`
- `refund_status`
- `refund_amount`
- `penalty_amount`
- `transferred_to_booking_id`
- `replacement_deadline`

نمونه منطق:

```python
remaining = slot.start_time - now_utc()

if remaining >= timedelta(hours=48):
    penalty = booking.price_paid * Decimal("0.10")
    refund = booking.price_paid - penalty
    await refund_service.refund_to_verified_card(booking, refund)
    booking.status = BookingStatus.CANCELLED
    slot.status = SlotStatus.OPEN
else:
    booking.status = BookingStatus.PENDING_CANCELLATION
    slot.status = SlotStatus.PENDING_CANCELLATION
```

## Bank Card Verification Before Refund

### وضعیت فعلی

هیچ‌کدام از اجزای زیر وجود ندارد:

- entity `BankCard`
- endpoint ثبت کارت
- سرویس استعلام مالک کارت
- وضعیت کارت تأییدشده
- تأیید کاربر پس از مشاهده نام دارنده کارت
- اجبار کارت تأییدشده قبل از Refund
- encrypt/mask مناسب کارت بانکی در storage
- جلوگیری از ثبت اطلاعات حساس در log

Refund فعلی با `WalletRepo.add_balance` انجام می‌شود و به حساب بانکی وابسته نیست.

### مشکلات

1. Refund بدون کارت تأییدشده انجام می‌شود.

2. شماره کارت کاربر ذخیره نمی‌شود.

3. امکان تطبیق نام دارنده کارت با نام کاربر وجود ندارد.

4. failure mode سرویس خارجی مشخص نیست.

5. audit trail برای تأیید کارت و refund بانکی وجود ندارد.

### ریسک

ریسک بسیار بالا. این بخش برای انطباق مالی، جلوگیری از fraud و کنترل refund الزامی است.

### پیشنهاد طراحی

Entity پیشنهادی:

```python
class BankCardStatus(str, enum.Enum):
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED = "verified"
    REJECTED = "rejected"


class BankCard(Base):
    __tablename__ = "bank_cards"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    encrypted_card_number: Mapped[str] = mapped_column(String(512))
    masked_card_number: Mapped[str] = mapped_column(String(32))
    holder_name: Mapped[str | None] = mapped_column(String(128))
    status: Mapped[BankCardStatus]
    verified_at: Mapped[datetime | None]
    created_at: Mapped[datetime]
```

Flow پیشنهادی:

1. کاربر شماره کارت را وارد می‌کند.
2. کارت validate می‌شود.
3. سرویس خارجی استعلام مالک کارت فراخوانی می‌شود.
4. نام دارنده کارت به صورت کنترل‌شده نمایش داده می‌شود.
5. کاربر تأیید می‌کند.
6. کارت `VERIFIED` می‌شود.
7. فقط پس از آن Refund مجاز است.

رفتار خطا:

- timeout سرویس خارجی: status کارت `PENDING_VERIFICATION` بماند و کاربر پیام retry بگیرد.
- mismatch نام: status کارت `REJECTED`.
- سرویس unavailable: Refund شروع نشود.
- logها فقط `masked_card_number` و `bank_card_id` داشته باشند.

## Vendor / Manager Logic

### وضعیت فعلی

- فقط Manager می‌تواند مجموعه بسازد.
- مجموعه با `is_active=False` ساخته می‌شود.
- Admin endpoint برای approve/reject وجود دارد.

### مشکلات

1. Manager فقط یک مجموعه می‌تواند بسازد.
   - در requirement جدید، هر Manager باید چندین مجموعه بسازد.

2. Manager می‌تواند `is_active` را با update تغییر دهد.
   - این یعنی approval قابل دور زدن است.

3. مدل `VenueApproval` وجود ندارد.
   - فقط boolean `is_active` داریم.

4. State transition کامل وجود ندارد.
   - `Create Venue Request -> Pending Approval -> Admin Approval -> Active -> Complete Venue Information`
   - در کد فقط `is_active=False/True` وجود دارد.

5. مجموعه Pending می‌تواند slot بسازد.

6. مجموعه Pending ممکن است قابل رزرو شود.

### ریسک

ریسک بالا. Broken workflow و امکان فعال‌سازی غیرمجاز مجموعه باعث نقض مستقیم Business Logic می‌شود.

### پیشنهاد اصلاح

افزودن status:

```python
class VenueStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    ACTIVE = "active"
    REJECTED = "rejected"
    SUSPENDED = "suspended"
```

افزودن entity:

```python
class VenueApproval(Base):
    __tablename__ = "venue_approvals"

    id: Mapped[int] = mapped_column(primary_key=True)
    venue_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"))
    requested_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str]
    note: Mapped[str | None]
    created_at: Mapped[datetime]
    reviewed_at: Mapped[datetime | None]
```

قواعد:

- فقط Admin بتواند status را از `PENDING_APPROVAL` به `APPROVED` ببرد.
- ساخت slot فقط برای venue با status `ACTIVE`.
- booking فقط برای venue با status `ACTIVE`.
- `is_active` از schema manager حذف شود.

## Venue Management و اطلاعات مجموعه

### وضعیت فعلی

مدل Vendor شامل:

- `name`
- `manager_id`
- `sport_types` به صورت `ARRAY(String)`
- `address`
- `latitude`
- `longitude`
- `capacity`
- `amenities` به صورت JSON
- `is_active`
- `average_rating`
- images از طریق `VendorImage`

### عدم انطباق‌ها

1. `contact_number` وجود ندارد.

2. `description` وجود ندارد.

3. Facility نرمال نیست.
   - `amenities` به صورت JSON است.
   - entity `Facility` و join table وجود ندارد.

4. SportType نرمال نیست.
   - enum/array است.
   - entity `SportType` وجود ندارد.

5. VenueImage به نام `VendorImage` وجود دارد.
   - از نظر کارکردی نزدیک است، اما requirement نام entity را `VenueImage` می‌خواهد.

6. endpoint افزودن تصویر با URL خام validation upload را دور می‌زند.
   - `POST /vendors/{vendor_id}/images` فقط `url: str` می‌گیرد.

### نقاط مثبت

- مختصات latitude/longitude در schema validate می‌شوند.
- upload فایل محدودیت حجم و فرمت دارد.
- حذف تصویر از مسیرهای اصلی باعث حذف فایل از storage می‌شود.

### پیشنهاد اصلاح

مدل‌های پیشنهادی:

```python
class SportType(Base):
    __tablename__ = "sport_types"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    title: Mapped[str] = mapped_column(String(128))


class Facility(Base):
    __tablename__ = "facilities"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    title: Mapped[str] = mapped_column(String(128))
```

و join tableها:

- `venue_sport_types`
- `venue_facilities`

Facilityهای پایه:

- `restroom`
- `locker_room`
- `water_cooler`
- `parking`
- `shower`

## Time Slot Management

### وضعیت فعلی

`TimeSlot` شامل:

- `vendor_id`
- `start_time`
- `end_time`
- `base_price`
- `is_reserved`
- `version`

### مشکلات

1. جنسیت سانس وجود ندارد.

2. status سانس وجود ندارد.
   - فقط boolean `is_reserved` داریم.
   - برای `closed`, `pending_cancellation`, `held` کافی نیست.

3. گزینه توپ وجود ندارد.

4. `ball_price` وجود ندارد.

5. Unique Constraint برای جلوگیری از duplicate slot وجود ندارد.

6. تولید خودکار slot در اجرای همزمان duplicate-safe نیست.

7. ساخت slot برای مجموعه pending مجاز است.

8. کنترل مالکیت manager روی slot ناقص است.

### پیشنهاد اصلاح

```python
class SlotStatus(str, enum.Enum):
    OPEN = "open"
    HELD = "held"
    RESERVED = "reserved"
    PENDING_CANCELLATION = "pending_cancellation"
    CLOSED = "closed"


class SlotGender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"


class TimeSlot(Base):
    status: Mapped[SlotStatus]
    gender: Mapped[SlotGender]
    base_price: Mapped[Decimal]
    ball_price: Mapped[Decimal | None]
    ball_available: Mapped[bool]
```

Constraint پیشنهادی:

```python
UniqueConstraint("vendor_id", "start_time", "end_time", name="uq_slot_time")
```

## Slot Ball Option

### Requirement

هر سانس باید دو حالت داشته باشد:

- بدون توپ
- با توپ

اگر با توپ انتخاب شود:

```text
Final Price = Slot Price + Ball Price
```

### وضعیت فعلی

این قابلیت وجود ندارد.

موارد missing:

- `ball_available`
- `ball_price`
- `with_ball` در `BookingCreate`
- ذخیره مبلغ توپ در booking/payment
- محاسبه refund با مبلغ توپ
- گزارش مالی با تفکیک slot price و ball price
- فاکتور یا invoice شامل اختلاف قیمت

### ریسک

ریسک بالا برای گزارش مالی و refund. اگر بعداً اضافه شود و paymentهای قبلی فقط `price_paid` داشته باشند، تفکیک مالی امکان‌پذیر نیست.

### پیشنهاد اصلاح

در booking:

```python
class Booking(Base):
    slot_price: Mapped[Decimal]
    ball_price: Mapped[Decimal]
    total_price: Mapped[Decimal]
    with_ball: Mapped[bool]
```

در request:

```python
class BookingCreate(BaseModel):
    slot_id: int
    version: int
    participants_count: int = 1
    with_ball: bool = False
```

در محاسبه:

```python
ball_price = slot.ball_price if data.with_ball else Decimal("0")
total_price = slot.base_price + ball_price
```

## Vendor Reservation و Long-Term Reservation

### وضعیت فعلی

هیچ پیاده‌سازی مشخصی برای موارد زیر وجود ندارد:

- رزرو رایگان Manager برای مجموعه خودش
- long-term reservation
- رزرو تکرارشونده چند هفته‌ای
- atomic بودن رزرو recurring
- جلوگیری از conflict با slotهای قبلاً رزروشده

### ریسک

ریسک متوسط تا بالا. اگر manager از مسیر booking عادی استفاده کند باید پرداخت کند و مالکیت مجموعه هم لحاظ نمی‌شود.

### پیشنهاد اصلاح

Endpoint پیشنهادی:

```text
POST /manager/vendors/{vendor_id}/reservations/recurring
```

قواعد:

- فقط owner همان venue.
- فقط برای venue فعال.
- تمام slotهای هدف با lock بررسی شوند.
- اگر حتی یک slot conflict داشت، کل عملیات rollback شود.
- bookingها با `created_by_manager=True` و `payment_required=False` ثبت شوند.

## Vendor Cancellation

### Requirement

Manager دو نوع لغو داشته باشد:

1. بستن سانس:
   - هیچ کاربری نتواند رزرو کند.

2. حذف رزرو فعلی:
   - سانس دوباره برای کاربران آزاد شود.

### وضعیت فعلی

این تفاوت در مدل وجود ندارد.

- `TimeSlot` فقط `is_reserved` دارد.
- endpoint اختصاصی manager برای close slot یا release reservation وجود ندارد.
- اگر slot رزرو شده باشد، update/delete slot رد می‌شود.

### پیشنهاد اصلاح

افزودن actionهای جدا:

```text
POST /manager/slots/{slot_id}/close
POST /manager/bookings/{booking_id}/release
```

و statusهای:

- `SlotStatus.CLOSED`
- `SlotStatus.OPEN`
- `BookingStatus.CANCELLED_BY_MANAGER`

## Admin Logic و Permission

### وضعیت فعلی

Admin endpointهایی برای موارد زیر دارد:

- کاربران
- تنظیمات
- لاگ‌ها
- pending vendors
- approve/reject vendor
- hard delete
- payments
- bookings all

### مشکلات

1. مدیریت کامل slotها توسط Admin به شکل admin-centric کامل نیست.

2. برخی routeهای manager فقط براساس role کنترل شده‌اند، نه owner بودن.

3. manager می‌تواند approval را با `is_active` دور بزند.

4. endpoint `POST /vendors/{vendor_id}/images` با URL خام می‌تواند فایل upload validation را دور بزند.

### ریسک

ریسک بالا، به‌خصوص Broken Access Control برای مدیریت slot.

### پیشنهاد اصلاح

- dependency مشترک:

```python
async def require_vendor_owner_or_admin(vendor_id: int, current_user: User):
    ...
```

- حذف `is_active` از schemaهای manager.
- تست IDOR برای تمام endpointهای manager.

## Security Review

### Authentication

نسبتاً خوب پیاده‌سازی شده است:

- JWT
- refresh token rotation
- token replay detection
- token version
- inactive user check

### Authorization

مشکلات جدی:

- Broken Access Control در slot management.
- دور زدن approval با `is_active`.
- نبود owner check در create/update/delete/generate slot.

### OTP Flow

نسبتاً خوب، اما:

- dev_code در mock برمی‌گردد.
- validation phone ناقص است.

### Rate Limit

وجود دارد، اما fallback به memory در production خطرناک است.

### Validation

متوسط:

- مختصات validate می‌شود.
- قیمت مثبت validate می‌شود.
- phone کامل validate نمی‌شود.
- کارت بانکی اصلاً وجود ندارد.
- `amenities` ساختار مشخص ندارد.

### SQL Injection

ریسک پایین؛ عمدتاً از SQLAlchemy ORM استفاده شده است.

### XSS

SVG sanitization در upload وجود دارد. اما پذیرش URL خام برای image همچنان risk دارد.

### CSRF

با توجه به Bearer token و API، ریسک کمتر است. اگر cookie-based auth اضافه شود، CSRF protection لازم می‌شود.

### Mass Assignment

ریسک واقعی وجود دارد:

- `VendorUpdate.is_active` به manager اجازه تغییر وضعیت فعال بودن می‌دهد.

### IDOR

ریسک واقعی وجود دارد:

- manager می‌تواند روی slotهای مجموعه دیگر عملیات انجام دهد.

## Database Review

### وضعیت فعلی

موجودیت‌های اصلی:

- User
- Vendor
- VendorImage
- TimeSlot
- Booking
- Payment
- Wallet
- WalletTransaction
- Penalty
- Review
- Notification

### موجودیت‌های پیشنهادی که وجود ندارند

- `BankCard`: وجود ندارد.
- `VenueApproval`: وجود ندارد.
- `Facility`: وجود ندارد.
- `SportType`: entity مستقل نیست.
- `VenueImage`: با نام `VendorImage` وجود دارد.

### مشکلات طراحی

1. `sport_types` به صورت `ARRAY(String)` است.

2. `amenities` به صورت JSON است.

3. `is_reserved` boolean برای slot کافی نیست.

4. Booking statusها کافی نیستند.

5. Payment فقط یک رکورد unique برای هر booking دارد.
   - retry پرداخت پس از failure ممکن است conflict بسازد.

6. Refund entity وجود ندارد.

7. BankCard entity وجود ندارد.

8. Unique constraint برای duplicate slot وجود ندارد.

9. ارتباط approval با venue وجود ندارد.

### پیشنهاد entityهای تکمیلی

- `BankCard`
- `Refund`
- `VenueApproval`
- `Facility`
- `SportType`
- `VenueFacility`
- `VenueSportType`
- `Invoice`
- `PaymentAttempt`
- `BookingTransfer`

## Performance Review

### نقاط مثبت

- برخی queryها با `selectinload` از N+1 جلوگیری کرده‌اند.
- indexهای performance برای user, vendor, booking و time_slot اضافه شده‌اند.
- pagination در لیست‌ها وجود دارد.

### مشکلات

1. bulk create slot با `add_all` است، اما constraint دیتابیسی ندارد.

2. generation برای هزاران slot ممکن است memory-heavy شود.

3. lock مناسب هنگام رزرو وجود ندارد.

4. distance filter در memory انجام می‌شود.

5. cache invalidation برای همه mutationها کامل نیست.

### پیشنهاد اصلاح

- استفاده از bulk insert واقعی با conflict handling.
- unique constraint و `ON CONFLICT DO NOTHING`.
- استفاده از PostGIS یا index مکانی برای distance.
- row lock برای booking/payment/cancellation.

## Edge Cases بررسی‌شده

### پوشش داده نشده یا ناقص

- رزرو همزمان توسط چند کاربر.
- پرداخت همزمان برای یک booking.
- لغو همزمان.
- Refund دوباره.
- Retry پرداخت پس از failure.
- Gateway timeout پس از debit واقعی.
- Duplicate request.
- Pending payment expired هنگام پرداخت.
- اختلاف timezone در date filter.
- مرز دقیق ۴۸ ساعت.
- pending cancellation و replacement booking.
- بستن سانس توسط manager در حالی که booking فعال دارد.
- تغییر برنامه هفتگی بدون تخریب bookingهای قبلی.
- تولید همزمان slot توسط چند scheduler.
- کارت بانکی تأییدنشده هنگام refund.
- خطای سرویس خارجی استعلام کارت.
- mismatch نام کارت و نام کاربر.
- انتخاب توپ و refund جزئی مبلغ توپ.

## ماتریس انطباق با Requirements

| بخش | وضعیت | توضیح |
| --- | --- | --- |
| ثبت‌نام کاربر | قابل قبول | طبق تصمیم محصول `full_name` کافی است |
| OTP login | پیاده‌سازی شده | با Redis و rate limit داخلی |
| password login | پیاده‌سازی شده | وجود دارد |
| مشاهده سانس آزاد | ناقص | status واقعی slot و فعال بودن venue لحاظ نمی‌شود |
| رزرو سانس | ناقص | race condition و نبود lock |
| جلوگیری از double booking | ناقص | unique هست، اما پرداخت/atomicity امن نیست |
| کنسلی بالای ۴۸ ساعت با ۱۰٪ جریمه | پیاده‌سازی نشده | منطق فعلی ۲۴ ساعت و ۰/۵۰٪ است |
| pending cancellation | پیاده‌سازی نشده | status و flow وجود ندارد |
| transfer reservation | پیاده‌سازی نشده | وجود ندارد |
| refund بدون double refund | ناقص | lock و refund entity نیست |
| کارت بانکی قبل از refund | پیاده‌سازی نشده | `BankCard` وجود ندارد |
| تأیید مالک کارت | پیاده‌سازی نشده | سرویس خارجی وجود ندارد |
| ذخیره امن کارت | پیاده‌سازی نشده | کارت کاربر ذخیره نمی‌شود |
| چند مجموعه برای Manager | پیاده‌سازی نشده | محدود به یک مجموعه است |
| approval flow مجموعه | ناقص | فقط `is_active` و قابل دور زدن |
| جلوگیری از slot برای pending venue | پیاده‌سازی نشده | check وجود ندارد |
| اطلاعات کامل venue | ناقص | contact و description نیست |
| multiple images | پیاده‌سازی شده با نقص | URL خام validation را دور می‌زند |
| SportType entity | پیاده‌سازی نشده | enum/array است |
| Facility entity | پیاده‌سازی نشده | JSON است |
| گزینه توپ | پیاده‌سازی نشده | هیچ فیلدی ندارد |
| vendor free reservation | پیاده‌سازی نشده | وجود ندارد |
| long-term reservation | پیاده‌سازی نشده | وجود ندارد |
| vendor close slot | پیاده‌سازی نشده | status closed نیست |
| admin role-based access | ناقص | برخی مسیرها owner check ندارند |

## تست‌های پیشنهادی

### Booking concurrency

- دو کاربر همزمان یک slot را رزرو کنند؛ فقط یکی موفق شود.
- دو درخواست payment همزمان برای یک booking؛ فقط یکی payment success ثبت کند.
- payment timeout سپس retry با idempotency key.

### Cancellation

- دقیقاً ۴۸ ساعت مانده.
- ۴۸ ساعت و ۱ ثانیه مانده.
- ۴۷ ساعت و ۵۹ دقیقه مانده.
- pending cancellation با replacement booking.
- pending cancellation بدون replacement تا شروع slot.
- دو درخواست cancel همزمان.
- دو درخواست refund همزمان.

### Bank Card

- cancel بدون کارت تأییدشده باید 409 بدهد.
- کارت جدید با سرویس خارجی success.
- کارت با mismatch holder name.
- سرویس خارجی timeout.
- logها نباید شماره کارت کامل داشته باشند.

### Venue Approval

- manager نتواند `is_active` را تغییر دهد.
- pending venue نتواند slot بسازد.
- pending venue نتواند booking بگیرد.
- manager بتواند چند venue بسازد.
- فقط admin بتواند approve/reject کند.

### Slot Ball Option

- رزرو without ball فقط base price.
- رزرو with ball برابر base + ball price.
- refund با ball price درست.
- گزارش مالی تفکیک slot و ball.

### IDOR

- manager A نتواند برای vendor manager B slot بسازد.
- manager A نتواند slot manager B را update/delete کند.
- manager A نتواند bookingهای manager B را مدیریت کند.

## پیشنهاد نقشه راه اصلاح

### فاز ۱: بستن ریسک‌های بحرانی

- حذف `is_active` از `VendorUpdate` برای manager.
- owner check برای تمام endpointهای slot.
- جلوگیری از ساخت slot برای venue غیرفعال.
- جلوگیری از booking روی venue غیرفعال.
- افزودن lock در booking/payment/cancellation.

### فاز ۲: بازطراحی cancellation و refund

- افزودن statusهای booking و slot.
- پیاده‌سازی pending cancellation.
- افزودن Refund entity.
- افزودن BankCard و verification flow.
- اجبار کارت تأییدشده قبل از refund.

### فاز ۳: Venue approval واقعی

- افزودن `VenueStatus`.
- افزودن `VenueApproval`.
- حذف محدودیت یک venue برای manager.
- state transition معتبر و audit شده.

### فاز ۴: نرمال‌سازی اطلاعات venue

- افزودن `SportType` entity.
- افزودن `Facility` entity.
- migration از `sport_types ARRAY` و `amenities JSON`.
- استانداردسازی `VenueImage`.

### فاز ۵: قابلیت‌های تجاری تکمیلی

- گزینه توپ.
- invoice و financial reporting.
- vendor free reservation.
- recurring long-term reservation.
- vendor cancellation modes.

## جمع‌بندی نهایی

بک‌اند فعلی پایه‌های یک سیستم رزرو ساده را دارد، اما برای Business Logic تعریف‌شده در سطح محصول واقعی آماده نیست. بیشترین ریسک‌ها مربوط به پول، کنسلی، Refund، تأیید کارت بانکی، Race Condition و کنترل دسترسی Manager هستند.

تا زمانی که موارد زیر اصلاح نشوند، سیستم نباید برای سناریوی واقعی مالی و رزرو همزمان استفاده شود:

- state machine رسمی booking و slot
- lock و transaction درست
- pending cancellation و refund ۴۸ ساعته
- BankCard verification
- جلوگیری از دور زدن approval
- owner-based authorization برای manager
- مدل مالی دقیق برای توپ، payment، refund و invoice
