# بخش ۲ — بررسی عمیق بک‌اند

## معماری

### ساختار پوشه‌ها

```
backend/
├── app/
│   ├── __init__.py          # __version__ = "0.4.0"
│   ├── main.py              # فکتوری FastAPI، لایف‌سایکل، میدلورها، روترها
│   ├── api/
│   │   ├── deps.py          # تزریق وابستگی (احراز هویت، نشست DB)
│   │   ├── openapi_docs.py  # بهبود اسکیمای OpenAPI
│   │   └── v1/              # تمام هندلرهای مسیر (یک فایل به ازای هر دامنه)
│   ├── core/                # زیرساخت سطح-متقاطع
│   │   ├── config.py        # تنظیمات Pydantic + اعتبارسنجی env
│   │   ├── database.py      # موتور SQLAlchemy، فکتوری نشست، زمان‌سنجی کوئری
│   │   ├── security.py      # ساخت/رمزگشایی JWT، هش رمز عبور، چرخش کلید
│   │   ├── rate_limiter.py  # محدودکننده SlowAPI (Redis یا بازگشت به حافظه)
│   │   ├── redis_client.py  # پول اتصال ناهمزمان Redis
│   │   ├── exceptions.py    # هندلرهای استثنای سراسری + میدلور هدرهای امنیتی
│   │   ├── pagination.py    # کمک‌کننده‌های صفحه‌بندی مبتنی بر cursor
│   │   ├── correlation_id.py # میدلور X-Request-ID + ContextVar
│   │   ├── profiler.py      # زمان‌سنجی DB/Redis به‌ازای هر درخواست
│   │   ├── metrics.py       # شمارنده/سنج/هیستوگرام Prometheus + میدلور
│   │   ├── health.py        # منطق endpoint سلامت (بررسی DB + Redis)
│   │   ├── upload.py        # اعتبارسنجی آپلود فایل (بایت‌های جادویی، اندازه)
│   │   ├── phone.py         # نرمال‌سازی + اعتبارسنجی شماره تلفن ایرانی
│   │   ├── timezone.py      # کمک‌کننده‌های تبدیل UTC ↔ ایران
│   │   └── date_utils.py    # پارس تاریخ شمسی برای فیلترها
│   ├── models/              # مدل‌های ORM SQLAlchemy (۲۰ مدل)
│   ├── repositories/        # لایه دسترسی داده (یک ریپو به ازای هر aggregate)
│   ├── schemas/             # مدل‌های درخواست/پاسخ Pydantic
│   └── services/            # لایه منطق کسب‌وکار
├── migrations/              # اسکریپت‌های مایگریشن Alembic (۲۲ مایگریشن)
├── tests/                   # مجموعه تست pytest-asyncio (۲۵ فایل تست)
├── scripts/                 # ابزارهای مدیریتی (seed، create_admin و غیره)
└── Dockerfile               # بیلد تولید چند مرحله‌ای
```

### جداسازی لایه‌ها

بک‌اند از معماری **۳ لایه‌ای** دقیق پیروی می‌کند:

```
┌─────────────────────────────────────┐
│  لایه API (app/api/v1/*.py)         │  ← مسائل HTTP، پارس درخواست، احراز هویت
├─────────────────────────────────────┤
│  لایه سرویس (app/services/*.py)    │  ← قوانین کسب‌وکار، هماهنگی
├─────────────────────────────────────┤
│  لایه ریپازیتوری (app/repositories/*.py) │ ← دسترسی داده، کوئری‌ها
├─────────────────────────────────────┤
│  لایه مدل (app/models/*.py)        │  ← موجودیت‌های ORM، روابط
└─────────────────────────────────────┘
```

- **لایه API:** دریافت درخواست‌های HTTP، اعتبارسنجی ورودی با اسکیماهای Pydantic، تفویض به سرویس‌ها، سریالایز پاسخ
- **لایه سرویس:** شامل تمام منطق کسب‌وکار (قوانین رزرو، سطوح لغو، پردازش پرداخت). چندین ریپازیتوری را ترکیب می‌کند
- **لایه ریپازیتوری:** پوشش نازک دسترسی‌داده روی کوئری‌های SQLAlchemy. فیلترینگ، صفحه‌بندی، استراتژی‌های eager-loading
- **لایه مدل:** مدل‌های declarative خالص SQLAlchemy. تعریف جداول، ستون‌ها، روابط، قیود

### تزریق وابستگی

سیستم `Depends()` FastAPI استفاده می‌شود برای:

1. **نشست دیتابیس** — `get_db()` یک `AsyncSession` yield می‌کند، در موفقیت auto-commit، در خطا rollback
2. **کاربر فعلی** — `get_current_user()` JWT را از هدر `Authorization: Bearer` استخراج می‌کند
3. **محافظ‌های نقش** — `get_current_manager()` و `get_current_admin()` روی `get_current_user` compose می‌شوند

### لایف‌سایکل راه‌اندازی

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ۱. راه‌اندازی لاگینگ ساختارمند
    setup_logging()

    # ۲. اعتبارسنجی محیط (در تولید سخت fail می‌کند، در dev هشدار)
    validate_env(settings)

    # ۳. اختیاری: OpenTelemetry
    if settings.otel_enabled:
        setup_opentelemetry()

    # ۴. اختیاری: ردیابی خطای Sentry
    if settings.sentry_dsn:
        sentry_sdk.init(...)

    # ۵. شروع وظایف پس‌زمینه
    metrics_task = ...   # هر ۱۲۰ ثانیه
    cancel_task = ...    # هر ۶۰ ثانیه

    yield  # اپلیکیشن درخواست‌ها را سرو می‌کند

    # خاموشی
    await close_redis()
    await engine.dispose()
```

### پشته میدلور (ترتیب)

میدلورها در **ترتیب معکوس ثبت** برای درخواست‌ها اجرا می‌شوند:

```python
app.add_middleware(CORSMiddleware, ...)          # ۱ — ثبت اول، آخرین پوشش درخواست
app.add_middleware(CorrelationIdMiddleware)       # ۲ — تخصیص X-Request-ID
app.add_middleware(ProfilerMiddleware)            # ۳ — زمان‌سنجی DB/Redis هر درخواست
app.add_middleware(SecurityHeadersMiddleware)     # ۴ — افزودن هدرهای امنیتی به پاسخ
app.add_middleware(PrometheusMiddleware)          # ۵ — ثبت تعداد/تأخیر درخواست
app.add_middleware(SlowAPIMiddleware)             # ۶ — ثبت آخر، اولین پوشش — محدودکننده نرخ
```

---

## چرخه حیات درخواست

### ردیابی: `POST /api/v1/bookings` (ایجاد رزرو)

```
درخواست HTTP
  │
  ▼
SlowAPIMiddleware ─── بررسی محدودیت نرخ (Redis/حافظه)
  │
  ▼
PrometheusMiddleware ─── شروع تایمر، افزایش سنج in_progress
  │
  ▼
SecurityHeadersMiddleware ─── (فاز پاسخ: افزودن هدرهای امنیتی)
  │
  ▼
ProfilerMiddleware ─── مقداردهی اولیه ContextVar پروفایلر
  │
  ▼
CorrelationIdMiddleware ─── خواندن/تولید X-Request-ID
  │
  ▼
CORSMiddleware ─── مدیریت preflight، افزودن هدرهای CORS
  │
  ▼
روتر FastAPI ─── تطبیق POST /api/v1/bookings
  │
  ▼
وابستگی: HTTPBearer ─── استخراج توکن از هدر Authorization
  │
  ▼
وابستگی: get_current_user()
  ├── decode_token(credentials, expected_type="access")
  │   ├── تلاش با کلید فعلی (kid="v1")، سپس کلید قبلی (kid="v0")
  │   ├── اعتبارسنجی iss، aud، exp (با clock_skew)
  │   └── برگرداندن dict payload یا None
  ├── استخراج user_id از payload["sub"]
  ├── UserRepository.get_by_id(user_id)
  ├── بررسی user.is_active
  ├── بررسی payload["ver"] == user.token_version
  └── برگرداندن شیء User ORM
  │
  ▼
وابستگی: get_db() ─── yield نشست AsyncSession از pool
  │
  ▼
هندلر مسیر (bookings.py)
  │
  ▼
اعتبارسنجی Pydantic ─── اسکیمای BookingCreate بدنه درخواست را اعتبارسنجی می‌کند
  │
  ▼
BookingService.create_booking(data)
  ├── TimeSlotRepo.get_by_id(slot_id, for_update=True)  ← SELECT FOR UPDATE
  ├── اعتبارسنجی: مجموعه فعال، سانس بسته نباشد، در گذشته نباشد،
  │   در بازه ۱۴ روزه، موجودی توپ، ظرفیت، تطبیق version
  ├── BookingRepo.get_active_by_slot() ← بررسی رزرو فعال موجود
  ├── محاسبه قیمت (slot_price + ball_price)
  ├── BookingRepo.create({...status=PENDING_PAYMENT, expires_at=now+10min})
  ├── TimeSlotRepo.update(slot, {status=RESERVING, is_reserved=True})
  ├── NotificationRepo.create() ← اطلاع به مدیر
  └── log_action() ← لاگ ممیزی
  │
  ▼
سریالایز پاسخ ─── BookingDetailResponse (مدل Pydantic)
  │
  ▼
پاسخ HTTP (201 Created)
```

---

## احراز هویت

### پیاده‌سازی JWT

**الگوریتم:** HS256 (متقارن)
**کتابخانه:** `python-jose`
**انواع توکن:** `access`، `refresh`، `password_reset`

#### ادعاهای Access Token

```json
{
  "sub": "42",           // شناسه کاربر به‌صورت رشته
  "role": "user",        // user/manager/admin
  "ver": 3,             // token_version برای ابطال
  "iat": 1719000000,    // زمان صدور
  "exp": 1719001800,    // انقضا (پیش‌فرض ۳۰ دقیقه)
  "jti": "abc123...",   // شناسه منحصربه‌فرد توکن
  "iss": "toopset-api", // صادرکننده
  "aud": "toopset-client", // مخاطب
  "type": "access"      // تمایز نوع توکن
}
```

#### ادعاهای اضافی Refresh Token

```json
{
  "sid": "session-uuid",  // شناسه نشست برای ابطال هر دستگاه
  // ... تمام ادعاهای استاندارد با type="refresh"، انقضای ۷ روزه
}
```

#### چرخش کلید

- کلید امضای فعلی: `settings.secret_key` (kid="v1")
- کلید قبلی: `settings.secret_key_previous` (kid="v0")
- `decode_token()` هر دو کلید را به‌ترتیب امتحان می‌کند — امکان چرخش بدون وقفه
- تمام توکن‌های جدید با کلید فعلی + هدر `kid` امضا می‌شوند

#### نسخه توکن (تک دستگاه)

- `User.token_version` در: ورود، تغییر رمز عبور، خروج اجباری ادمین — افزایش می‌یابد
- توکن‌های access مقدار `ver` را در زمان صدور embed می‌کنند
- در هر درخواست: `token["ver"] == user.token_version` بررسی می‌شود
- عدم تطابق ← ۴۰۱ "نشست شما به پایان رسید — از دستگاه دیگری وارد شده‌اید"

#### چرخش Refresh Token

1. کلاینت refresh token را به `POST /api/v1/auth/refresh` ارسال می‌کند
2. سرور توکن را هش می‌کند (SHA-256)، در جدول `refresh_tokens` جستجو می‌کند
3. اگر پیدا نشد یا قبلاً باطل شده:
   - اگر باطل شده ← **حمله replay شناسایی شده** ← تمام زنجیره نشست باطل می‌شود
   - خطای ۴۰۱
4. اگر معتبر: توکن قدیمی باطل، جفت جدید صادر، هش refresh token جدید ذخیره
5. فیلد `replaced_by` توکن قدیمی به هش جدید اشاره می‌کند (ردیابی زنجیره)

---

## منطق کسب‌وکار

### سرویس رزرو (`services/booking_service.py`)

پیچیده‌ترین سرویس. عملیات‌های کلیدی:

#### ایجاد رزرو
- اعتبارسنجی موجودی سانس (قفل FOR UPDATE)
- بررسی قفل خوش‌بینانه از طریق `slot.version == data.version`
- پشتیبانی از "رزرو جایگزین" — اگر سانس در `PENDING_CANCELLATION` باشد
- تنظیم مهلت پرداخت ۱۰ دقیقه‌ای (`expires_at`)
- انتقال وضعیت سانس: `OPEN` → `RESERVING`

#### پرداخت رزرو
- بررسی اینکه رزرو هنوز در `PENDING_PAYMENT` و منقضی نشده
- فراخوانی `PaymentService.process_payment()` (درگاه شبیه‌سازی)
- در موفقیت: ثبت پرداخت، انتقال رزرو به `CONFIRMED`، سانس به `RESERVED`
- در جایگزینی: محاسبه ۱۰٪ جریمه روی رزرو قدیمی

#### لغو رزرو (سیاست پلکانی)

| زمان تا شروع سانس | اقدام |
|---|---|
| سانس شروع شده | **مسدود** — لغو ممکن نیست |
| پرداخت نشده (pending) | لغو فوری، بدون جریمه، آزادسازی سانس |
| ≤ ۴۸ ساعت | رزرو ← `PENDING_CANCELLATION`، سانس ← `PENDING_CANCELLATION` (در انتظار جایگزین) |
| > ۴۸ ساعت | لغو فوری، **۱۰٪ جریمه**، ۹۰٪ بازگشت به کیف پول |

### سرویس پرداخت (`services/payment_service.py`)

شبیه‌ساز درگاه **mock**:
- نرخ موفقیت قابل تنظیم (پیش‌فرض ۷۵٪)
- شبیه‌سازی تأخیر شبکه (۰.۳ تا ۱.۲ ثانیه)
- توزیع شکست: ۵۰٪ رد عمومی، ۲۵٪ timeout، ۱۵٪ موجودی ناکافی، ۱۰٪ تقلب

### سرویس OTP (`services/otp_service.py`)

- کد ۶ رقمی تصادفی رمزنگاری‌شده با `secrets.randbelow`
- ذخیره در Redis با TTL ۹۰ ثانیه
- محدودیت ارسال هر شماره: ۹۰ ثانیه بین ارسال‌ها
- قفل تلاش ناموفق: ۵ شکست به ازای هر کد فعال ← قفل تا درخواست کد جدید

### سرویس مالی (`services/finance_service.py`)

- **رزرو مدیری:** رزرو حضوری/دستی بدون پرداخت
- **رزروهای تکرارشونده:** ایجاد انبوه رزرو در بازه تاریخ
- **رکوردهای بازپرداخت:** عکس‌های مالی تغییرناپذیر
- **لغو سانس:** مدیر سانس را لغو می‌کند، جریان بازپرداخت برای مشتری فعال می‌شود

### سرویس کش (`services/cache_service.py`)

| نوع کش | الگوی کلید | TTL | هدف |
|---|---|---|---|
| لیست سانس | `slots:{vendor_id}:{date}` | ۳۰ ثانیه ± ۲۰٪ | موجودی سانس (تغییر سریع) |
| لیست ادمین | `admin_list:{prefix}:{md5}` | ۶۰ ثانیه ± ۲۰٪ | کوئری‌های داشبورد ادمین |
| پاسخ عمومی | `resp:{prefix}:{md5}` | ۶۰ ثانیه ± ۲۰٪ | پاسخ‌های کش‌شده عمومی |

تمام عملیات کش در `try/except RedisError` پیچیده شده — در صورت خرابی Redis به DB بازمی‌گردد.

---

## محدودکننده نرخ

| endpoint | محدودیت |
|---|---|
| `POST /api/v1/auth/register` | ۳ در دقیقه |
| `POST /api/v1/auth/login` | ۵ در دقیقه |
| `POST /api/v1/auth/refresh` | ۱۰ در دقیقه |
| ارسال OTP | ۱ به ازای هر ۹۰ ثانیه هر شماره |
| شکست‌های تأیید OTP | ۵ تلاش به ازای هر کد فعال |

---

## صفحه‌بندی

**مبتنی بر cursor** با استفاده از شناسه‌های base64-encoded:

```python
# کدگذاری: base64(str(last_item.id))
cursor = encode_cursor(items[-1].id)  # مثلاً "NDI=" برای id=42

# رمزگشایی: base64_decode → string → int
after_id = int(decode_cursor(cursor))  # 42

# کوئری: WHERE id > :cursor ORDER BY id LIMIT :limit+1
```

---

## مدیریت خطا

### فرمت پاسخ خطا

```json
{
  "detail": "پیام خطای فارسی",
  "error_code": "validation_error",
  "timestamp": "2026-07-04T12:00:00Z",
  "path": "/api/v1/bookings",
  "request_id": "abc123...",
  "fields": [
    {"field": "phone", "message": "شماره تلفن: این فیلد اجباری است"}
  ]
}
```

تمام پیام‌های اعتبارسنجی به فارسی ترجمه می‌شوند.

---

## امنیت آپلود فایل (`core/upload.py`)

1. **اعتبارسنجی پسوند:** فقط `.jpg`، `.jpeg`، `.png`، `.webp` مجاز
2. **شناسایی بایت جادویی:** خواندن ۴ تا ۱۲ بایت اول برای تأیید MIME
3. **محدودیت اندازه:** حداکثر ۵ مگابایت
4. **ذخیره:** فایل‌ها با نام UUID در `uploads/{subdir}/`
5. **حذف:** `delete_upload()` فایل‌ها را با مدیریت مسیر نسبی/مطلق حذف می‌کند

---

## هدرهای امنیتی

هر پاسخ شامل:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'none'; ...`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()`
- `Cache-Control: no-store, max-age=0` (روی مسیرهای auth/admin)

---

## مشاهده‌پذیری

### متریک‌های Prometheus

| متریک | نوع | هدف |
|---|---|---|
| `http_requests_total` | Counter | تعداد درخواست |
| `http_request_duration_seconds` | Histogram | تأخیر |
| `toopset_cache_hits_total` | Counter | برخوردهای کش Redis |
| `toopset_db_users_total` | Gauge | تعداد کاربران ثبت‌شده |
| `toopset_active_vendors_total` | Gauge | مجموعه‌های فعال |
| `toopset_today_bookings_total` | Gauge | رزروهای امروز |
| `toopset_today_revenue_toman` | Gauge | درآمد امروز |
| `toopset_bookings_by_status` | Gauge | تعداد به‌ازای هر وضعیت |
| `toopset_otp_lockouts_total` | Counter | رویدادهای قفل OTP |

---

## تست

### ساختار

- **۲۵ فایل تست** پوشش‌دهنده تمام endpointهای API + منطق کسب‌وکار
- **تست‌های ناهمزمان** با `pytest-asyncio` + `httpx.AsyncClient`
- **جداسازی تراکنشی:** هر تست در یک تراکنش DB اجرا می‌شود که بعداً rollback می‌شود

### فیکسچرهای کلیدی (`conftest.py`)

| فیکسچر | هدف |
|---|---|
| `setup_database` | ساخت جداول قبل از تست‌ها، حذف بعد |
| `session` | نشست `AsyncSession` تراکنشی، rollback بعد از هر تست |
| `client` | `httpx.AsyncClient` با override دیتابیس |
| `user_token` | ثبت‌نام کاربر، بازگرداندن `{access_token, user}` |
| `manager_token` | ثبت‌نام + ارتقا به مدیر |
| `admin_token` | ثبت‌نام + ارتقا به ادمین |
