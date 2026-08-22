# مستندات ساختار بک‌اند توپ‌سِت (ToopSet)

> **نسخه:** 1.0.1  
> **تکنولوژی‌ها:** Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), asyncpg, PostgreSQL 17, Redis, Alembic, Pydantic v2, JWT, Prometheus, Sentry, OpenTelemetry  
> **معماری:** لایه‌بندی (Layered Architecture) — Route → Service → Repository → Model

---

## فهرست مطالب

1. [معماری کلی](#معماری-کلی)
2. [ساختار دایرکتوری‌ها](#ساختار-دایرکتوری‌ها)
3. [لایه Core (هسته)](#لایه-core)
4. [لایه Models (مدل‌های دیتابیس)](#لایه-models)
5. [لایه Repositories (دسترسی به داده)](#لایه-repositories)
6. [لایه Services (منطق کسب‌وکار)](#لایه-services)
7. [لایه Schemas (مدل‌های Pydantic)](#لایه-schemas)
8. [لایه API Routes (مسیرها)](#لایه-api-routes)
9. [مigrations (مهاجرت‌های دیتابیس)](#مigrations)
10. [scripts (اسکریپت‌ها)](#scripts)
11. [tests (تست‌ها)](#tests)

---

## معماری کلی

پروژه توپ‌سِت از معماری **لایه‌بندی** (Layered Architecture) پیروی می‌کند:

```
Request → Middleware → Router → Service → Repository → Database
                              ↓
                           Schema (Pydantic Validation)
```

- **Routerها** (در `api/v1/`) فقط مسئول دریافت درخواست و برگرداندن پاسخ هستند. هیچ منطق کسب‌وکاری ندارند.
- **Serviceها** (در `services/`) منطق کسب‌وکار را پیاده‌سازی می‌کنند.
- **Repositoryها** (در `repositories/`) عملیات CRUD روی دیتابیس را انجام می‌دهند. هر کلاس مختص یک مدل است.
- **Modelها** (در `models/`) کلاس‌های ORM SQLAlchemy هستند.
- **Schemaها** (در `schemas/`) مدل‌های Pydantic برای اعتبارسنجی ورودی/خروجی هستند.
- **Core** (در `core/`) شامل تنظیمات، امنیت، دیتابیس، ردیس، لاگ، Metrics و ... است.

---

## ساختار دایرکتوری‌ها

```
backend/
├── app/                          # پکیج اصلی برنامه
│   ├── __init__.py               # نسخه برنامه (1.0.1)
│   ├── main.py                   # نقطه ورود FastAPI
│   ├── api/                      # لایه API
│   │   ├── __init__.py
│   │   ├── deps.py               # وابستگی‌های احراز هویت
│   │   ├── openapi_docs.py       # توضیحات دستی OpenAPI
│   │   └── v1/                   # نسخه 1 API
│   │       ├── admin.py          # مدیریت ادمین
│   │       ├── auth.py           # احراز هویت
│   │       ├── bookings.py       # رزروها
│   │       ├── contact.py        # تماس با ما
│   │       ├── dashboard.py      # داشبورد
│   │       ├── favorites.py      # علاقه‌مندی‌ها
│   │       ├── manager.py        # مدیریت مجموعه
│   │       ├── manager_requests.py # درخواست‌های مدیریت
│   │       ├── notifications.py  # اعلان‌ها
│   │       ├── payments.py       # پرداخت‌ها
│   │       ├── penalties.py      # جریمه‌ها
│   │       ├── refunds.py        # بازپرداخت‌ها
│   │       ├── reviews.py        # نظرات
│   │       ├── settings.py       # تنظیمات عمومی
│   │       ├── time_slots.py     # سانس‌ها
│   │       ├── uploads.py        # آپلود فایل
│   │       ├── users.py          # مدیریت کاربران (ادمین)
│   │       ├── vendors.py        # مجموعه‌های ورزشی
│   │       └── wallet.py         # کیف پول
│   ├── core/                     # لایه هسته
│   │   ├── config.py             # تنظیمات (Pydantic Settings)
│   │   ├── database.py           # اتصال دیتابیس async
│   │   ├── security.py           # JWT, هش کردن پسورد
│   │   ├── exceptions.py         # هندلرهای خطا
│   │   ├── redis_client.py       # کلاینت Redis
│   │   ├── rate_limiter.py       # محدودکننده نرخ
│   │   ├── cache_service.py      # سرویس کش (در core/services)
│   │   ├── pagination.py         # صفحه‌بندی cursor
│   │   ├── upload.py             # آپلود فایل محلی
│   │   ├── s3_service.py         # آپلود به S3
│   │   ├── card_security.py      # امنیت کارت بانکی
│   │   ├── health.py             # وضعیت سرویس
│   │   ├── metrics.py            # Prometheus metrics
│   │   ├── profiler.py           # پروفایلر درخواست
│   │   ├── telemetry.py          # OpenTelemetry
│   │   ├── logger.py             # لاگ امنیتی
│   │   ├── logging_config.py     # تنظیمات لاگ JSON
│   │   ├── correlation_id.py     # Correlation ID
│   │   ├── timezone.py           # منطقه زمانی ایران
│   │   ├── date_utils.py         # ابزارهای تاریخ شمسی
│   │   ├── phone.py              # اعتبارسنجی شماره تلفن
│   │   └── legal_content.py      # محتوای حقوقی پیش‌فرض
│   ├── models/                   # مدل‌های SQLAlchemy
│   ├── repositories/             # لایه دسترسی به داده
│   ├── schemas/                  # مدل‌های Pydantic
│   ├── services/                 # لایه منطق کسب‌وکار
│   └── uploads/                  # فایل‌های آپلود شده
│       ├── avatars/
│       ├── courts/
│       └── vendors/
├── migrations/                   # مهاجرت‌های Alembic
│   ├── env.py
│   └── versions/                 # فایل‌های مهاجرت
├── scripts/                      # اسکریپت‌های کاربردی
│   ├── seed.py                   # پر کردن دیتابیس
│   ├── run_migrations.py         # اجرای مهاجرت
│   └── check_revisions.py        # بررسی نسخه‌ها
├── tests/                        # تست‌ها
├── pyproject.toml                # تنظیمات پروژه
├── alembic.ini                   # تنظیمات Alembic
└── requirements.txt              # وابستگی‌ها
```

---

## لایه Core

### `app/core/config.py` — تنظیمات برنامه

کلاس `Settings` با استفاده از `pydantic-settings` تمام متغیرهای محیطی را مدیریت می‌کند:

| متغیر | توضیح |
|-------|-------|
| `DATABASE_URL` | کانکشن استرینگ دیتابیس (اولویت دارد) |
| `postgres_*` | تنظیمات تکی PostgreSQL |
| `REDIS_URL` | کانکشن استرینگ Redis (اولویت دارد) |
| `redis_*` | تنظیمات تکی Redis |
| `secret_key` | کلید امضای JWT |
| `secret_key_previous` | کلید قبلی برای چرخش کلید |
| `access_token_expire_minutes` | مدت اعتبار access token (پیش‌فرض ۳۰ دقیقه) |
| `refresh_token_expire_days` | مدت اعتبار refresh token (پیش‌فرض ۷ روز) |
| `payment_gateway` | درگاه پرداخت: `mock` یا `zibal` |
| `sms_provider` | ارائه‌دهنده پیامک: `mock` یا `smsir` |
| `cors_origins` | دامنه‌های مجاز CORS |
| `parspack_*` | تنظیمات S3 (ParsPack) |
| `sentry_dsn` | کلید Sentry |
| `auto_migrate` | اجرای خودکار مهاجرت در startup |
| `profiler_*` | تنظیمات پروفایلر |
| `otel_*` | تنظیمات OpenTelemetry |

تابع `validate_env()` در startup تمام متغیرهای حیاتی را بررسی می‌کند و در صورت مشکل `EnvValidationError`抛 می‌کند.

---

### `app/core/database.py` — اتصال دیتابیس

- **Engine:** `create_async_engine` با `asyncpg`
- **Session Factory:** `async_sessionmaker` با `AsyncSession`
- **Base:** کلاس پایه `DeclarativeBase` برای همه مدل‌ها
- **Pool:** `pool_size=20`, `max_overflow=10`
- **Query Timing:** slow query logger (آستانه ۲۰۰ms)
- **get_db():** generator برای دریافت session و commit/rollback خودکار

---

### `app/core/security.py` — امنیت و JWT

- **Password Hashing:** `passlib` با `bcrypt`
- **Token Hashing:** SHA-256 برای ذخیره refresh token
- **JWT Claims:** `iat`, `nbf`, `jti`, `iss`, `aud`, `exp`, `type`
- **Key Rotation:** پشتیبانی از `secret_key` و `secret_key_previous`
- **Token Types:** `access`, `refresh`, `password_reset`
- **tokens_for_user():** ساخت جفت توکن با `sub`, `role`, `ver`, `sid`
- **decode_token():** امتحان همه کلیدهای فعال + clock skew leeway

---

### `app/core/exceptions.py` — مدیریت خطا

- **SecurityHeadersMiddleware:** هدرهای امنیتی OWASP
- **Error Response:** ساختار `ErrorResponse` با `request_id`, `timestamp`, `fields`
- **Handlers:** `http_exception_handler`, `validation_exception_handler`, `integrity_error_handler`, `statement_error_handler`, `generic_exception_handler`
- **ترجمه خطاها:** پیام‌های خطا به فارسی ترجمه می‌شوند

---

### `app/core/redis_client.py` — کلاینت Redis

- **Connection Pool:** `max_connections=50`
- **Health Check:** `health_check_interval=30`
- **تعویض خودکار event loop:** برای سازگاری با pytest-asyncio
- **Fallback:** در صورت عدم دسترسی به Redis، rate limiter به حافظه داخلی سوئیچ می‌کند

---

### `app/core/rate_limiter.py` — محدودکننده نرخ

- **موتور:** `slowapi` با `fixed-window`
- **ذخیره‌سازی:** Redis (یا درون‌حافظه‌ای در صورت عدم دسترسی)
- **پیام خطا:** فارسی (۴۲۹)

---

### `app/core/pagination.py` — صفحه‌بندی

- **Cursor-based:** `encode_cursor()` / `decode_cursor()` با Base64
- **CursorPage:** مدل generic برای پاسخ‌های صفحه‌بندی شده

---

### `app/core/upload.py` — آپلود فایل

- **پشتیبانی:** `jpg`, `jpeg`, `png`, `webp`
- **Magic Bytes:** اعتبارسنجی محتوای فایل با امضای باینری
- **حداکثر حجم:** ۵ مگابایت
- **ذخیره‌سازی:** محلی یا S3 (با `save_upload_async`)
- **حذف:** `delete_upload()` / `delete_upload_async()`

---

### `app/core/s3_service.py` — سرویس S3 (ParsPack)

- **کتابخانه:** `aioboto3`
- **عملیات:** `upload_to_s3()` / `delete_from_s3()` / `public_url()`
- **پشتیبانی:** Path-style addressing با SigV4

---

### `app/core/card_security.py` — امنیت کارت بانکی

- **رمزنگاری:** `cryptography.fernet` با SHA-256 از `secret_key`
- **Fingerprint:** SHA-256 برای تشخیص کارت تکراری
- **Mask:** نمایش `6219-****-****-1234`
- **Normalize:** حذف کاراکترهای غیرعددی

---

### `app/core/health.py` — وضعیت سرویس

- **Probe دیتابیس:** `SELECT 1`
- **Probe Redis:** `PING`
- **خروجی:** `status`, `version`, `uptime_seconds`, `components`

---

### `app/core/metrics.py` — Prometheus Metrics

- **HTTP Metrics:** تعداد درخواست، تأخیر، خطا، درخواست‌های هم‌زمان
- **Business Metrics:** کاربران، مجموعه‌های فعال، رزروهای امروز، درآمد امروز
- **Cache Metrics:** hit/miss, eviction, memory
- **Pool Metrics:** وضعیت connection pool
- **Payment Reconciliation Metrics:** وضعیت تسویه زیبال
- **Profiler Metrics:** duration, DB count, Redis count, size

---

### `app/core/profiler.py` — پروفایلر درخواست

- **ContextVar:** ذخیره داده‌های پروفایلر در هر درخواست
- **Slow Request Logging:** لاگ درخواست‌های کند (آستانه قابل تنظیم)
- **Metrics Export:** ارسال به Prometheus

---

### `app/core/telemetry.py` — OpenTelemetry

- **Instrumentation:** FastAPI, SQLAlchemy, Redis, HTTPX
- **Exporter:** OTLP gRPC + Console
- **Sampling:** نرخ نمونه‌برداری قابل تنظیم

---

### `app/core/logger.py` — لاگ امنیتی

- **تابع:** `log_action()` برای نوشتن لاگ در جدول `logs`
- **Redact:** پنهان‌سازی شماره تلفن و کارت در جزئیات لاگ
- **فیلدها:** `user_id`, `action`, `details`, `severity`, `request_id`, `ip_address`, `user_agent`

---

### `app/core/logging_config.py` — تنظیمات لاگ JSON

- **فرمت:** JSON به stdout (برای Docker) + فایل چرخشی
- **Request ID Filter:** افزودن `request_id` به هر لاگ
- **Health Filter:** حذف لاگ‌های `/health`

---

### `app/core/correlation_id.py` — شناسه درخواست

- **ContextVar:** ذخیره `request_id` در context
- **Middleware:** خواندن `X-Request-ID` از هدر یا تولید UUID
- **Response Header:** برگرداندن `X-Request-ID` در پاسخ

---

### `app/core/timezone.py` — منطقه زمانی

- **منطقه:** `Asia/Tehran` (UTC+3:30 استاندارد / UTC+4:30 تابستان)
- **توابع:** `now_utc()`, `now_iran()`, `iran_to_utc()`, `utc_to_iran()`

---

### `app/core/date_utils.py` — ابزارهای تاریخ

- **parse_date_filter:** تبدیل تاریخ شمسی (`1403/06/01`) یا میلادی به UTC
- **parse_date_filter_end:** مثل بالا اما با end of day

---

### `app/core/phone.py` — اعتبارسنجی تلفن

- **Normalize:** تبدیل ارقام فارسی/عربی به انگلیسی
- **Validation:** الگوی `09[0-9]{9}$` (شماره موبایل ایران)

---

### `app/core/legal_content.py` — محتوای حقوقی

- **ثابت‌ها:** `LEGAL_SETTINGS` شامل `rules_text` و `privacy_text` (قوانین و حریم خصوصی)

---

## لایه Models

همه مدل‌ها از `Base` (در `database.py`) ارث‌بری می‌کنند. نام جدول‌ها به صورت `snake_case` و جمع هستند.

### `User` — کاربران (`users`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `full_name` | String(128) | نام کامل |
| `phone` | String(16) unique | شماره موبایل (با قالب 09...) |
| `password_hash` | String(256) | هش رمز عبور |
| `role` | Enum: user/manager/admin | نقش کاربر |
| `avatar_url` | String(512) nullable | آدرس تصویر پروفایل |
| `token_version` | int | نسخه توکن (برای ابطال نشست‌ها) |
| `is_active` | bool | فعال بودن حساب |
| `phone_verified_at` | DateTime nullable | زمان تأیید شماره |
| `created_at` | DateTime | زمان ثبت‌نام |

**روابط:** `vendors`, `bookings`, `reviews`, `penalties`, `logs`, `notifications`, `wallets`, `favorites`, `refresh_tokens`, `bank_cards`

---

### `Vendor` — مجموعه‌های ورزشی (`vendors`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `manager_id` | FK → users.id | مدیر مجموعه |
| `name` | String(256) | نام مجموعه |
| `sport_types` | ARRAY(String) | انواع ورزش (والیبال، بسکتبال، فوتسال، هندبال، فوتبال) |
| `address` | Text | آدرس |
| `latitude` | Float | عرض جغرافیایی |
| `longitude` | Float | طول جغرافیایی |
| `capacity` | Integer | ظرفیت |
| `amenities` | JSON nullable | امکانات |
| `ball_available` | bool | توپ موجود است |
| `ball_price` | Numeric(10,2) | قیمت توپ |
| `is_active` | bool | فعال بودن (تأیید شده) |
| `average_rating` | Float | میانگین امتیاز |
| `created_at` | DateTime | زمان ایجاد |

**روابط:** `manager`, `time_slots`, `reviews`, `vendor_images`, `favorites`, `weekly_schedule_versions`

---

### `VendorImage` — تصاویر مجموعه (`vendor_images`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `vendor_id` | FK → vendors.id | مجموعه |
| `url` | String(512) | آدرس تصویر |
| `order` | Integer | ترتیب نمایش |
| `created_at` | DateTime | زمان آپلود |

---

### `TimeSlot` — سانس‌های زمانی (`time_slots`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `vendor_id` | FK → vendors.id | مجموعه |
| `start_time` | DateTime | زمان شروع |
| `end_time` | DateTime | زمان پایان |
| `base_price` | Numeric(10,2) | قیمت پایه |
| `gender` | Enum: male/female | جنسیت |
| `status` | Enum: open/reserving/pending_cancellation/reserved/blocked/disabled/closed | وضعیت |
| `is_reserved` | bool | رزرو شده؟ |
| `version` | int | نسخه (برای optimistic locking) |

**محدودیت یکتا:** `(vendor_id, start_time, end_time)`  
**روابط:** `vendor`, `bookings`

---

### `Booking` — رزروها (`bookings`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `user_id` | FK → users.id | کاربر رزروکننده |
| `slot_id` | FK → time_slots.id | سانس |
| `replaces_booking_id` | FK → bookings.id nullable | جایگزین کدام رزرو |
| `status` | Enum: pending_payment/confirmed/pending_cancellation/transferred/cancelled/expired | وضعیت |
| `source` | Enum: online/manager_manual | منبع رزرو |
| `settlement_status` | Enum | وضعیت تسویه |
| `created_by_manager_id` | FK → users.id nullable | مدیر ایجادکننده |
| `customer_full_name` | String(128) nullable | نام مشتری (دستی) |
| `customer_phone` | String(16) nullable | تلفن مشتری (دستی) |
| `price_paid` | Numeric(10,2) | مبلغ پرداختی |
| `slot_price` | Numeric(10,2) nullable | قیمت سانس |
| `ball_price` | Numeric(10,2) | قیمت توپ |
| `with_ball` | bool | با توپ؟ |
| `penalty_amount` | Numeric(10,2) nullable | جریمه |
| `created_at` | DateTime | زمان ایجاد |
| `updated_at` | DateTime | آخرین بروزرسانی |
| `expires_at` | DateTime nullable | زمان انقضای پرداخت |

**محدودیت یکتا:** یک رزرو فعال در هر سانس، یک pending_payment در هر کاربر  
**روابط:** `user`, `slot`, `payments`, `review`, `penalties`, `refunds`

---

### `Payment` — پرداخت‌ها (`payments`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `booking_id` | FK → bookings.id | رزرو |
| `amount` | Numeric(10,2) | مبلغ |
| `gateway_transaction_id` | String(256) nullable | شناسه تراکنش درگاه |
| `gateway_name` | String(64) nullable | نام درگاه |
| `card_number` | String(32) nullable | شماره کارت |
| `ref_id` | String(64) nullable | کد رهگیری |
| `gateway_fee` | Numeric(10,2) nullable | کارمزد درگاه |
| `idempotency_key` | String(64) nullable | کلید یکتایی |
| `processing_token` | String(64) nullable | توکن پردازش |
| `failure_code` | String(64) nullable | کد خطا |
| `paid_at` | DateTime nullable | زمان پرداخت |
| `status` | Enum: pending/success/failed/expired | وضعیت |
| `created_at` | DateTime | زمان ایجاد |

**محدودیت یکتا:** یک پرداخت موفق در هر رزرو، `gateway_transaction_id` یکتا، `idempotency_key` یکتا

---

### `Refund` — بازپرداخت‌ها (`refunds`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `booking_id` | FK → bookings.id | رزرو |
| `user_id` | FK → users.id | کاربر |
| `vendor_id` | FK → vendors.id | مجموعه |
| `slot_id` | FK → time_slots.id | سانس |
| `slot_start_time` | DateTime | شروع سانس (snapshot) |
| `slot_end_time` | DateTime | پایان سانس (snapshot) |
| `original_amount` | Numeric(10,2) | مبلغ اصلی |
| `slot_price` | Numeric(10,2) nullable | قیمت سانس |
| `ball_price` | Numeric(10,2) | قیمت توپ |
| `total_paid` | Numeric(10,2) | کل پرداختی |
| `penalty_amount` | Numeric(10,2) | جریمه |
| `refund_amount` | Numeric(10,2) | مبلغ بازپرداخت |
| `reason` | Text | دلیل |
| `type` | Enum: user_cancellation/manager_cancellation/replaced_after_pending_cancellation | نوع |
| `status` | Enum: pending/approved/rejected/paid | وضعیت |
| `penalty_charged_to_user` | bool | جریمه از کاربر کسر شد؟ |
| `site_bears_penalty` | bool | سایت جریمه را تقبل کرد؟ |
| `destination_card_encrypted` | String(512) nullable | کارت مقصد (رمزنگاری شده) |
| `destination_card_masked` | String(32) nullable | کارت مقصد (ماسک شده) |
| `destination_card_holder_name` | String(128) nullable | نام صاحب کارت |
| `requested_at` | DateTime | زمان درخواست |
| `approved_at` | DateTime nullable | زمان تأیید |
| `paid_at` | DateTime nullable | زمان پرداخت |
| `admin_note` | Text nullable | یادداشت ادمین |
| `payment_tracking_code` | String(128) nullable | کد رهگیری پرداخت |

---

### `Penalty` — جریمه‌ها (`penalties`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `user_id` | FK → users.id | کاربر |
| `booking_id` | FK → bookings.id unique | رزرو |
| `amount` | Numeric(10,2) | مبلغ جریمه |
| `reason` | String(128) | دلیل |
| `created_at` | DateTime | زمان ایجاد |

---

### `Review` — نظرات (`reviews`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `user_id` | FK → users.id | کاربر |
| `vendor_id` | FK → vendors.id | مجموعه |
| `booking_id` | FK → bookings.id unique | رزرو |
| `rating` | SmallInteger | امتیاز (۱-۵) |
| `comment` | Text nullable | متن نظر |
| `response` | Text nullable | پاسخ مدیر |
| `is_reported` | bool | گزارش شده؟ |
| `created_at` | DateTime | زمان ایجاد |

---

### `BankCard` — کارت‌های بانکی (`bank_cards`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `user_id` | FK → users.id unique | کاربر |
| `encrypted_card_number` | String(512) | شماره کارت رمزنگاری شده |
| `masked_card_number` | String(32) | شماره کارت ماسک شده |
| `card_fingerprint` | String(64) index | اثر انگشت کارت |
| `holder_name` | String(128) nullable | نام صاحب کارت |
| `status` | Enum: pending_confirmation/verified/rejected | وضعیت |
| `verified_at` | DateTime nullable | زمان تأیید |
| `created_at` | DateTime | زمان ایجاد |
| `updated_at` | DateTime | آخرین بروزرسانی |

---

### `Wallet` — کیف پول (`wallets`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `user_id` | FK → users.id unique | کاربر |
| `balance` | Numeric(10,2) | موجودی |
| `created_at` | DateTime | زمان ایجاد |
| `updated_at` | DateTime | آخرین بروزرسانی |

---

### `WalletTransaction` — تراکنش‌های کیف پول (`wallet_transactions`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `wallet_id` | FK → wallets.id | کیف پول |
| `amount` | Numeric(10,2) | مبلغ |
| `type` | String(20) | نوع: deposit/withdrawal/refund |
| `description` | Text nullable | توضیحات |
| `created_at` | DateTime | زمان ایجاد |

---

### `Notification` — اعلان‌ها (`notifications`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `user_id` | FK → users.id | کاربر |
| `type` | String(64) | نوع |
| `message` | Text | پیام |
| `is_read` | bool | خوانده شده؟ |
| `created_at` | DateTime | زمان ایجاد |

### `NotificationDelivery` — تحویل اعلان (`notification_deliveries`)

ردیابی تحویل اعلان (SMS/...) با وضعیت، تعداد تلاش، خطا.

---

### `RefreshToken` — توکن‌های رفرش (`refresh_tokens`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `token_hash` | String(128) unique | هش توکن |
| `user_id` | FK → users.id | کاربر |
| `session_id` | String(36) | شناسه نشست |
| `issued_at` | DateTime | زمان صدور |
| `expires_at` | DateTime | زمان انقضا |
| `revoked_at` | DateTime nullable | زمان ابطال |
| `replaced_by` | String(128) nullable | جایگزین شده با |
| `device_info` | String(512) nullable | اطلاعات دستگاه |
| `ip_address` | String(45) nullable | آدرس IP |
| `user_agent` | Text nullable | User-Agent |

---

### `Favorite` — علاقه‌مندی‌ها (`favorites`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `user_id` | FK → users.id | کاربر |
| `vendor_id` | FK → vendors.id | مجموعه |
| `created_at` | DateTime | زمان ایجاد |

**محدودیت یکتا:** `(user_id, vendor_id)`

---

### `Settlement` — تسویه حساب‌ها (`settlements`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `manager_id` | FK → users.id | مدیر |
| `vendor_id` | FK → vendors.id | مجموعه |
| `requested_amount` | Numeric(10,2) | مبلغ درخواستی |
| `approved_amount` | Numeric(10,2) nullable | مبلغ تأیید شده |
| `gross_amount` | Numeric(10,2) | مبلغ ناخالص |
| `commission_percent` | Numeric(5,2) | درصد کمیسیون |
| `commission_amount` | Numeric(10,2) | مبلغ کمیسیون |
| `gateway_fee` | Numeric(10,2) | کارمزد درگاه |
| `bookings_count` | int | تعداد رزروها |
| `period_from` | DateTime nullable | شروع دوره |
| `period_to` | DateTime nullable | پایان دوره |
| `status` | Enum: pending/approved/rejected/paid | وضعیت |
| `manager_note` | Text nullable | یادداشت مدیر |
| `admin_note` | Text nullable | یادداشت ادمین |
| `payment_tracking_code` | String(128) nullable | کد رهگیری |
| `destination_card_*` | ... | کارت مقصد (snapshot) |
| `requested_at` | DateTime | زمان درخواست |
| `approved_at` | DateTime nullable | زمان تأیید |
| `paid_at` | DateTime nullable | زمان پرداخت |

### `SettlementItem` — آیتم‌های تسویه (`settlement_items`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `settlement_id` | FK → settlements.id | تسویه |
| `booking_id` | FK → bookings.id | رزرو |
| `amount` | Numeric(10,2) | مبلغ |

---

### `SlotCancellation` — لغو سانس توسط مدیر (`slot_cancellations`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `slot_id` | FK → time_slots.id | سانس |
| `booking_id` | FK → bookings.id nullable | رزرو |
| `vendor_id` | FK → vendors.id | مجموعه |
| `manager_id` | FK → users.id | مدیر |
| `affected_user_id` | FK → users.id nullable | کاربر متأثر |
| `affected_full_name` | String(128) nullable | نام کاربر |
| `affected_phone` | String(16) nullable | تلفن کاربر |
| `reason` | Text nullable | دلیل |
| `release_slot` | bool | آزاد کردن سانس؟ |
| `online_paid_amount` | Numeric(10,2) nullable | مبلغ پرداختی آنلاین |
| `site_cost_amount` | Numeric(10,2) | هزینه سایت |
| `sms_status` | String(32) nullable | وضعیت پیامک |
| `notification_status` | String(32) nullable | وضعیت اعلان |
| `review_status` | String(32) | وضعیت بازبینی |
| `created_at` | DateTime | زمان ایجاد |

---

### `ReplacementRequest` — درخواست جایگزینی (`replacement_requests`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `original_booking_id` | FK → bookings.id unique | رزرو اصلی |
| `replacement_booking_id` | FK → bookings.id nullable unique | رزرو جایگزین |
| `slot_id` | FK → time_slots.id | سانس جدید |
| `status` | Enum: open/held/completed/expired/revoked | وضعیت |
| `penalty_amount` | Numeric(10,2) | جریمه |
| `refund_amount` | Numeric(10,2) | مبلغ بازپرداخت |
| `deadline` | DateTime | مهلت |
| `created_at` | DateTime | زمان ایجاد |
| `updated_at` | DateTime | آخرین بروزرسانی |
| `completed_at` | DateTime nullable | زمان تکمیل |

### `BookingHold` — هولد جایگزینی (`booking_holds`)

شامل اطلاعات پرداخت هولد (مشابه Payment) با وضعیت‌های: `active`, `processing`, `paid`, `expired`, `failed`, `cancelled`

---

### `ContactMessage` — پیام‌های تماس (`contact_messages`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `name` | String(256) | نام |
| `email` | String(256) nullable | ایمیل |
| `phone` | String(32) | تلفن |
| `subject` | String(512) | موضوع |
| `message` | Text | پیام |
| `created_at` | DateTime | زمان ارسال |

---

### `ManagerRequest` — درخواست‌های مدیریت (`manager_requests`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `user_id` | FK → users.id | کاربر |
| `vendor_name` | String(256) | نام مجموعه |
| `phone` | String(16) | تلفن |
| `message` | Text nullable | پیام |
| `status` | Enum: pending/approved/rejected | وضعیت |
| `admin_note` | Text nullable | یادداشت ادمین |
| `created_at` | DateTime | زمان ایجاد |
| `updated_at` | DateTime nullable | آخرین بروزرسانی |

---

### `Setting` — تنظیمات سیستم (`settings`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `key` | String(128) unique index | کلید |
| `value` | Text | مقدار |
| `description` | String(256) nullable | توضیحات |
| `created_at` | DateTime | زمان ایجاد |
| `updated_at` | DateTime | آخرین بروزرسانی |

---

### `Log` — لاگ‌های امنیتی (`logs`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `user_id` | FK → users.id nullable | کاربر |
| `action` | String(128) | عملیات |
| `details` | Text nullable | جزئیات |
| `severity` | String(16) | سطح: INFO/WARNING/CRITICAL |
| `request_id` | String(64) nullable | شناسه درخواست |
| `ip_address` | String(45) nullable | IP |
| `user_agent` | Text nullable | User-Agent |
| `created_at` | DateTime | زمان ثبت |

---

### `WeeklyScheduleVersion` — نسخه برنامه هفتگی (`weekly_schedule_versions`)

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `vendor_id` | FK → vendors.id | مجموعه |
| `effective_from` | Date | تاریخ شروع |
| `effective_until` | Date | تاریخ پایان (۳ ماه بعد) |
| `duration_months` | SmallInteger | مدت (۳ ماه) |
| `created_by_id` | FK → users.id nullable | ایجادکننده |
| `created_at` | DateTime | زمان ایجاد |

### `WeeklyScheduleVersionItem` — آیتم‌های برنامه هفتگی

| فیلد | نوع | توضیح |
|------|------|-------|
| `id` | int PK | شناسه |
| `version_id` | FK → weekly_schedule_versions.id | نسخه |
| `day_of_week` | SmallInteger (0-6) | روز هفته |
| `start_time` | Time | ساعت شروع |
| `end_time` | Time | ساعت پایان |
| `base_price` | Numeric(10,2) | قیمت |
| `gender` | Enum: male/female | جنسیت |

---

## لایه Repositories

هر Repository یک کلاس است که یک مدل ORM را مدیریت می‌کند و عملیات CRUD async را پیاده‌سازی می‌کند:

| فایل | کلاس | توضیح |
|------|------|-------|
| `user_repo.py` | `UserRepository` | کاربران: ایجاد، جستجو با تلفن، لیست، بروزرسانی نقش/فعالیت |
| `vendor_repo.py` | `VendorRepo` | مجموعه‌ها: لیست با فیلتر، ایجاد، بروزرسانی، حذف |
| `time_slot_repo.py` | `TimeSlotRepo` | سانس‌ها: لیست با فیلتر تاریخ، بررسی تداخل، ایجاد گروهی |
| `booking_repo.py` | `BookingRepo` | رزروها: لیست کاربر/مدیر، آمار وضعیت، ایجاد، منقضی شده |
| `payment_repo.py` | `PaymentRepo` | پرداخت‌ها: ایجاد، جستجو با تراکنش، لیست، منقضی |
| `refund_repo.py` | — | بازپرداخت‌ها (در schemas تعریف شده) |
| `penalty_repo.py` | `PenaltyRepo` | جریمه‌ها: ایجاد، لیست کاربر |
| `review_repo.py` | `ReviewRepo` | نظرات: لیست مجموعه/کاربر/اخیر، ایجاد، حذف |
| `notification_repo.py` | `NotificationRepo` | اعلان‌ها: لیست کاربر، ایجاد همگانی، خواندن |
| `favorite_repo.py` | `FavoriteRepo` | علاقه‌مندی‌ها: افزودن/حذف/بررسی |
| `bank_card_repo.py` | `BankCardRepo` | کارت بانکی: upsert، گرفتن تأیید شده |
| `wallet_repo.py` | `WalletRepo` | کیف پول: ایجاد/دریافت، افزایش/کاهش موجودی |
| `refresh_token_repo.py` | `RefreshTokenRepo` | توکن رفرش: ایجاد، ابطال، نشست‌های فعال |
| `replacement_repo.py` | `ReplacementRepo` | جایگزینی: درخواست، هولد |
| `weekly_schedule_repo.py` | `WeeklyScheduleRepo` | برنامه هفتگی: آخرین نسخه، ایجاد |
| `log_repo.py` | `LogRepo` | لاگ‌ها: ایجاد، لیست، حذف |

---

## لایه Services

### `auth_service.py` — سرویس احراز هویت

- **ثبت‌نام:** ایجاد کاربر با رمز عبور، تولید جفت توکن، ذخیره refresh token
- **ورود:** بررسی رمز عبور، تولید جفت توکن
- **رفرش توکن:** چرخش (rotation) با شناسایی replay attack
- **خروج:** ابطال نشست جاری
- **خروج از همه:** ابطال همه نشست‌ها + افزایش `token_version`
- **مدیریت نشست‌ها:** لیست نشست‌های فعال، ابطال یک نشست خاص
- **بروزرسانی پروفایل:** تغییر نام، تلفن، رمز عبور (با تأیید)
- **ابطال ادمین:** ابطال همه نشست‌های یک کاربر توسط ادمین

### `otp_service.py` — سرویس OTP

- **ارسال OTP:** تولید کد ۶ رقمی، ذخیره در Redis (120 ثانیه)، ارسال پیامک
- **تأیید OTP:** بررسی کد در Redis با Lua script (اتمیک)، ایجاد کاربر در صورت جدید بودن
- **محدودیت:** ارسال هر ۱۲۰ ثانیه، ۵ تلاش ناموفق = قفل
- **Lua Script:** مصرف اتمیک کد OTP با شمارش تلاش‌های ناموفق

### `booking_service.py` — سرویس رزرو (بزرگترین فایل، ۲۹۳۱ خط)

- **ایجاد رزرو:** بررسی اعتبار سانس (زمان، وضعیت، نسخه)، بررسی عدم تداخل، ایجاد رزرو با وضعیت `pending_payment`
- **پرداخت رزرو:** شروع پرداخت از طریق درگاه (Zibal) یا پرداخت mock
- **تأیید پرداخت زیبال:** بررسی وضعیت تراکنش، نهایی‌سازی رزرو
- **لغو رزرو:** بررسی قوانین لغو (۴۸ ساعت قبل = بازپرداخت با جریمه، کمتر = جایگزینی)
- **انصراف از لغو:** بازگرداندن رزرو به وضعیت قبلی
- **پیش‌نمایش شرایط لغو:** محاسبه جریمه و مبلغ بازپرداخت قبل از تأیید
- **جایگزینی:** ایجاد هولد، پرداخت هولد، انتقال رزرو
- **پس‌زمینه:** `reconcile_stale_zibal_payments()` — تطبیق تراکنش‌های معطل زیبال

### `vendor_service.py` — سرویس مجموعه‌ها

- **لیست مجموعه‌ها:** با فیلترهای ورزش، تاریخ، قیمت، فاصله، جستجو، مرتب‌سازی
- **جزئیات مجموعه:** با تصاویر و سانس‌ها
- **ایجاد/ویرایش/حذف مجموعه:** با مدیریت تصاویر
- **تغییر وضعیت:** فعال/غیرفعال کردن توسط ادمین

### `time_slot_service.py` — سرویس سانس‌ها

- **لیست سانس‌ها:** بر اساس مجموعه و تاریخ (با محدوده دید عمومی ۲ هفته)
- **ایجاد سانس تکی:** با بررسی تداخل
- **ایجاد گروهی سانس:** از روی الگوی هفتگی
- **بروزرسانی سانس:** قیمت، وضعیت، جنسیت
- **برنامه هفتگی:** دریافت آخرین نسخه، اعمال برنامه هفتگی (حداقل ۱۴ روز بعد)
- **اعمال برنامه هفتگی:** تراکنشی، حذف سانس‌های آینده، ایجاد سانس‌های جدید

### `finance_service.py` — سرویس مالی

- **رزرو دستی مدیر:** ایجاد رزرو برای مشتری حضوری
- **رزرو دوره‌ای:** ایجاد رزروهای تکراری برای یک دوره
- **لغو توسط مدیر:** لغو رزرو توسط مدیر مجموعه + ایجاد بازپرداخت
- **خلاصه مالی:** آمار درآمد، رزروهای موفق، تسویه شده، واجد شرایط تسویه
- **درخواست تسویه:** ایجاد درخواست تسویه برای رزروهای واجد شرایط
- **بروزرسانی وضعیت تسویه:** توسط ادمین (تأیید، رد، پرداخت)

### `payment_service.py` — سرویس پرداخت

- **کلاس‌های خطا:** `PaymentError`, `InsufficientFundsError`, `GatewayTimeoutError`, `FraudDetectionError`
- **پرداخت:** `process_payment()` با شبیه‌سازی درگاه

### `zibal_gateway.py` — درگاه زیبال

- **درخواست پرداخت:** `request_payment()` — دریافت لینک درگاه
- **تأیید پرداخت:** `verify_payment()` — تأیید تراکنش از سمت سرور
- **استعلام:** `inquiry_payment()` — بررسی وضعیت تراکنش

### `sms_provider.py` — ارائه‌دهنده پیامک

- **کلاس پایه:** `SmsProvider` با متدهای `send_otp`, `send_message`, `send_booking_confirmation`
- **MockProvider:** چاپ در کنسول (توسعه)
- **SmsIrProvider:** اتصال به سامانه پیامکی sms.ir

### `review_service.py` — سرویس نظرات

- **ایجاد نظر:** بررسی مالکیت رزرو، عدم وجود نظر تکراری
- **پاسخ مدیر:** پاسخ به نظر برای مجموعه خود
- **حذف نظر:** توسط کاربر مالک یا مدیر مجموعه
- **گزارش:** گزارش نظر نامناسب
- **محاسبه مجدد امتیاز:** `_recalc_vendor_rating()` بعد از هر تغییر

### `favorite_service.py` — سرویس علاقه‌مندی‌ها

- **افزودن/حذف:** افزودن یا حذف مجموعه از علاقه‌مندی‌ها
- **لیست:** دریافت مجموعه‌های مورد علاقه
- **بررسی:** بررسی وضعیت علاقه‌مندی برای چند مجموعه

### `bank_card_service.py` — سرویس کارت بانکی

- **مشاهده کارت:** `lookup_card()` با استعلام از سامانه شاپرک (mock)
- **تأیید کارت:** `confirm_card()` تأیید کارت برای بازپرداخت

### `cache_service.py` — سرویس کش (در core/)

- **کش سانس‌ها:** `cache_slot_list()`, `get_cached_slot_list()`, `invalidate_slot_list()`
- **کش لیست‌های ادمین:** `cache_admin_list()`, `get_cached_admin_list()`, `invalidate_admin_list_cache()`
- **کش پاسخ‌های عمومی:** `cache_response()`, `get_cached_response()`, `invalidate_response_cache()`
- **Jitter:** ±۲۰% به TTL برای جلوگیری از cache stampede
- **SCAN:** به جای KEYS برای حذف گروهی

### `dashboard_service.py` — سرویس داشبورد

- **آمار عمومی:** `get_stats()` — کاربران، مجموعه‌ها، رزروها، درآمد امروز
- **آمار ادمین:** `get_admin_stats()` — آمار جامع با نمودار
- **آمار مدیر:** `get_manager_stats()` — آمار اختصاصی مدیر
- **آمار کاربر:** `get_user_stats()` — رزروهای پیش‌رو/تکمیل شده
- **گزارش درآمد:** `get_revenue_report()` — گزارش درآمد مدیر
- **خلاصه ماهانه:** `get_monthly_recap()` — آمار ماهانه ادمین
- **نمودارها:** `get_admin_charts()` — رشد کاربران، مجموعه‌ها، رزروها، درآمد

### `user_service.py` — سرویس کاربران

- **لیست کاربران (ادمین):** با فیلتر و جستجو
- **جزئیات کاربر:** اطلاعات کامل
- **تغییر نقش:** ارتقا/تغییر نقش کاربر
- **تغییر وضعیت فعال:** فعال/غیرفعال کردن حساب

### `replacement_service.py` — سرویس جایگزینی

- **انقضای کارهای جایگزینی:** `expire_replacement_work()` — ابطال هولدها و درخواست‌های منقضی
- **ابطال درخواست:** `revoke_replacement_request()` — لغو درخواست جایگزینی

### `upload_temp_service.py` — سرویس آپلود موقت

- **ذخیره موقت:** `store_temp_upload()` — ذخیره آدرس فایل در Redis با ownership
- **مصرف:** `consume_temp_uploads()` — تأیید مالکیت و بازگرداندن آدرس
- **پاکسازی:** `cleanup_orphan_temp_uploads()` — حذف فایل‌های یتیم

---

## لایه Schemas

مدل‌های Pydantic برای اعتبارسنجی ورودی و خروجی API:

| فایل | محتوا |
|------|-------|
| `auth.py` | `RegisterRequest`, `LoginRequest`, `LoginOptionsRequest/Response`, `UserResponse`, `TokenResponse`, `SendOtpRequest/Response`, `VerifyOtpRequest`, `UpdateProfileRequest` |
| `booking.py` | `BookingCreate`, `BookingCancelRequest`, `BookingCancellationTermsResponse`, `BookingResponse`, `BookingDetailResponse`, `BookingListResponse`, `AdminBookingListResponse`, `ReplacementHoldResponse` |
| `vendor.py` | `VendorCreate`, `VendorUpdate`, `VendorResponse`, `VendorListResponse`, `VendorImageResponse`, `VendorListItemResponse` |
| `time_slot.py` | `TimeSlotCreate`, `TimeSlotUpdate`, `TimeSlotResponse`, `TimeSlotDetailResponse`, `TimeSlotListResponse`, `TimeSlotGenerate`, `WeeklyScheduleApply`, `WeeklyScheduleTemplateResponse` |
| `payment.py` | `PaymentDetailResponse`, `PaymentListResponse`, `PaymentStartResponse`, `PaymentResolutionResponse`, `PaymentVerificationRequest` |
| `finance.py` | `RefundResponse`, `SettlementResponse`, `SettlementDetailResponse`, `SlotCancellationResponse`, `SettlementSummaryResponse`, `ManagerManualBookingCreate`, `ManagerCancelBookingRequest` |
| `review.py` | `ReviewCreate`, `ReviewResponse`, `ReviewDetailResponse`, `ReviewListResponse`, `ReviewRespondRequest` |
| `user.py` | `UserAdminResponse`, `UserListResponse`, `UserDetailResponse`, `UpdateUserRoleRequest`, `ToggleActiveResponse` |
| `manager.py` | `ManagerBookingResponse`, `ManagerBookingListResponse`, `ManagerSlotResponse`, `ManagerSlotListResponse` |
| `notification.py` | `NotificationResponse`, `NotificationListResponse` |
| `setting.py` | `SettingResponse`, `SettingUpdateRequest` |
| `wallet.py` | `WalletBalanceResponse`, `WalletTransactionResponse`, `WalletDepositRequest`, `WalletWithdrawRequest` |
| `bank_card.py` | `BankCardLookupRequest`, `BankCardResponse` |
| `contact.py` | `ContactCreate`, `ContactResponse` |
| `favorite.py` | `FavoriteResponse`, `FavoriteCheckResponse` |
| `penalty.py` | `PenaltyResponse`, `PenaltyListResponse` |
| `manager_request.py` | `ManagerRequestCreate`, `ManagerRequestResponse`, `ManagerRequestListResponse`, `ManagerRequestStatusUpdate` |
| `session.py` | `SessionResponse`, `SessionListResponse`, `LogoutResponse` |
| `error.py` | `ErrorResponse`, `FieldError` |

---

## لایه API Routes

### `api/deps.py` — وابستگی‌های احراز هویت

| تابع | توضیح |
|------|-------|
| `get_current_user_optional()` | کاربر اختیاری (بررسی توکن اگر موجود باشد) |
| `get_current_user()` | کاربر اجباری (۴۰۱ در صورت عدم توکن) |
| `get_current_manager()` | مدیر یا ادمین (۴۰۳ در غیر این صورت) |
| `get_current_admin()` | فقط ادمین |

### `api/v1/auth.py` — مسیرهای احراز هویت

| متد | مسیر | توضیح |
|-----|------|-------|
| POST | `/auth/otp/send` | ارسال کد OTP (محدودیت: ۳۰/دقیقه) |
| POST | `/auth/otp/verify` | تأیید کد OTP و ورود/ثبت‌نام (محدودیت: ۱۰/دقیقه) |
| POST | `/auth/login/options` | بررسی گزینه‌های ورود (محدودیت: ۱۰/دقیقه) |
| POST | `/auth/register` | ثبت‌نام با رمز عبور (محدودیت: ۳/دقیقه) |
| POST | `/auth/login` | ورود با رمز عبور (محدودیت: ۵/دقیقه) |
| POST | `/auth/refresh` | تمدید access token (محدودیت: ۱۰/دقیقه) |
| GET | `/auth/me` | اطلاعات کاربر جاری |
| PATCH | `/auth/profile` | بروزرسانی پروفایل |
| POST | `/auth/avatar` | آپلود تصویر پروفایل |
| DELETE | `/auth/avatar` | حذف تصویر پروفایل |
| GET | `/auth/sessions` | لیست نشست‌های فعال |
| DELETE | `/auth/sessions/{session_id}` | ابطال یک نشست |
| DELETE | `/auth/sessions` | خروج از همه نشست‌ها |
| POST | `/auth/logout` | خروج از نشست جاری |

### `api/v1/vendors.py` — مسیرهای مجموعه‌ها

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/vendors` | لیست مجموعه‌ها (با فیلترهای متعدد) |
| GET | `/vendors/{vendor_id}/reviews` | نظرات یک مجموعه |
| GET | `/vendors/{vendor_id}` | جزئیات مجموعه |
| POST | `/vendors` | ایجاد مجموعه جدید (مدیر) |
| PATCH | `/vendors/{vendor_id}` | بروزرسانی مجموعه |
| DELETE | `/vendors/{vendor_id}` | حذف مجموعه |
| POST | `/vendors/{vendor_id}/images` | افزودن تصویر |
| DELETE | `/vendors/{vendor_id}/images/{image_id}` | حذف تصویر |
| PUT | `/vendors/{vendor_id}/images/reorder` | مرتب‌سازی تصاویر |

### `api/v1/time_slots.py` — مسیرهای سانس‌ها

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/vendors/{vendor_id}/slots` | لیست سانس‌ها |
| POST | `/vendors/{vendor_id}/slots` | ایجاد سانس |
| POST | `/vendors/{vendor_id}/slots/generate` | تولید گروهی سانس |
| GET | `/vendors/{vendor_id}/slots/weekly-schedule-template` | قالب برنامه هفتگی |
| POST | `/vendors/{vendor_id}/slots/apply-weekly-schedule` | اعمال برنامه هفتگی |
| PATCH | `/vendors/{vendor_id}/slots/{slot_id}` | بروزرسانی سانس |
| GET | `/slots/{slot_id}` | جزئیات سانس |

### `api/v1/bookings.py` — مسیرهای رزرو

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/bookings` | رزروهای من |
| GET | `/bookings/completed` | رزروهای تکمیل شده (قابل نظر) |
| GET | `/bookings/pending-checkout` | چک‌اوت در انتظار پرداخت |
| GET | `/bookings/all` | همه رزروها (ادمین) |
| GET | `/bookings/replacement-holds/{hold_id}` | جزئیات هولد جایگزینی |
| POST | `/bookings/replacement-holds/{hold_id}/pay` | پرداخت هولد جایگزینی |
| DELETE | `/bookings/replacement-holds/{hold_id}` | لغو هولد جایگزینی |
| GET | `/bookings/{booking_id}` | جزئیات رزرو |
| POST | `/bookings` | ایجاد رزرو (محدودیت: ۱۲/دقیقه) |
| POST | `/bookings/{booking_id}/pay` | پرداخت رزرو (محدودیت: ۱۰/دقیقه) |
| POST | `/bookings/{booking_id}/cancel` | لغو رزرو (محدودیت: ۱۰/دقیقه) |
| POST | `/bookings/{booking_id}/withdraw-cancellation` | انصراف از لغو |
| GET | `/bookings/{booking_id}/cancellation-terms` | شرایط لغو |

### `api/v1/payments.py` — مسیرهای پرداخت

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/payments/my` | پرداخت‌های من |
| GET | `/payments/all` | همه پرداخت‌ها (ادمین) |
| POST | `/payments/zibal/verify` | تأیید پرداخت زیبال (محدودیت: ۱۰/دقیقه) |
| GET | `/payments/zibal/callback` | بازگشت از درگاه زیبال (محدودیت: ۳۰۰/دقیقه) |
| GET | `/payments/zibal/inquiry/{track_id}` | استعلام پرداخت زیبال (محدودیت: ۲۰/دقیقه) |

### `api/v1/admin.py` — مسیرهای مدیریت (ادمین)

| متد | مسیر | توضیح |
|-----|------|-------|
| POST | `/admin/notifications/broadcast` | ارسال اعلان همگانی |
| GET | `/admin/logs` | مشاهده لاگ‌ها |
| DELETE | `/admin/logs/clear` | پاکسازی لاگ‌ها |
| DELETE | `/admin/logs/{log_id}` | حذف یک لاگ |
| GET | `/admin/pending-vendors` | مجموعه‌های در انتظار تأیید |
| POST | `/admin/vendors/{vendor_id}/approve` | تأیید مجموعه |
| POST | `/admin/vendors/{vendor_id}/reject` | رد مجموعه |
| DELETE | `/admin/vendors/{vendor_id}` | حذف دائمی مجموعه |
| DELETE | `/admin/users/{user_id}` | حذف کاربر |
| DELETE | `/admin/users/{user_id}/force` | حذف اجباری کاربر با تمام داده‌ها |
| DELETE | `/admin/reviews/{review_id}` | حذف نظر |
| GET | `/admin/settings` | لیست تنظیمات |
| PUT | `/admin/settings/{setting_id}` | بروزرسانی تنظیمات |
| POST | `/admin/settings/seed` | مقداردهی اولیه تنظیمات |
| GET | `/admin/refunds` | لیست بازپرداخت‌ها |
| PATCH | `/admin/refunds/{refund_id}` | بروزرسانی وضعیت بازپرداخت |
| GET | `/admin/refunds/{refund_id}/destination` | مشاهده کارت مقصد بازپرداخت |
| GET | `/admin/manager-cancellations` | لغوهای مدیران |
| GET | `/admin/settlements` | لیست تسویه‌ها |
| PATCH | `/admin/settlements/{settlement_id}` | بروزرسانی وضعیت تسویه |
| GET | `/admin/settlements/{settlement_id}` | جزئیات تسویه |
| GET | `/admin/settlements/{settlement_id}/destination` | مشاهده کارت مقصد تسویه |
| POST | `/admin/hero-images/upload` | آپلود تصویر hero |
| DELETE | `/admin/settings/{setting_id}/hero-images/{index}` | حذف تصویر hero |
| POST | `/admin/seed-admin` | ایجاد اولین ادمین |
| POST | `/admin/users/{user_id}/revoke-sessions` | ابطال نشست‌های کاربر |

### `api/v1/manager.py` — مسیرهای مدیر مجموعه

| متد | مسیر | توضیح |
|-----|------|-------|
| GET | `/manager/bookings` | رزروهای مجموعه‌های من |
| POST | `/manager/bookings/manual` | رزرو دستی |
| POST | `/manager/bookings/recurring` | رزرو دوره‌ای |
| POST | `/manager/bookings/{booking_id}/cancel` | لغو رزرو توسط مدیر |
| GET | `/manager/finance/summary` | خلاصه مالی |
| POST | `/manager/settlements` | درخواست تسویه |
| GET | `/manager/settlements` | لیست تسویه‌های من |
| GET | `/manager/settlements/{settlement_id}` | جزئیات تسویه |
| GET | `/manager/slots` | سانس‌های مجموعه‌های من |

### سایر مسیرها

| فایل | متد | مسیر | توضیح |
|------|-----|------|-------|
| `dashboard.py` | GET | `/dashboard/stats` | آمار عمومی |
| | GET | `/dashboard/manager/revenue` | گزارش درآمد مدیر |
| | GET | `/dashboard/admin-stats` | آمار ادمین |
| | GET | `/dashboard/manager-stats` | آمار مدیر |
| | GET | `/dashboard/admin/monthly-recap` | خلاصه ماهانه ادمین |
| | GET | `/dashboard/admin/charts` | داده‌های نمودار |
| | GET | `/dashboard/user-stats` | آمار کاربر |
| `reviews.py` | GET | `/reviews/recent` | نظرات اخیر |
| | GET | `/reviews/my` | نظرات من |
| | POST | `/reviews` | ایجاد نظر |
| | POST | `/reviews/{review_id}/report` | گزارش نظر |
| | POST | `/reviews/{review_id}/respond` | پاسخ به نظر |
| | DELETE | `/reviews/{review_id}` | حذف نظر |
| `settings.py` | GET | `/settings/public/hero-slides` | تصاویر hero (عمومی) |
| | GET | `/settings/public/contact` | اطلاعات تماس (عمومی) |
| | GET | `/settings/public/text/{key}` | متن قوانین (عمومی) |
| | GET | `/settings/{key}` | دریافت تنظیمات |
| `uploads.py` | POST | `/uploads/vendor-image` | آپلود تصویر مجموعه (محدودیت: ۱۰/دقیقه) |
| | POST | `/uploads/vendors/{vendor_id}/upload-image` | آپلود مستقیم به S3 |
| `wallet.py` | POST | `/wallet/bank-cards/lookup` | استعلام کارت بانکی |
| | GET | `/wallet/bank-cards/verified` | کارت تأیید شده |
| | POST | `/wallet/bank-cards/{card_id}/confirm` | تأیید کارت |
| | GET | `/wallet/balance` | موجودی کیف پول |
| | POST | `/wallet/deposit` | واریز به کیف پول |
| | POST | `/wallet/withdraw` | برداشت از کیف پول |
| | GET | `/wallet/transactions` | تاریخچه تراکنش‌ها |
| `notifications.py` | GET | `/notifications` | لیست اعلان‌ها |
| | GET | `/notifications/unread-count` | تعداد اعلان‌های نخوانده |
| | POST | `/notifications/{notification_id}/read` | علامت‌گذاری به عنوان خوانده شده |
| | POST | `/notifications/read-all` | خواندن همه |
| `penalties.py` | GET | `/penalties` | لیست جریمه‌ها |
| `contact.py` | POST | `/contact` | ارسال پیام تماس (محدودیت: ۵/دقیقه) |
| | GET | `/contact/admin` | لیست پیام‌ها (ادمین) |
| | DELETE | `/contact/admin/{message_id}` | حذف پیام (ادمین) |
| `favorites.py` | GET | `/favorites` | لیست علاقه‌مندی‌ها |
| | GET | `/favorites/check` | بررسی وضعیت علاقه‌مندی |
| | POST | `/favorites/{vendor_id}` | افزودن به علاقه‌مندی‌ها |
| | DELETE | `/favorites/{vendor_id}` | حذف از علاقه‌مندی‌ها |
| `refunds.py` | GET | `/refunds/my` | بازپرداخت‌های من |
| `users.py` | GET | `/users` | لیست کاربران (ادمین) |
| | GET | `/users/{user_id}` | جزئیات کاربر (ادمین) |
| | PATCH | `/users/{user_id}/role` | تغییر نقش (ادمین) |
| | PATCH | `/users/{user_id}/toggle-active` | فعال/غیرفعال کردن (ادمین) |
| `manager_requests.py` | POST | `/api/v1/manager-requests` | ثبت درخواست مدیریت |
| | GET | `/api/v1/manager-requests/my` | درخواست من |
| | GET | `/api/v1/admin/manager-requests` | لیست درخواست‌ها (ادمین) |
| | PATCH | `/api/v1/admin/manager-requests/{request_id}` | بروزرسانی وضعیت درخواست (ادمین) |

---

## Migrations

فایل‌های مهاجرت در `migrations/versions/` با نام‌های `0001_*.py` تا `0037_*.py` به ترتیب قرار دارند.

**مهاجرت‌های مهم:**

| شماره | توضیح |
|-------|-------|
| 0001 | ایجاد تمام جداول اولیه |
| 0016 | تغییر نام `courts` به `vendors` |
| 0017 | ساختار مالی، بازپرداخت، مدیریت، رزرو |
| 0024 | درخواست‌های جایگزینی و هولد |
| 0025 | یکتایی مالی و درخواست‌ها |
| 0031 | سخت‌گیری چک‌اوت رزرو |
| 0037 | پاکسازی تراکنش‌های معطل |

---

## Scripts

| فایل | توضیح |
|------|-------|
| `seed.py` | پر کردن دیتابیس با داده‌های آزمایشی |
| `run_migrations.py` | اجرای مهاجرت‌های Alembic |
| `check_revisions.py` | بررسی سازگاری نسخه‌های مهاجرت |
| `generate-placeholder-court-images.py` | تولید تصاویر پیش‌فرض برای مجموعه‌ها |

---

## Background Tasks (پس‌زمینه)

در `main.py`، چهار task پس‌زمینه در `lifespan` اجرا می‌شوند:

1. **`_refresh_metrics_periodically()`** — هر ۱۲۰ ثانیه آمار business را به‌روز می‌کند
2. **`_cancel_expired_pending()`** — هر ۶۰ ثانیه رزروهای منقضی شده (پرداخت نشده) را لغو می‌کند
3. **`_reconcile_zibal_payments_periodically()`** — هر ۶۰ ثانیه تراکنش‌های معطل زیبال را تطبیق می‌دهد
4. **`_expire_replacement_work_periodically()`** — هر ۶۰ ثانیه هولدها و درخواست‌های جایگزینی منقضی را آزاد می‌کند

---

## Middleware (میان‌افزارها)

ترتیب middlewareها در `main.py`:

1. **CORSMiddleware** — مدیریت CORS
2. **CorrelationIdMiddleware** — افزودن شناسه درخواست
3. **ProfilerMiddleware** — پروفایلر (فعال در صورت تنظیم)
4. **SecurityHeadersMiddleware** — هدرهای امنیتی
5. **PrometheusMiddleware** — Metrics
6. **SlowAPIMiddleware** — محدودکننده نرخ

---

## نکات معماری کلیدی

1. **Repository Pattern:** سرویس‌ها هرگز مستقیماً با session کار نمی‌کنند، از repositoryها استفاده می‌کنند.
2. **Optimistic Locking:** سانس‌ها دارای فیلد `version` هستند (برای تشخیص تغییرات هم‌زمان).
3. **Refresh Token Rotation:** هر بار که refresh token استفاده می‌شود، توکن قدیمی باطل و توکن جدید صادر می‌شود. استفاده مجدد از توکن قدیمی به عنوان replay attack شناسایی می‌شود.
4. **OTP Flow:** کد OTP در Redis ذخیره می‌شود و مصرف آن با Lua script اتمیک انجام می‌شود.
5. **Caching:** کش کردن در Redis برای سانس‌ها (TTL=30s)، لیست‌های ادمین (TTL=60s) و پاسخ‌های داشبورد.
6. **Two Auth Flows:** هم احراز هویت با رمز عبور و هم با OTP پشتیبانی می‌شود.
7. **Persian Digits:** همه اعداد نمایش داده شده به کاربر با ارقام فارسی هستند.
8. **Time Zone:** همه زمان‌ها در دیتابیس UTC ذخیره می‌شوند و در API به ایران تبدیل می‌شوند.
9. **Card Security:** شماره کارت با Fernet (رمزنگاری متقارن) رمزنگاری می‌شود و فقط ادمین می‌تواند آن را مشاهده کند.
10. **Soft Delete:** وجود ندارد — حذف‌ها دائمی هستند با بررسی وابستگی‌ها.