# 📚 راهنمای کامل یادگیری بک‌اند ToopSet

> **هدف:** تسلط کامل بر بک‌اند پروژه، فایل به فایل و فاز به فاز.
> این سند طوری نوشته شده که انگار یه منتور کنارت نشسته و هر فایل رو ساده و روان توضیح می‌ده.
>
> **معماری کلی:** FastAPI لایه‌ای — درخواست از این مسیر رد می‌شه:
>
> ```
> Route (api/v1) → Service (منطق کسب‌وکار) → Repository (دیتابیس) → Model (جدول)
>        ↑ Schema (اعتبارسنجی ورودی/خروجی)
> ```

**فهرست فازها:**

| فاز | موضوع | تعداد تقریبی فایل |
|---|---|---|
| ۰ | نقطهٔ ورود برنامه | ۲ |
| ۱ | زیرساخت Core | ۶ اصلی + ۱۶ فرعی |
| ۲ | مدل‌های داده (Models) | ۲۴ |
| ۳ | فلوی احراز هویت (Auth) — Vertical Slice | ۱۱ |
| ۴ | زمین و رزرو (TimeSlot + Booking) | ۹ |
| ۵ | مالی (Wallet/Payment/Settlement) + Vendor/Manager | ~۳۰ |
| ۶ | امکانات جانبی (کش، داشبورد، ادمین، ...) | ~۲۰ |

---

# 🚀 فاز ۰ — نقطهٔ ورود

## ۰.۱ — `app/__init__.py`

این ساده‌ترین فایل پروژه‌ست، فقط ۳ خط:

```python
"""ToopSet backend application package."""

__version__ = "1.0.1"
__all__ = ["__version__"]
```

**به زبان ساده چی هست؟**

وقتی پایتون یه پوشه رو «پکیج» می‌شناسه (یعنی می‌تونی `import app` بنویسی)، اول این فایل رو می‌خونه. مثل کارت شناساییِ خونه‌ست.

- خط ۱: یه توضیح (docstring) که میگه این پکیج چیه
- `__version__ = "1.0.1"` → شمارهٔ نسخهٔ برنامه اینجاست
- `__all__` → میگه وقتی کسی بنویسه `from app import *` فقط همین `__version__` بیرون داده بشه

**چرا مهمه؟** بقیهٔ کد (لاگ‌ها، هدر `/health`) از همینجا نسخه رو برمی‌دارن تا همیشه یک عدد واحد باشه.

---

## ۰.۲ — `app/main.py` — قلب تپندهٔ برنامه ❤️

این فایل «سرهم‌بندی» کل اپلیکیشنه. هیچ منطق کسب‌وکاری نداره؛ فقط همه‌چیز رو به هم وصل می‌کنه.

### چه چیزهایی اینجا تعریف می‌شه؟

**۱) پنج حلقهٔ پس‌زمینه (Background Tasks):**

این‌ها توابع async هستن که همیشه در حال اجران و کارهای خانه‌داری برنامه رو انجام میدن:

| حلقه | هر چند وقت؟ | کارش چیه؟ |
|---|---|---|
| `_cancel_expired_pending()` | هر ۶۰ ثانیه | رزروهایی که ظرف ۱۲ دقیقه پرداخت نشدن رو منقضی می‌کنه و صندلی (slot) رو آزاد می‌کنه |
| `_reconcile_zibal_payments_periodically()` | ~هر ۶۰ ثانیه | پرداخت‌های زیبال که گیر کردن (stale) رو بررسی و حل می‌کنه — فقط وقتی درگاه zibal فعاله |
| `_expire_replacement_work_periodically()` | هر ۶۰ ثانیه | درخواست‌های «رزرو جایگزین» منقضی‌شده رو می‌بنده |
| `_update_vendor_min_prices_nightly()` | شبانه (نیمه‌شب ایران) | کمترین قیمت هفتگی هر مجموعه رو حساب و توی Redis کش می‌کنه |
| `_refresh_metrics_periodically()` | هر ۱۲۰ ثانیه | آمار کسب‌وکار (تعداد کاربر، فروش و...) رو برای Prometheus به‌روز می‌کنه |

💡 **نکتهٔ طلایی:** این حلقه‌ها هیچ‌وقت کرش نمی‌کنن — همهٔ خطاها رو می‌بلعن و فقط لاگ می‌کنن. یه باگ توی حلقهٔ شبانه نباید سرور رو بندازه پایین!

**۲) Lifespan — تولد و مرگ برنامه:**

```python
@asynccontextmanager
async def lifespan(app):
    # ── قبل از yield: استارتاپ ──
    setup_logging()
    validate_env(settings)          # پروداکشن = سخت‌گیرانه، دیو = فقط هشدار
    # چک مایگریشن‌های alembic (اگر auto_migrate=True)
    # Sentry (اگر DSN داده شده)
    # OpenTelemetry (اگر فعال)
    yield                            # ← برنامه اینجا «زنده» است و درخواست سرو می‌کند
    # ── بعد از yield: خاموشی ──
    # لغو ۵ تسک پس‌زمینه
    await close_redis()
    await engine.dispose()
```

به زبان ساده: قبل از `yield` = آماده‌سازی صحنه؛ بعد از `yield` = جمع‌کردن وسایل.

**۳) Middleware ها — لایه‌های امنیتی دور هر درخواست:**

ترتیب اضافه شدن: CORS ← CorrelationID ← Profiler ← SecurityHeaders ← Prometheus ← SlowAPI
اما ترتیب اجرا برعکسه! (آخری اول اجرا می‌شه):

```
درخواست ← SlowAPI → Prometheus → SecurityHeaders → Profiler → CorrelationID → CORS → Route
```

**۴) Exception Handler های سراسری:**

هر خطایی که جای پروژه بالا بیاد، اینجا به جواب JSON استاندارد فارسی تبدیل می‌شه:

| خطا | HTTP | پیام به کاربر |
|---|---|---|
| HTTPException | همان کد | همان detail |
| خطای اعتبارسنجی Pydantic | 422 | «اطلاعات وارد شده معتبر نیست» + جزئیات هر فیلد به فارسی |
| خطای یکتایی دیتابیس (IntegrityError) | 409 | «شماره موبایل قبلاً ثبت شده» و... |
| خطای SQL | 500 | «خطای دیتابیس» |
| هر خطای دیگه | 500 | «خطای داخلی سرور» |

**۵) ثبت Routerها:** همه زیر `/api/v1`:

`auth`, `vendors`, `time_slots`, `bookings`, `dashboard`, `reviews`, `settings`, `uploads`, `users`, `payments`, `refunds`, `wallet`, `notifications`, `penalties`, `contact`, `favorites`, `manager`, `manager_requests`, `admin`

⚠️ دو مسیر قدیمی `/api/v1/courts/*` هنوز فعالن ولی از مستندات مخفی‌ان (سازگاری با نسخه قبل).
⚠️ `manager_requests_router` بدون پیشوند `/api/v1` ثبت شده و خودش مسیر کامل رو هاردکد کرده.

**۶) مسیرهای عمومی:**
- `GET /` → ریدایرکت به `/docs`
- `GET /health` → سلامت DB و Redis
- `GET /metrics` → متریک‌های Prometheus

---

# 🧱 فاز ۱ — زیرساخت Core

این فاز «موتورخانه» پروژه‌ست. قبل از دیدن هر منطقی، باید بدونی تنظیمات، دیتابیس، امنیت و Redis چطور کار می‌کنن.

## ۱.۱ — `core/config.py` — مغز تنظیمات ⚙️

**نقش:** همهٔ env ها و مقادیر پیش‌فرض اینجا یک‌جا جمع شدن و یه آبجکت سراسری به اسم `settings` ازش ساخته می‌شه که همه‌جا import می‌شه.

```python
class Settings(BaseSettings):
    model_config = {"env_file": (".env", "backend/.env"), "extra": "ignore"}
    ...
settings = Settings()   # ← سینگلتون؛ همه‌جا از همین استفاده می‌شود
```

**اعداد مهمی که باید حفظ باشی:**

| مورد | مقدار |
|---|---|
| انقضای access token | ۳۰ دقیقه |
| انقضای refresh token | ۷ روز |
| توکن ریست پسورد | ۱۰ دقیقه |
| پول دیتابیس | ۲۰ کانکشن + ۱۰ اضافه (overflow) |
| بازیافت کانکشن‌ها | هر ۱۸۰۰ ثانیه |
| درگاه پرداخت | `mock` در دیو / `zibal` در پروداکشن |
| SMS | `mock` (چاپ در کنسول) / `smsir` |

**`validate_env()` — گیت امنیتی استارتاپ:**

قبل از بالا آمدن سرور، همهٔ تنظیمات بحرانی چک می‌شن:
- `SECRET_KEY` نباید مقدار پیش‌فرض یا کمتر از ۳۲ کاراکتر باشه
- درگاه پرداخت و SMS حتماً باید معتبر باشن (حتی توی dev)
- **فقط توی پروداکشن:** CORS نباید `*` باشه، کوکی refresh باید `secure=True` و `samesite="none"` باشه، gateway/SMS نباید mock باشن

اگه مشکلی باشه، `EnvValidationError` پرتاب می‌شه و سرور اصلاً بالا نمیاد. 💪

💡 نکتهٔ باحال: property به اسم `database_url` اگه URL بدون `+asyncpg` ببینه، خودکار تبدیلش می‌کنه.

---

## ۱.۲ — `core/database.py` — پل ارتباطی با PostgreSQL 🗄️

**نقش:** موتور async دیتابیس + فکتوری session + پایهٔ همهٔ مدل‌ها (`Base`) ساخته می‌شن.

```python
engine = create_async_engine(
    settings.database_url,
    pool_size=20, max_overflow=10,
    pool_recycle=1800, pool_pre_ping=True, pool_timeout=5,
    hide_parameters=True,   # ← پسورد/موبایل داخل خطاهای SQL لو نمی‌ره!
)

async def get_db():
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()      # ← موفق = کامیت خودکار
        except Exception:
            await session.rollback()
            raise
```

**سه چیزی که باید بفهمی:**

1. **`get_db` یه dependency فست‌آپیه** — هر route که بخواد، یه session تازه می‌گیره. آخرِ ریکوئست یا commit می‌شه یا rollback. یعنی *هر درخواست = یک تراکنش*.
2. **`expire_on_commit=False`** — بعد از commit، آبجکت‌های ORM هنوز خوانا هستن (چون سرویس‌ها معمولاً بعد از commit هم آبجکت رو برمی‌گردونن).
3. **ردیاب کوئری کند** — به هر کوئری که بیشتر از ۲۰۰ms طول بکشه، لاگ WARNING می‌خوره.

💡 `statement_cache_size=0` برای سازگاری با PgBouncer لازمه.

---

## ۱.۳ — `core/security.py` — قفل و کلید 🔐

**نقش:** هش پسورد، ساخت/اعتبارسنجی JWT، و پشتیبانی از چرخش کلید امضا.

**هش پسورد:** bcrypt با passlib.

**JWT (HS256) — سه نوع توکن داریم:**

| نوع | انقضا | claims خاص |
|---|---|---|
| access | ۳۰ دقیقه | `sub`, `role`, `ver` |
| refresh | ۷ روز | + `sid` (شناسهٔ نشست) |
| password_reset | ۱۰ دقیقه | type مخصوص |

همهٔ توکن‌ها `iat/nbf/jti/iss("toopset-api")/aud("toopset-client")` دارن.

**چرخش کلید (Key Rotation):**
- کلید فعلی → header با `kid="v1"`
- کلید قبلی (اختیاری `SECRET_KEY_PREVIOUS`) → `kid="v0"`
- موقع decode، هر دو کلید امتحان می‌شن؛ توکن‌های قدیمی تا انقضا معتبر می‌مونن ولی جدیدها با کلید نو امضا می‌شن. بدون downtime می‌تونی کلید عوض کنی!

**دو تابع جانبی مهم:**
- `hash_token()` → SHA-256؛ refresh token ها فقط به صورت هش در DB ذخیره می‌شن (نه متن خام!)
- `decode_token()` → هیچ‌وقت exception نمی‌ده؛ ناموفق بود `None` برمی‌گردونه (کد تمیزتر)

---

## ۱.۴ — `core/exceptions.py` — سپر پاسخ‌ها 🛡️

دو مسئولیت:

**الف) `SecurityHeadersMiddleware`:** به هر پاسخ هدرهای امنیتی OWASP اضافه می‌کنه:
- `X-Frame-Options: DENY` (جلوگیری از clickjacking)
- HSTS، `nosniff`، Permissions-Policy
- CSP برای API فوق سخت‌گیرانه (`default-src 'none'`) ولی برای `/docs` بازتر
- مسیرهای حساس (`/auth/*`, `/users/me`, `/admin/*`) هدر `Cache-Control: no-store` می‌گیرن

**ب) Handler های خطا:** envelope استاندارد `ErrorResponse` با پیام فارسی + `request_id`. حتی پیام‌های انگلیسی Pydantic رو به فارسی ترجمه می‌کنه!

---

## ۱.۵ — `core/redis_client.py` — کش مشترک ⚡

یه کلاینت Redis سینگلتون با lazy-init:

- اولین بار که کسی `get_redis()` صدا بزنه، pool ساخته می‌شه (۵۰ کانکشن، timeout ثانیه‌ای ۲)
- **ترفند جالب:** id حلقهٔ asyncio رو نگه می‌داره؛ اگه loop عوض شه (مثل تست‌های pytest)، pool رو از نو می‌سازه
- `decode_responses=True` → مقادیر به صورت `str` میان نه `bytes`

---

## ۱.۶ — ابزارهای فرعی Core (مرور سریع)

| فایل | نقش در یک خط | نکتهٔ مهم |
|---|---|---|
| `logger.py` | ثبت **رویدادهای امنیتی در جدول logs** (نه لاگ پایتون!) | شماره موبایل و کارت رو خودکار ماسک می‌کنه: `09*****1234` |
| `logging_config.py` | راه‌اندازی لاگ JSON برای stdout و فایل | فقط یک بار اجرا می‌شه (idempotent) |
| `pagination.py` | صفحه‌بندی Cursor به جای OFFSET | الگو: `limit+1` رکورد بگیر؛ رکورد اضافه یعنی صفحهٔ بعدی داره |
| `rate_limiter.py` | نمونهٔ سراسری slowapi با بک‌اند Redis | اگه Redis نباشه → حافظه (per-process!) |
| `correlation_id.py` | شناسهٔ `X-Request-ID` در همهٔ لاگ‌ها/خطاها/audit | با ContextVar پیاده شده |
| `metrics.py` | متریک‌های Prometheus (HTTP + کسب‌وکار) | `/metrics` |
| `telemetry.py` | OpenTelemetry اختیاری | پیش‌فرض خاموش |
| `profiler.py` | پروفایل هر ریکوئست (تعداد کوئری، زمان) | پیش‌فرض خاموش |
| `health.py` | `/health` | ⚠️ فقط DB مهمه؛ Redis down = بازم "ok" |
| `timezone.py` | `now_utc()` / `now_iran()` / تبدیل‌ها | **قرارداد طلایی: DB همیشه UTC، ورودی‌ها تهران** |
| `date_utils.py` | پارس تاریخ شمسی `1403/05/12` و میلادی | تشخیص: داشتن `/` = شمسی |
| `phone.py` | نرمال‌سازی ارقام فارسی `۰۹۱۲...` → `0912...` | فقط فرمت `09XXXXXXXXX` قبوله |
| `card_security.py` | کارت بانکی: ماسک، هش اثرانگشت (fingerprint)، رمزنگاری Fernet | ⚠️ کلید Fernet از SECRET_KEY مشتق می‌شه — عوض کردنش کارت‌های ذخیره‌شده رو خراب می‌کنه |
| `upload.py` | اعتبارسنجی + ذخیرهٔ تصویر (S3 یا لوکال) | حداکثر 5MB؛ jpg/png/webp — **SVG ممنوع (XSS)** |
| `s3_service.py` | کلاینت aioboto3 برای ParsPack S3 | Toman→Rial نیست! اینجا فقط آپلود/حذف object |
| `legal_content.py` | متن قوانین و حریم خصوصی (استاتیک) | با migration سید می‌شه |

---

# 🗃️ فاز ۲ — مدل‌های داده (Models)

۲۴ فایل، ۲۶ کلاس ORM. **قراردادهای سراسری** که توی همهٔ فایل‌ها تکرار می‌شن:

1. همه از `Base` (توی `database.py`) ارث می‌برن
2. Enum ها `(str, enum.Enum)` هستن و با `values_callable` مقدار رشته‌ای lowercase توی PG ذخیره می‌شن
3. همهٔ datetime ها `timezone=True` و UTC هستن
4. پول = `Numeric(10,2)` (تومان)؛ فقط `commission_percent` استثناست (`Numeric(5,2)`)
5. هر مدل یه PK خودکار `id: int` داره

## ۲.۱ — `models/user.py` — نقطهٔ شروع دنیا 👤

```python
class UserRole(str, enum.Enum):
    USER, MANAGER, ADMIN   # سه نقش کل سیستم

class User(Base):
    __tablename__ = "users"
    phone        = Column(String(16), unique=True, index=True)
    password_hash = Column(String(256))
    role         = Column(Enum(UserRole), default=UserRole.USER)
    token_version = Column(Integer, default=0)     # ← مهم! پایین‌تر توضیح می‌دم
    is_active    = Column(Boolean, default=True)
    phone_verified_at = Column(DateTime(timezone=True), nullable=True)
```

- **CheckConstraint سطح DB:** `phone ~ '^09[0-9]{9}$'` — حتی اگه اپلیکیشن خطا داشته باشه، دیتابیس جلوی موبایل بدی رو می‌گیره.
- **راز `token_version`:** با هر «خروج از همهٔ نشست‌ها» یا تغییر پسورد یکی اضافه می‌شه. توکن JWT داخلش `ver` داره؛ اگه با این عدد بخونه، توکن مُرده. یعنی بی‌درنگ همهٔ access token های قدیمی بی‌اعتبار می‌شن!
- ۱۰ relationship به بقیهٔ جدول‌ها (bookings, wallets, refresh_tokens و...).

## ۲.۲ — `models/refresh_token.py` — شناسنامهٔ نشست‌ها 🎫

```
token_hash (یکتا — فقط هش SHA-256، هیچ‌وقت متن خام!)
user_id, session_id (UUID), issued_at, expires_at
revoked_at (nullable), replaced_by (هش توکن جانشین)
device_info, ip_address, user_agent
```

- **چرخهٔ rotation:** هر refresh → ردیف جدید + ردیف قبلی `revoked_at` می‌گیره و `replaced_by` به هشِ جدید اشاره می‌کنه. یک زنجیرهٔ قابل ردیابی per-session.
- **کشف replay attack:** اگه توکنی که قبلاً rotate شده دوباره استفاده شه یعنی لو رفته → کل session کشته می‌شه!

## ۲.۳ — `models/vendor.py` — مجموعه‌های ورزشی 🏐

```python
SportType: volleyball | basketball | futsal | handball | football

class Vendor(Base):
    manager_id   = FK(users.id, ondelete=CASCADE)
    name         = String(256)
    sport_types  = ARRAY(String)          # ← آرایهٔ PostgreSQL
    amenities    = JSON                    # ← تنها ستون JSON پروژه
    ball_available / ball_price           # اجارهٔ توپ
    is_active    = Boolean                 # ← تأیید ادمین = True شدن همین فلگ
    average_rating
```

⚠️ پیش‌فرض DB برای `is_active` برابر `True` هست ولی سرویس همیشه موقع ساخت صریحاً `False` می‌ذاره (vendor جدید تا تأیید ادمین مخفیه).

## ۲.۴ — `models/vendor_image.py`

گالری تصاویر با ستون ترتیب `order`. «تصویر اصلی» = کمترین order. قانون حداقل ۳ عکس در لایهٔ سرویس/فرانت چک می‌شه نه در DB.

## ۲.۵ — `models/weekly_schedule.py` — برنامهٔ هفتگی قالبی 📅

دو جدول: `weekly_schedule_versions` (نسخهٔ برنامه) + `weekly_schedule_version_items` (ردیف‌ها).

- آیتم = روز هفته (۰ تا ۶) + ساعت شروع/پایان (**Time** نه DateTime!) + قیمت + جنسیت
- CHECK ها: روز بین ۰–۶، شروع < پایان، یکتایی (نسخه، روز، ساعت)
- نسخه‌ها immutable هستن — هر اعمال برنامهٔ جدید = ساخت نسخهٔ تازه

## ۲.۶ — `models/time_slot.py` — قلب رزرو ⏰

```python
SlotStatus: open | reserving | pending_cancellation | reserved | blocked | disabled | closed
SlotGender: male | female   # ← در weekly_schedule هم با name="slotgender" اشتراکه

class TimeSlot(Base):
    vendor_id   = FK(vendors.id)
    start_time / end_time                  # UTC
    base_price  = Numeric(10,2)
    status      = default open
    is_reserved = Boolean                   # ← فلگ سریع برای «اشغال»
    version     = Integer, default 1        # ← قفل خوش‌بینانه!
```

**سه گنج این جدول:**
1. `UniqueConstraint(vendor_id, start_time, end_time)` — دو slot زمانی یکسان برای یک مجموعه غیرممکنه
2. ایندکس جزئی فقط روی slot های آزاد → جستجوی عمومی فوق سریع
3. **`version` = قفل خوش‌بینانه (Optimistic Locking):** فرانت موقع رزرو باید همین عدد رو برگردونه؛ اگه وسط کار عوض شده باشه → 409 «صفحه را رفرش کنید». بدون قفل سنگین DB، تداخل تشخیص داده می‌شه!

property های `ball_available/ball_price` به vendor واگذار می‌شن (سازگاری قدیمی).

## ۲.۷ — `models/booking.py` — ستون فقرات کسب‌وکار 🎯

```python
BookingStatus: pending_payment | confirmed | pending_cancellation |
               transferred | cancelled | expired
BookingSource: online | manager_manual
SettlementStatus: not_settled | settlement_requested | included_in_settlement |
                  settled | excluded_due_to_refund | excluded_due_to_cancellation |
                  excluded_manual_booking
```

**مهم‌ترین بخش — دو ایندکس یکتای جزئی که کل منطق همزمانی رو ضمانت می‌کنن:**

```sql
-- حداکثر یک رزرو زنده به ازای هر slot:
UNIQUE(slot_id) WHERE status IN ('pending_payment','confirmed','pending_cancellation')
-- حداکثر یک رزرو در انتظار پرداخت به ازای هر کاربر:
UNIQUE(user_id) WHERE status = 'pending_payment'
```

به زبان ساده: دیتابیس خودش تضمین می‌کنه هیچ‌وقت دو نفر روی یه slot رزرو زنده نداشته باشن و هیچ‌کس دو چک‌اوت باز نداشته باشه. حتی اگه کد باگ داشته باشه!

فلدهای مهم: `replaces_booking_id` (ارجاع self — رزرو جایگزین)، `price_paid/slot_price/ball_price/penalty_amount`، `expires_at` (مهلت ۱۰ دقیقه‌ای پرداخت)، `created_by_manager_id` (رزرو حضوری مدیر).

## ۲.۸ — `models/payment.py` — تلاش‌های پرداخت 💳

هر attempt پرداخت یک ردیف. وضعیت‌ها: pending/success/failed/expired.

سه ایندکس یکتای جزئی طلایی:
1. فقط **یک پرداخت موفق** به ازای هر booking → شارژ دوباره غیرممکن
2. `gateway_transaction_id` یکتا (trackId زیبال) → هر تراکنش درگاه فقط یک ردیف
3. `idempotency_key` یکتا → ساخت idempotent

## ۲.۹ — خانوادهٔ مالی: wallet, bank_card, refund, settlement, penalty

| مدل | خلاصه | نکتهٔ کلیدی |
|---|---|---|
| `Wallet` | موجودی کیف پول | unique(user_id) → دقیقاً یک کیف پول per user |
| `WalletTransaction` | دفتر کل append-only | برداشت = مبلغ **منفی**؛ type رشتهٔ آزاد |
| `BankCard` | کارت تسویه (یک کارت per user) | شماره Fernet رمز شده + masked + fingerprint؛ upsert یعنی ثبت کارت جدید قبلی رو override می‌کنه |
| `Refund` | بازگشت وجه | UniqueConstraint(booking_id, type) → idempotency طبیعی؛ ⭐ اسنپ‌شات کارت مقصد (encrypted/masked/holder) چون BankCard upsert می‌شه و FK قدیمی‌ها رو خراب می‌کرد |
| `Settlement` + `SettlementItem` | درخواست تسویه مدیر + اقلام per-booking | درصد کمیسیون در لحظهٔ درخواست snapshot می‌شه؛ جمع اقلام دقیقاً = requested_amount (باقیماندهٔ گرد کردن روی آخرین قلم) |
| `Penalty` | جریمهٔ کنسلی | unique(booking_id) → حداکثر یک جریمه به ازای هر رزرو |

## ۲.۱۰ — `models/replacement.py` — بازار «سانس جایگزین» 🔄

دو مدل:

- **`ReplacementRequest`:** وقتی کاربری رزرو confirmed داره ولی ≤۴۸ ساعت به شروع مونده و می‌خواد کنسل کنه → رزرو به حالت `pending_cancellation` می‌ره و این «آگهی فروش» ساخته می‌شه. وضعیت‌ها: open/held/completed/expired/revoked. unique(original_booking_id).
- **`BookingHold`:** رزرو موقت خریدار بالقوه روی همون slot. وضعیت‌ها: active/processing/paid/expired/failed/cancelled.

⭐ ایندکس جزئی `uq_booking_holds_one_live_per_slot` → فقط یک hold زنده per slot. دو خریدار نمی‌تونن هم‌زمان روی یه سانس قفل بذارن.

## ۲.۱۱ — مدل‌های پشتیبان

| مدل | نقش | نکته |
|---|---|---|
| `Review` | نظر بعد از رزرو | unique(booking_id) → یک نظر per رزرو؛ `response` = پاسخ مدیر؛ `is_reported` = پنهان از عموم |
| `SlotCancellation` | ممیزی کنسلی توسط مدیر | اسنپ‌شوت اطلاعات مشتری آسیب‌دیده + هزینهٔ جبرانی سایت |
| `Log` | audit trail امنیتی | user_id با SET NULL → با حذف کاربر، لاگ‌ها زنده می‌مونن |
| `ManagerRequest` | درخواست تبدیل شدن به مدیر | partial unique: فقط یک درخواست pending باز per user |
| `Setting` | key/value تنظیمات سیستم | مقادیر JSON هم به صورت string ذخیره می‌شن |
| `Notification` + `NotificationDelivery` | اعلان درون‌برنامه‌ای + audit ارسال SMS | type رشتهٔ آزاد (booking_confirmed و...) |
| `ContactMessage` | فرمت تماس با ما | مستقل، بدون FK |

## ۲.۱۲ — نقشهٔ روابط (FK Graph)

```
کاربر ──< مجموعه(Vendor) ──< TimeSlot ──< Booking ──< Payment
                                        │
                                        ├── 1:1 Review ، 1:1 Penalty ، 1:1 ReplacementRequest
                                        ├──< Refund ، SettlementItem ، NotificationDelivery
                                        └──> Booking (self — رزرو جایگزین)

User ──1:1 Wallet ──< WalletTransaction
User ──1:1 BankCard
Vendor ──< VendorImage ، WeeklyScheduleVersion ──< Items ، SlotCancellation
ReplacementRequest ──< BookingHold
User ──< Favorite >── Vendor   (unique(user,vendor))
Standalone: Setting, ContactMessage
```

**قانون‌های طلایی DB (حفظ کن!):**
- ≤۱ رزرو زنده per slot · ≤۱ pending_payment per user · ≤۱ payment موفق per booking
- ≤۱ hold زنده per slot · ≤۱ penalty per booking · ≤۱ review per booking
- ≤۱ refund از هر type per booking · ≤۱ manager_request pending per user

---

# 🔑 فاز ۳ — فلوی احراز هویت (Vertical Slice)

**مهم‌ترین فاز!** اینجا با یک فلوی واقعی، الگوی کامل «Schema → Repo → Service → Route» رو یاد می‌گیری. بعد از این فاز، خوندن بقیهٔ پروژه تکرار همون الگوئه.

## ۳.۱ — `schemas/auth.py` — قراردادهای ورودی/خروجی 📋

**نقش:** همهٔ مدل‌های Pydantic برای register/login/OTP/refresh/profile.

```python
class RegisterRequest(BaseModel):
    phone: str          # ۱۱ کاراکتر
    password: str       # ۸ تا ۱۲۸
    full_name: str      # ۱ تا ۱۲۸

    @field_validator("phone")
    def normalize(cls, v): return normalize_phone(v)   # ارقام فارسی → انگلیسی
```

**مدل‌های کلیدی:**
- `LoginOptionsResponse {is_new_user, has_password}` → فرانت قبل از لاگین می‌پرسه «این شماره ثبت نام کرده؟ پسورد داره؟» تا UI مناسب نشون بده
- `TokenResponse` → ⚠️ فقط `access_token` داره؛ **refresh token هیچ‌وقت در بدنه نمیاد** — فقط کوکی HttpOnly!
- `SendOtpResponse` → `dev_code` فقط وقتی SMS_PROVIDER=mock پر می‌شه (برای تست)
- `VerifyOtpRequest` → `purpose: login|password_reset`

## ۳.۲ — `repositories/user_repo.py` — دسترسی به جدول users

**نکتهٔ معمارانه:** repo ها **هیچ‌وقت commit نمی‌کنن** (فقط flush) و HTTPException نمی‌دن. تراکنش مال `get_db` هست و خطای کسب‌وکار مال service.

```python
OTP_PLACEHOLDER_HASH = "__otp_user__"
```
⭐ یه مقدار جعلی که برای کاربرایی که فقط با OTP ثبت‌نام کردن (بدون پسورد) در `password_hash` ذخیره می‌شه. چون bcrypt هیچ‌وقت همچین خروجی نداره، verify پسورد برایش همیشه شکست می‌خوره. هوشمندانه!

توابع اصلی: `get_by_phone`, `create`, `create_otp_user` (کاربر OTP با phone_verified_at=الان), `list_users` (cursor یا offset + جستجو).

## ۳.۳ — `services/auth_service.py` — مغز احراز هویت 🧠

**register:** چک تکراری بودن شماره (409) → هش bcrypt → ساخت user → صدور جفت توکن → ذخیرهٔ refresh hash → audit log.

**login:** خطاها عمداً کلی گفته می‌شن («شماره یا رمز اشتباه») تا attacker نفهمه کدوم غلطه.

⚠️ نکتهٔ ظریف: در مسیرهای خطا، قبل از raise باید صریحاً `commit()` بشه وگرنه rollback می‌شه و لاگ امنیتی از بین می‌ره!

**refresh — قلب سیستم (حفظ کن!):**

```
1. decode توکن refresh
2. هش SHA-256 بگیر → SELECT ... FOR UPDATE (قفل ردیف!)
3. اگر ردیف revoked بود و replaced_by داشت:
      ← REPLAY ATTACK! کل session_id زنجیره رو revoke کن + لاگ CRITICAL + 401
4. وگرنه (rotate):
      ردیف قدیم → revoked_at = الان، replaced_by = هش جدید
      توکن جدید با همان sid بساز و ذخیره کن
5. access token جدید برگردان + کوکی بچرخون
```

**update_profile:** تغییر پسورد یا نیاز به `current_password` درست داره یا کوکی ۱۰ دقیقه‌ای `password_reset_token`. بعد از تغییر موفق → همهٔ نشست‌ها revoke + `token_version += 1`.

## ۳.۴ — `services/otp_service.py` — ورود با کد پیامکی 📲

همهٔ وضعیت‌ها در Redis:

| کلید | TTL | نقش |
|---|---|---|
| `otp:{phone}` | ۱۲۰ ثانیه | خودِ کد ۶ رقمی |
| `otp_send:{phone}` | ۱۲۰ ثانیه | قفل فاصلهٔ بین دو ارسال |
| `otp_fail:{phone}` | ۱۲۰ ثانیه | شمارندهٔ خطا (بیشتر از ۵ = قفل) |

⭐ **مصرف اتمیک با Lua script:** چک حد خطا + وجود کد + تطبیق + حذف، همه در یک عملیات اتمیک Redis. دو درخواست همزمان نمی‌تونن با یه کد لاگین کنن.

- تولید کد با `secrets.randbelow` (رمزنگارانه، نه random معمولی)
- اگه کد زنده هنوز موجود باشه، دوباره همون کد برمی‌گرده (cooldown دور زده نمی‌شه ولی اسپم هم نمی‌شه)
- کاربر جدید → `create_otp_user` (placeholder hash + موبایل تأیید شده)
- ⚠️ ذخیرهٔ refresh token در مسیر OTP مسئولیت route هست نه سرویس

## ۳.۵ — `services/sms_provider.py` — لایهٔ انتزاعی SMS

ABC به اسم `SmsProvider` + دو پیاده‌سازی: `MockSmsProvider` (بنر در کنسول) و `SmsIrProvider` (httpx + x-api-key). فکتوری `get_sms_provider()` بر اساس settings انتخاب می‌کنه.

💡 helper های SMS رزرو **هرگز exception نمی‌دن** — خرابی SMS نباید رزرو مشتری رو بشکنه.

## ۳.۶ — `api/deps.py` — زنجیرهٔ مجوزدهی 🚧

```python
get_current_user_optional()   # soft-fail: هر چیزی خراب باشه None برمی‌گردونه (صفحات عمومی)
get_current_user()            # سخت‌گیر: 401/403/404 فارسی
get_current_manager()         # manager یا admin
get_current_admin()           # فقط admin
```

مسیر بررسی `get_current_user`:
```
هدر Authorization: Bearer xxx
→ decode_token(type="access")
→ claim sub → لود User از DB
→ is_active؟ (نه = 403)
→ ver == token_version؟ (نه = 401 — توکن منسوخ)
→ برگردون User
```

⭐ هر درخواست محافظت‌شده یک بار DB می‌خونه — بهای fresh بودن `token_version`.

## ۳.۷ — `api/v1/auth.py` — ویترین endpoints 🪟

route ها لاغرن؛ منطقی نیست، فقط cookie-plumbing و rate-limit:

| Endpoint | Rate limit | نکته |
|---|---|---|
| POST `/auth/register` | 3/min | 201 + ست کوکی refresh |
| POST `/auth/login` | 5/min | + کوکی |
| POST `/auth/login/options` | 10/min | پروب عمومی |
| POST `/auth/otp/send` | 30/min | dev_code فقط در mock |
| POST `/auth/otp/verify` | 10/min | + ذخیرهٔ refresh + کوکی reset اگر purpose=password_reset |
| POST `/auth/refresh` | 10/min | چرخاندن کوکی |
| GET `/auth/me` / PATCH `/auth/profile` | — | |
| GET `/auth/sessions` + حذف‌ها | — | مدیریت نشست‌ها |

**مشخصات کوکی refresh:**
```
name=refresh_token · httponly=True · max_age=7 روز
path=/api/v1/auth        ← فقط همین مسیرها ارسال می‌شه (حداقل سطح حمله)
secure=false/samesite=lax در دیو ← پروداکشن اجباراً secure=true/samesite=none
```

## ۳.۸ — `api/v1/users.py` — مدیریت کاربران توسط ادمین

CRUD ادمینی با کش Redis (`X-Cache: HIT|MISS`) و cursor pagination.

⭐ **قفل مشورتی PostgreSQL:** `pg_advisory_xact_lock(9023)` موقع تغییر role یا غیرفعال‌سازی — دو ادمین همزمان نمی‌تونن آخرین admin رو demote/deactivate کنن (race condition).

قوانین: نمی‌تونی خودت رو تغییر بدی · آخرین admin قابل حذف نیست · deactivate = revoke همهٔ نشست‌ها + bump نسخهٔ توکن.

## 📊 جمع‌بندی فلوی Auth

```
ثبت‌نام:  POST /register → نرمال‌سازی موبایل → 409؟ → bcrypt → User → توکن‌ها → کوکی
ورود:     POST /login → bcrypt verify → توکن‌ها → کوکی
OTP:      send (Redis+cooldown) → verify (Lua اتمیک) → create-or-login → توکن‌ها
Refresh:  decode → FOR UPDATE → replay? کشتن session : rotate
هر request: Bearer → decode → DB → active → version match → User → role gate
```

---

# ⚽ فاز ۴ — زمین و رزرو (TimeSlot + Booking)

دومین Vertical Slice و پیچیده‌ترین بخش منطقی پروژه: ساخت slot ها، برنامهٔ هفتگی، رزرو، پرداخت، کنسلی و جایگزین.

## ۴.۱ — `schemas/time_slot.py`

قراردادهای slot + ویرایشگر برنامهٔ هفتگی:

- `TimeSlotGenerate` → تولید انبوه از تاریخ تا تاریخ با قالب‌های ساعتی؛ حداکثر بازه **۱۸۶ روز**
- `WeeklyScheduleApply` → اعمال برنامهٔ هفتگی برای ۱/۳/۶/۱۲ ماه، حداکثر ۷۰ آیتم
- 🇮🇷 **روزهای هفته فارسی:** ۰ = شنبه ... ۶ = جمعه
- `WeeklyScheduleConflict` → تداخل‌ها با دلیل خوانا (مثلاً «رزرو آنلاین مشتری»)
- ⚠️ وضعیت‌های سیستمی (`reserving/reserved/pending_cancellation`) از ورودی کاربر رد می‌شن

## ۴.۲ — `repositories/time_slot_repo.py`

- `get_by_id(slot_id, for_update=True)` → قفل ردیفی `SELECT ... FOR UPDATE`
- ⭐ `lock_vendor_schedule(vendor_id)` → `pg_advisory_xact_lock(9022, vendor_id)` — همهٔ نوشتن‌های برنامهٔ یک مجموعه سریالایز می‌شن (تولید/ویرایش/برنامهٔ هفتگی هرگز هم‌زمان اجرا نمی‌شن)
- `has_overlap()` → چک تداخل بازهٔ نیمه‌باز
- `update()` → هر نوشتن، `version += 1` (قفل خوش‌بینانه رو تازه می‌کنه)

## ۴.۳ — `services/time_slot_service.py`

**دید عمومی:** کاربر عادی فقط ۱۴ روز آینده رو می‌بینه (`PUBLIC_SLOT_VISIBILITY_DAYS`). مجموعهٔ غیرفعال برای غریبه‌ها 404 می‌ده (پنهان‌سازی).

**کش لیست slot:** صفحهٔ اولِ کاربر ناشناس در Redis کش می‌شه (TTL 30s) — ولی annotation های per-user مثل `reserved_by_me` بعد از خواندن کش اضافه می‌شن تا وارد cache اشتراکی نشن! 🔥

**apply_weekly_schedule — الگوریتم diff:**

```
برای هر slot موجود در بازه:
   محافظت‌شده (is_reserved یا رزرو فعال)؟
      ├─ در برنامهٔ جدید نیست → اگر رزرو دستی مدیر بود و confirm داده شده حذف؛
      │    وگرنه 409 protected_booking_conflict
      └─ هست ولی قیمت/جنسیت فرق داره → دست نخورده نگه داشته می‌شه + گزارش
   آزاده؟
      ├─ در جدید نیست → حذف
      └─ فرق داره → آپدیت به open
باقی‌ماندهٔ برنامهٔ جدید → ساخت انبوه
+ ذخیرهٔ نسخهٔ WeeklyScheduleVersion جدید
```

قانون محافظت: `effective_from` نمی‌تونه قبل از «آخرین رزرو آنلاین + ۱ روز» باشه.

## ۴.۴ — `api/v1/time_slots.py`

| Endpoint | Auth | توضیح |
|---|---|---|
| GET `/vendors/{id}/slots` | عمومی (+JWT اختیاری) | لیست + `X-Cache` header |
| GET `/slots/{id}` | عمومی | جزئیات |
| POST `.../slots` · `/generate` | manager/admin | ساخت / تولید انبوه |
| GET `.../weekly-schedule-template` | manager/admin | قالب فعلی |
| POST `.../apply-weekly-schedule` | manager/admin | اعمال |
| PATCH `.../slots/{slot_id}` | manager/admin | ویرایش |

مسیرهای legacy زیر `/courts/*` هنوز زنده‌ان ولی مخفی.

## ۴.۵ — `schemas/booking.py`

- `BookingCreate {slot_id, version, with_ball}` ← **version** همون قفل خوش‌بینانه است
- `BookingCancellationTermsResponse` → پیش‌نمایش کنسلی: mode، مبلغ جریمه/بازگشت، قوانین، `blocking_reason`
- `expected_mode` در درخواست کنسلی → اگه بین دیدن شرایط و زدن دکمه، شرایط عوض شده باشه → 409
- `PaymentResponse.card_number` → سریالایزر خودکار ماسک می‌کنه

## ۴.۶ — `repositories/booking_repo.py`

ثابت کلیدی: `ACTIVE_SLOT_STATUSES = (pending_payment, confirmed, pending_cancellation)` — تعریفِ «slot اشغال». دقیقاً مطابق ایندکس جزئی DB!

توابع مهم:
- `get_active_by_slot(for_update)` → چک اشغال با قفل
- `get_pending_payment_by_user(for_update)` → قانون «یک چک‌اوت باز per user»
- `list_expired_pending(now)` → `FOR UPDATE SKIP LOCKED` — امن برای job پس‌زمینه
- آمار dashboard: `count_today`, `sum_today_revenue`

## ۴.۷ — `services/booking_service.py` — غول ~۲۹۰۰ خطی 🐉

**ثابت‌ها:** پنجرهٔ رزرو = ۱۴ روز · مهلت پرداخت = ۱۰ دقیقه · خط کنسلی = **۴۸ ساعت** · جریمه = **۱۰٪** (بازگشت ۹۰٪)

### create_booking — گام به گام:

```
1. کاربر موبایل تأیید کرده؟
2. قفل ردیف User (SELECT FOR UPDATE) → فقط یک چک‌اوت زنده per user
3. قفل slot → چک‌ها: vendor فعال، slot قابل رزرو، شروع نشده، داخل ۱۴ روز
4. version فرستاده‌شده == version فعلی؟ نه → 409 "صفحه را رفرش کنید"
5. slot اشغاله؟
   ├── رزرو PENDING_CANCELLATION رویشه؟
   │     → ساخت ReplacementRequest (جریمه ۱۰٪) + BookingHold برای خریدار جدید
   │     → برگردون ReplacementHoldResponse (checkout_type="replacement_hold")
   └── رزرو فعال دیگه → 409
6. مسیر عادی: قیمت = base_price + توپ؟ → Booking(pending_payment, expires_at=+10min)
   slot → reserving · نوتیفیکیشن مدیر · audit
```

### کنسلی — دو حالت بر اساس ۴۸ ساعت:

```
> 48h تا شروع:  جریمه ۱۰٪ الان کم می‌شه → Refund(USER_CANCELLATION) → slot آزاد → CANCELLED
≤ 48h:          booking → PENDING_CANCELLATION + ReplacementRequest(open)
                پول هنوز تکون نمی‌خوره! صبر می‌کنیم یکی بخره:
                  خرید آمد → TRANSFERRED (جریمه ۱۰٪ از فروشنده، refund ۹۰٪)
                  کسی نیامد تا شروع → برگرد به CONFIRMED بدون ضرر
```

کاربر می‌تونه پشیمون بشه: `withdraw_cancellation` (تا وقتی خریداری hold نگرفته).

### verify_zibal_payment — الگوی ۸ مرحله‌ای طلایی برای درگاه پرداخت:

```
1. قفل payment ردیف
2. idempotent? قبلاً موفق؟ → خروج سریع
3. ★ commit کن تا قفل‌ها آزاد شن (قبل از call شبکه‌ای چند ثانیه‌ای!)
4. verify_payment(track_id) به زیبال
5. دوباره قفل payment + booking
6. دوباره چک idempotency
7. مبلغ تطابق؟ (تلورانس ±۱ تومان) — عدم تطابق = CRITICAL log + 409
8. finalize اتمیک: payment SUCCESS + booking CONFIRMED + slot RESERVED + SMS
```

⭐ مرحلهٔ ۳ یعنی «هرگز قفل DB را وسط یک فراخوانی شبکه‌ای نگه ندار» — مهم‌ترین درس مهندسی این فایل!

### ماشین وضعیت Booking:

```
PENDING_PAYMENT ──پرداخت→ CONFIRMED ──کنسلی>48h→ CANCELLED
       │                        │
       timeout(12min)           ≤48h
       ↓                        ↓
    EXPIRED            PENDING_CANCELLATION ──خریدار→ TRANSFERRED
                                └──پشیمونی/انقضا→ CONFIRMED
```

⚠️ نکته: مسیرهای خطایی که باید «بمانن» (مثل منقضی شدن)، قبل از raise صریحاً commit می‌شن چون get_db برعکس می‌کنه!

## ۴.۸ — `api/v1/bookings.py`

create 12/min · pay/cancel/withdraw هرکدام 10/min. لیست‌های من/ادمین با cursor pagination.

## 🧠 جمع‌بندی ابزارهای همزمانی (Concurrency Toolkit)

| ابزار | کجا | چه چیزی تضمین می‌کنه |
|---|---|---|
| Partial Unique Index | bookings, payments, holds, penalties | یکتایی در سطح DB — آخرین سنگر |
| `FOR UPDATE` | slot/booking/payment/user | serialization ردیفی |
| Advisory Lock 9022 | schedule های vendor | سریالایز نوشتن‌های یک مجموعه |
| Advisory Lock 9023 | تغییر role/حذف admin | محافظت از آخرین admin |
| Optimistic `version` | TimeSlot | تشخیص تداخل UI بدون قفل |
| `processing_token` | پرداخت | idempotency تلاش‌های پرداخت |
| `SKIP LOCKED` | job های پس‌زمینه | چند worker بدون تصادم |

---

# 💰 فاز ۵ — بخش مالی + Vendor و Manager

## الف) مالی

### قراردادهای پول (حفظ کن!)

- همه‌جا **تومان** با `Numeric(10,2)`؛ فقط مرز زیبال Rial است (`×10` رفت، `÷10` برگشت)
- کمیسیون از جدول Setting: کلید `commission_percent`، پیش‌فرض ۱۰٪
- خالص پرداختی مدیر = `max(ناخالص − کمیسیون − جمع کارمزد درگاه, 0)`
- ⚠️ **پرداخت‌ها دستی‌ان:** ادمین بعد از انتقال بانکی خارج از سیستم فقط tracking code ثبت می‌کنه

### ۵.۱ — `services/zibal_gateway.py` — کلاینت درگاه

سه متد روی `{base}/v1/*`:
- `request_payment(amount, callback_url, ...)` → track_id + start_url (result باید 100)
- `verify_payment(track_id)` → تأیید فقط اگر result ∈ {100,201} و status ∈ {1,2} (۲۰۱ = قبلاً verify شده)
- `inquiry_payment(track_id)` → استعلام؛ status=-1 یعنی منقضی

Sandbox = تغییر `ZIBAL_BASE_URL` به `sandbox.zibal.ir`. تبدیل Toman/Rial دقیقاً همین فایله.

### ۵.۲ — `services/payment_service.py` — درگاه Mock

شبیه‌ساز PSP ایرانی با success_rate=0.75 و خطاهای متنوع (کسر موجودی/تایم‌اوت/تقلب). فقط برای dev.

### ۵.۳ — `services/finance_service.py` — مغز پول 🏦

**create_refund:** idempotent با `(booking_id, type)`؛ اسنپ‌شوت کامل (زمان slot، قیمت‌ها) + کپی کارت مقصد از BankCard.

**create_settlement_request:**
```
1. booking های واجد شرایط: online+confirmed+not_settled+پرداخت موفق+slot تمام شده → FOR UPDATE
2. خالی؟ → 409
3. مدیرِ مجموعه کارت VERIFIED داره؟ نه → 409
4. ناخالص، کمیسیون، کارمزد، خالص را حساب کن
5. مبلغ هر قلم per-booking؛ باقیماندهٔ گرد شدن به آخرین قلم
6. همهٔ booking ها → SETTLEMENT_REQUESTED
```

**FSM تسویه:** `pending → approved → paid` (+ rejected). paid نیاز به tracking code و اسنپ‌شات کارت داره.

**کنسلی توسط مدیر (`cancel_booking_by_manager`):** اگر رزرو آنلاین پرداخت‌شده بود → refund کامل بدون جریمه (`site_bears_penalty=True`) + ثبت audit در SlotCancellation + SMS.

**رزرو حضوری/دوره‌ای مدیر:** booking با `price_paid=0` و `excluded_manual_booking`.

### ۵.۴ — `services/bank_card_service.py`

ثبت یک کارت per user: lookup صاحب کارت → upsert pending (رمز Fernet + ماسک + fingerprint) → confirm کاربر → VERIFIED.
⭐ موقع confirm، refund های قدیمیِ بدون مقصد هم back-fill می‌شن!

### ۵.۵ — Route های مالی

| مسیر | Auth | نقش |
|---|---|---|
| GET `/payments/my` · `/all` | user / admin | لیست پرداخت‌ها |
| POST `/payments/zibal/verify` | عمومی (10/min) | نتیجهٔ پرداخت را finalize می‌کند |
| GET `/payments/zibal/callback` | عمومی (300/min) | callback سرور-به-سرور → redirect 303 به فرانت |
| GET `/payments/zibal/inquiry/{track}` | عمومی | polling UI |
| GET/POST `/wallet/*` | فقط dev+mock | کیف پول (در پروداکشن 404!) |
| POST/GET `/wallet/bank-cards/*` | user | ثبت/تأیید کارت |
| GET `/refunds/my` · `/penalties` | user | فقط خواندنی |

⚠️ endpoint های verify/callback/inquiry احراز هویت ندارن — امنیتشان بر secrecy بودن trackId + rate limit تکیه داره.

---

## ب) Vendor و Manager

### ۵.۶ — `services/vendor_service.py`

چرخهٔ عمر مجموعه:
```
manager می‌سازد (is_active=False اجباری!) → ادمین approve می‌کند → public
```
- فقط role دقیقاً manager می‌تونه بسازه (ادمین 403!)
- حذف با سابقهٔ رزرو → **409 ممنوع** (حفظ اسناد مالی)
- آپدیت تصاویر = semantics جایگزینی کامل؛ فایل‌های حذف‌شده فیزیکی هم پاک می‌شن
- temp_ids مصرف تک‌کاربردی با چک مالکیت

### ۵.۷ — `services/upload_temp_service.py` — پروتکل آپلود دو مرحله‌ای

```
مرحله 1: POST /uploads/vendor-image → فایل ذخیره (S3/لوکال) + توکن Redis
         temp_upload:{uuid} = {user_id, path} · TTL 1 ساعت + GC ZSET
مرحله 2: ارسال temp_ids هنگام ساخت vendor → consume (اعتبارسنجی همه، بعد حذف)
فایل‌های بی‌صاحب → cleanup خودکار بعد ~1 ساعت
```

### ۵.۸ — `services/replacement_service.py` — موتور انقضا

job پس‌زمینه که دو چیز رو منقضی می‌کنه:
- **درخواست‌های deadline گذشته:** hold ها fail، request → expired، رزرو اصلی برمی‌گرده CONFIRMED بدون جریمه («رزرو همچنان متعلق به شماست»)
- **hold های منقضی:** request برمی‌گرده open برای خریدار بعدی

انتخاب با `FOR UPDATE SKIP LOCKED` → چند worker امن.

### ۵.۹ — Route های vendor/manager/uploads

| مسیر | نکته |
|---|---|
| `/vendors` CRUD + تصاویر | dual-mount با `/courts` قدیمی |
| `/manager/bookings` | رزروهای همهٔ مجموعه‌های مدیر + فیلتر finance_only |
| `/manager/bookings/manual` · `/recurring` | رزرو حضوری/دوره‌ای |
| `/manager/bookings/{id}/cancel` | کنسل مدیر + جواب SlotCancellation |
| `/manager/finance/summary` · `/settlements*` | چرخهٔ تسویه |
| `/manager/slots` | slot ها + آخرین رزرو مرتبط هرکدام |
| `/manager-requests` | درخواست مدیر شدن؛ **تأیید = ارتقای role به MANAGER** (idempotent + قفل ردیف) |
| `/uploads/vendor-image` | مرحلهٔ ۱ پروتکل (10/min) |

⚠️ ارتقا به manager داخل route انجام می‌شه نه service — استثنایی از الگو.

---

# 🧰 فاز ۶ — امکانات جانبی

## ۶.۱ — `services/cache_service.py` — کتابخانهٔ کش Redis 📦

همهٔ عملیات‌ها در برابر خطای Redis مقاومن (miss = Redis down، هیچ exception ای بیرون نمی‌ره).

| خانوادهٔ کش | الگوی کلید | TTL |
|---|---|---|
| لیست slot ها | `slots:{vendor_id}[:{date}]` | ۳۰ ثانیه |
| لیست‌های ادمین/اعلان | `admin_list:{prefix}:{md5(params)}` | ۶۰ ثانیه |
| پاسخ‌های dashboard | `resp:{prefix}:{md5}` | ۶۰ ثانیه |
| کمترین قیمت مجموعه‌ها | hash + کلید تکی | **۴۸ ساعت** |

- `_ttl_jitter` = ±۲۰٪ تصادفی → جلوگیری از stampede همزمانی انقضاها
- حذف با SCAN نه KEYS
- Prometheus: شمارنده‌های hit/miss

## ۶.۲ — `services/dashboard_service.py` + `api/v1/dashboard.py`

آمار برای ۴ نقش: عمومی / ادمین / مدیر / کاربر. تجمیع‌های SQL خالص.

⚠️ دو نکته:
- مرز «امروز» = روز ایران تبدیل به UTC (`_iran_day_start_utc`)
- کش dashboard **هیچ invalidation ای نداره** — عمداً؛ تا ~۶۰ ثانیه عقب می‌مونه

## ۶.۳ — `api/v1/admin.py` — اتاق کنترل ادمین 🎛️

بخش‌ها: broadcast اعلان · لاگ‌های audit (حذف فقط dev!) · approve/reject vendor · حذف سخت user (با قفل advisory + محافظت آخرین admin؛ نسخهٔ force با ترتیب دستی حذف FK-safe) · تنظیمات سیستم و seed · مدیریت refund/settlement (+ endpoint «نمایش شماره کارت» که decrypt می‌کنه و audit می‌شه) · آپلود hero image · `POST /admin/seed-admin` (فقط bootstrap، secret header، قفل advisory).

⭐ الگوی جالب: قبل از چک دسترسیِ حذف لاگ، خودِ *تلاش برای حذف* لاگ WARNING می‌شه!

## ۶.۴ — Reviews (نظرات)

- ساخت نظر: فقط booking confirmed که slot اش ≥۲ ساعت پیش تموم شده؛ یک نظر per رزرو (unique)
- پاسخ مدیر روی همان ردیف (`response`) · report/delete فقط ادمین · میانگین rating از نظرات غیر reported و با قفل ردیف vendor بازمحاسبه می‌شه
- GET `/reviews/recent` عمومی برای صفحهٔ اصلی

## ۶.۵ — Notifications / Favorites / Contact / Settings

| بخش | نقاط مهم |
|---|---|
| Notifications | لیست کش‌شده per-user؛ mark-read مالکیت‌سنجیده؛ read-all انبوه |
| Favorites | unique(user,vendor)؛ batch check برای UI؛ vendor غیرفعال فقط برای ادمین/مالک قابل علاقه‌مندی |
| Contact | POST عمومی 5/min مستقیم در route (بدون repo/service!) · inbox ادمین کش‌دار |
| Settings | مسیرهای public فقط whitelist (`rules_text`, `contact`, ...)؛ ⚠️ هر کاربر لاگین هر کلیدی رو می‌تونه بخونه |

## ۶.۶ — `api/openapi_docs.py`

~۱۰۰ توضیح دستی فارسی برای endpoint ها + علامت‌گذاری JWT اختیاری روی مسیرهای عمومی. صرفاً لایهٔ داکیومنت.

---

# 🎓 جمع‌بندی نهایی — چک‌لیست تسلط

اگر این‌ها رو بلدی، روی بک‌اند ToopSet مسلطی:

**معماری**
- [ ] مسیر درخواست: Route → Service → Repo → Model، و Schema دورش
- [ ] repo ها commit نمی‌کنن؛ تراکنش مال `get_db` است
- [ ] خطاهای کسب‌وکار = HTTPException در service؛ envelope فارسی در exceptions.py

**امنیت**
- [ ] JWT سه نوع + `token_version` برای انقضای گروهی + rotation با کشف replay
- [ ] refresh token فقط هش‌شده ذخیره می‌شه؛ کوکی HttpOnly با path محدود
- [ ] OTP: Lua اتمیک، cooldown، قفل ۵ خطا
- [ ] bcrypt + placeholder OTP users + Fernet برای کارت بانکی

**پول**
- [ ] تومان Numeric(10,2)؛ Rial فقط مرز زیبال؛ کمیسیون Setting
- [ ] چرخه: Payment موفق → Settlement (approve→paid دستی) / Refund (FSM + اسنپ‌شوت کارت)

**همزمانی**
- [ ] Partial unique index ها = سنگر نهایی
- [ ] FOR UPDATE + advisory lock های ۹۰۲۲/۹۰۲۳ + version خوش‌بینانه + SKIP LOCKED
- [ ] قانون طلایی: قبل از call شبکه‌ای، commit کن تا قفل‌ها آزاد شن

**چرخهٔ رزرو**
- [ ] slot version → create → پرداخت ۱۰ دقیقه‌ای → confirm
- [ ] کنسلی >48h = جریمه ۱۰٪ فوری؛ ≤48h = بازار جایگزین تا لحظهٔ شروع
- [ ] job های پس‌زمینه main.py: انقضا، reconciliation زیبال، قیمت شبانه

**زیرساخت**
- [ ] DB همیشه UTC؛ ورودی تهران؛ نمایش شمسی
- [ ] کش Redis بدون invalidation در dashboard، با invalidation در slot/admin lists
- [ ] audit log جدول logs با ماسک PII

---

*ساخته‌شده برای یادگیری عمیق پروژه — نسخهٔ بک‌اند 1.0.1*






