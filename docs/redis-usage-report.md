# گزارش بررسی استفاده از Redis در پروژه ToopSet

> تاریخ: ۲۰۲۶-۰۸-۲۱
> هدف: شناسایی تمام نقاط استفاده از Redis، بررسی دلیل استفاده و ارزیابی ضرورت آن‌ها.

## خلاصه مدیریتی

در پروژه، Redis در **۸ حوزه** به کار رفته است. از این میان:

- **۲ مورد واقعاً ضروری و سخت‌جایگزین:** ذخیره OTP و نگهداری موقت آپلودها (هر دو workload موقّت با TTL — دقیقاً همان کاری که Redis در آن بهترین است).
- **۱ مورد قابل توجیه با جایگزین:** Rate Limiting (قبلاً fallback درون‌حافظه‌ای دارد).
- **۳ مورد صرفاً بهینه‌سازی (قابل حذف):** کش‌کردن داده‌ها.
- **۲ مورد کد مرده/زائد:** پروفایلر (تابع تعریف‌شده ولی هیچ‌گاه فراخوانی‌نشده) و دو Gauge از Metricها (تعریف‌شده ولی هیچ‌گاه مقداردهی‌نشده).

---

## جدول خلاصه

| # | بخش | فایل‌های کلیدی | هدف | خط تقریبی | ضروری؟ | جایگزین |
|---|-----|---------------|-----|-----------|--------|---------|
| 1 | OTP / احراز هویت | `otp_service.py`، `api/v1/auth.py`، `tests/test_otp.py` | کد یک‌بارمصرف + فاصله ارسال + قفل ضد brute-force + مصرف اتمیک | ~۹۰ | **بله — حفظ شود** | سخت (لازمه‌ی قفل تراکنشی) |
| 2 | آپلود موقت | `upload_temp_service.py`، `api/v1/uploads.py`، `api/v1/vendors.py` | رجیستری آپلود در انتظار با مالکیت + انقضای TTL + GC | ~۸۰ | **بله — حفظ شود** | جدول Postgres + cron |
| 3 | Rate Limiting | `core/rate_limiter.py` + ۵ فایل روت | محدودسازی توزیع‌شده بر اساس IP | ~۲۵ | قابل توجیه | nginx/traefik یا Postgres |
| 4 | کش‌کردن | `core/cache_service.py` + ~۱۰ مصرف‌کننده | کش لیست اسلات‌ها، لیست‌های ادمین، داشبورد | ~۱۵۰ | **خیر — بهینه‌سازی** | حذف؛ درخواست مستقیم از DB |
| 5 | Health Check | `core/health.py` | پینگ لایوینس | ~۱۵ | همراه Redis حذف می‌شود | — |
| 6 | Telemetry | `core/telemetry.py` | ردیابی OTel روی redis-py | ~۷ | **خیر** | حذف |
| 7 | Metrics | `core/metrics.py` | هیستوگرام عملیات/کش (+۲ Gauge مرده) | ~۳۵ | **عمدتاً قابل حذف** | حذف |
| 8 | Profiler | `core/profiler.py` | زمان‌بندی Redis (هیچ‌گاه صدا زده نمی‌شود) | ~۱۵ | **کد مرده** | حذف |

---

## ۱. OTP / احراز هویت (بحرانی‌ترین استفاده)

**فایل‌ها:** `backend/app/services/otp_service.py`، `backend/app/api/v1/auth.py`، `backend/tests/test_otp.py`

**کاربردها:**

| سطر | کارکرد |
|-----|--------|
| ۲۵–۳۵ | ثابت‌ها: `OTP_TTL=120`، `OTP_SEND_COOLDOWN=120`، `OTP_FAIL_LIMIT=5` |
| ۳۷–۵۸ | اسکریپت **Lua اتمیک** برای مصرف OTP (بررسی قفل شکست، مقایسه کد، افزایش شمارنده شکست، حذف کلیدها) |
| ۸۸–۹۷ | استفاده مجدد از کد قبلی در صورت معتبر بودن (کاهش ارسال‌های بی‌دلیل) |
| ۱۰۱–۱۰۷ | فاصله‌گذاری ۱۲۰ ثانیه‌ای بین ارسال به یک شماره (۴۲۹ در صورت ارسال زودهنگام) |
| ۱۱۰–۱۱۸ | ذخیره کد ۶ رقمی با TTL و ست کردن فاصله ارسال |
| ۱۴۳–۱۵۶ | اجرای اسکریپت Lua؛ خروجی‌ها: `-2` قفل / `0` منقضی / `-1` اشتباه / `2` نیاز به نام / `1` موفق |

**تحلیل — ضروری ✅:**
این قوی‌ترین و موجه‌ترین کاربرد Redis در پروژه است. اسکریپت Lua اتمیک دقیقاً برای جلوگیری از *بازپخش همزمان (replay)* OTP نوشته شده است. جایگزینی با PostgreSQL به پیچیدگی قابل توجهی نیاز دارد (قفل advisory یا تراکنش). حافظه درون‌پردازه‌ای هم در محیط چند-worker کار نمی‌کند.

---

## ۲. آپلود موقت (مرحله‌بندی چندمرحله‌ای)

**فایل‌ها:** `backend/app/services/upload_temp_service.py`، `backend/app/api/v1/uploads.py`، `backend/app/api/v1/vendors.py`

**کاربردها:**

| سطر | کارکرد |
|-----|--------|
| ۱۱–۱۳ | ثابت‌ها: `TEMP_UPLOAD_TTL_SECONDS=3600`، `GRACE=3600`، `GC_SET="temp_upload_gc"` |
| ۲۹–۳۴ | `setex` (TTL ۲ ساعته) + افزودن به sorted set برای GC |
| ۴۱–۷۴ | بررسی مالکیت/اعتبار (`get`)، مصرف در هنگام ساخت/ویرایش وندور (`delete` + `zrem`) |
| ۷۹–۹۷ | پاک‌سازی آپلودهای یتیم (`zrangebyscore` بر اساس انقضا، سپس `get`/`delete`) |

**تحلیل — ضروری ✅:**
الگوی TTL + sorted set برای جمع‌آوری زباله، یک الگوی اصیل و مفید Redis است. جایگزینی با Postgres + cron ممکن است، ولی Redis انقضا را رایگان فراهم می‌کند.

---

## ۳. Rate Limiting

**فایل:** `backend/app/core/rate_limiter.py`

| سطر | کارکرد |
|-----|--------|
| ۱–۶ | docstring: «Rate limiter پشتیبان‌شده با Redis… در صورت نبود به حافظه درون‌پردازه‌ای تنزل می‌کند» |
| ۲۵–۳۷ | پروب TCP هنگام بارگذاری ماژول برای تصمیم‌گیری fallback |
| ۴۱–۴۸ | اگر Redis در دسترس نبود → `memory://` + هشدار |
| ۵۰–۵۴ | نمونه slowapi با استراتژی fixed-window |

**مصرف‌کننده‌ها:** `auth.py` (۶ مورد)، `bookings.py` (۴ مورد)، `contact.py`، `payments.py` (۳ مورد)، `uploads.py` (۲ مورد)، `main.py`، `conftest.py`

**تحلیل — قابل توجیه ⚠️:**
شمارنده توزیع‌شده به یک storage مشترک نیاز دارد و Redis انتخاب استاندارد است. اما این بخش از قبل fallback درون‌حافظه‌ای دارد و در حالت تک‌پردازه‌ای یا قطعی Redis همچنان کار می‌کند. جایگزین: rate limiter در لایه reverse proxy (nginx/traefik) یا شمارنده Postgres (کندتر و پرمصرف‌تر).

---

## ۴. کش‌کردن (بزرگ‌ترین سطح کد)

**فایل:** `backend/app/services/cache_service.py` — TTLها: `TIME_SLOTS_TTL=30`، `ADMIN_LIST_TTL=60`، `RESPONSE_CACHE_TTL=60`؛ جitter ±۲۰٪ برای جلوگیری از cache stampede؛ حذف الگویی با `scan_iter` (نه KEYS).

**مصرف‌کننده‌ها:**

| فایل | کاربرد |
|------|--------|
| `services/time_slot_service.py` | کش لیست اسلات‌های عمومی (TTL ۳۰ ثانیه) + Invalidate پس از ساخت/ویرایش + هدر `X-Cache` |
| `services/booking_service.py` | Invalidate لیست اسلات‌ها پس از هر تغییر رزرو |
| `services/replacement_service.py` | Invalidate لیست اسلات‌ها |
| `services/vendor_service.py` | Invalidate پس از تغییر قیمت توپ |
| `api/v1/admin.py` | کش لیست‌های ادمین (اعلان‌ها/لاگ‌ها) |
| `api/v1/bookings.py` | کش لیست رزروهای ادمین |
| `api/v1/contact.py` | کش پیام‌های تماس |
| `api/v1/dashboard.py` | کش آمار/درآمد/ادمین (۶۰ ثانیه) |
| `api/v1/notifications.py` | کش لیست اعلان‌ها |
| `api/v1/payments.py` | کش لیست پرداخت‌ها |
| `api/v1/users.py` | کش لیست کاربران |
| `api/v1/vendors.py` | کش لیست وندورها |

**تحلیل — قابل حذف ⚠️ (بهینه‌سازی خالص):**
تمام عملیات خواندن داخل `RedisError` پوشیده شده و در صورت خطا به DB برمی‌گردند — یعنی رفتار اشتباه‌پذیر نیست. این کش‌ها فقط بار DB را کاهش می‌دهند. اگر هدف کاهش زیرساخت باشد، `cache_service.py` به راحتی حذف می‌شود و صدا زدن مصرف‌کننده‌ها نیاز به تغییر چندانی ندارد.

---

## ۵. Health Check

**فایل:** `backend/app/core/health.py` (سطرهای ۴۳–۵۶)

`_probe_redis()` با `r.ping()` و اندازه‌گیری تأخیر، کامپوننت `redis` را به پاسخ `/health` اضافه می‌کند. تست: `tests/test_health.py:37` وجود `redis` در `components` را بررسی می‌کند.

**تحلیل — ضروری به‌شرط وجود Redis:** یک health probe استاندارد است. اگر Redis حذف شود، این کامپوننت نیز باید از لیست حذف شود.

---

## ۶. Telemetry (OpenTelemetry)

**فایل:** `backend/app/core/telemetry.py` (سطرهای ۱۲۷–۱۳۳)

`RedisInstrumentor().instrument()` (فعال به‌وسیله `otel_redis_enabled`). ردیابی توزیع‌شده تماس‌های Redis.

**تحلیل — قابل حذف:** فقط تا وقتی معنا دارد که Redis وجود داشته باشد. حذف فقط چند خط کد است.

---

## ۷. Metrics (Prometheus)

**فایل:** `backend/app/core/metrics.py`

| سطر | متریک | وضعیت |
|-----|-------|-------|
| ۱۰۱–۱۰۵ | `toopset_redis_op_count` | فعال — مقداردهی می‌شود |
| ۱۰۷–۱۱۱ | `toopset_redis_op_duration_ms` | فعال — مقداردهی می‌شود |
| ۱۱۵–۱۱۸ | `toopset_cache_hits_total` / `toopset_cache_misses_total` | فعال — توسط `cache_service` تغذیه می‌شود |
| ۱۲۵–۱۲۸ | `toopset_cache_evictions_total` | **مرده** — تعریف‌شده ولی هیچ‌گاه مقداردهی نشده |
| ۱۳۰–۱۳۳ | `toopset_cache_memory_bytes` | **مرده** — تعریف‌شده ولی هیچ‌گاه `set()` نشده |

**تحلیل — عمدتاً قابل حذف:** دو متریک مرده‌اند و در صورت حذف Redis تمام این متریک‌ها حذف می‌شوند.

---

## ۸. Profiler

**فایل:** `backend/app/core/profiler.py` (سطرهای ۴۹–۵۴، ۷۹–۸۰، ۱۰۸–۱۱۷)

تابع `record_redis_operation(duration_ms)` تعریف شده است اما **در هیچ‌جای کدبیس فراخوانی نمی‌شود** (تأیید شد). در مقابل، `record_db_query()` به درستی در `core/database.py:51` وصل است. نتیجه: پروفایلر همیشه `redis_ops: 0` را ثبت می‌کند.

**تحلیل — کد مرده:** این plumbing زمان‌بندی Redis زائد است و باید حذف شود.

---

## زیرساخت و پیکربندی

| فایل | نقش |
|------|-----|
| `compose.yml` (سطرهای ۲۴–۴۰) | سرویس `redis:7-alpine` با volume پایدار + healthcheck |
| `Makefile` (سطرهای ۱۲۳–۱۷۲) | `db-start`/`db-stop`/reset شامل Redis |
| `backend/requirements.txt` / `pyproject.toml` | وابستگی `redis>=5.0.0` |
| `.env.example` (ریشه) و `backend/.env.example` | متغیرهای `REDIS_*` / `REDIS_URL` |
| `.github/workflows/backend-ci.yml` (سطر ۱۳۰–۱۳۵) | سرویس Redis در CI (چون تست OTP به Redis زنده نیاز دارد) |
| `lefthook.yml` | یادداشت نیاز به Postgres+Redis برای تست |
| `backend/app/core/redis_client.py` | singleton اتصال + pool (ستون فقرات تمام مصرف‌کننده‌ها) |
| `backend/app/core/config.py` | تنظیمات Redis (سطرهای ۲۸–۳۴، ۱۵۱–۱۵۸، ۲۱۴–۲۱۶) |
| `backend/app/main.py` (سطر ۲۷۲) | بستن pool هنگام shutdown |

---

## نتیجه‌گیری و پیشنهادها

### اگر هدف «کاهش زیرساخت» باشد:
1. **نگه‌داشتن الزامی:** OTP + آپلود موقت — هر دو ephemeral-TTL workload هستند که Redis در آن‌ها بهترین است. با حذف این‌ها، PostgreSQL بار سنگین قفل تراکنشی/کمپکشی را می‌کشد.
2. **کاهش ریسک اضافی:** Rate limiter از قبل fallback درون‌حافظه دارد؛ می‌تواند بماند یا به لایه proxy منتقل شود.
3. **حذف آسان:** لایه کش (`cache_service.py` + مصرف‌کننده‌ها)، telemetry، متریک‌های Redis و profiler — همگی fallback یا کد مرده دارند و بدون تغییر رفتار حذف می‌شوند.
4. **پاک‌سازی کد مرده:** `record_redis_operation` در profiler و دو Gauge مرده در `metrics.py` باید حذف شوند حتی اگر Redis حفظ شود.

### اگر هدف «باقی ماندن Redis» باشد:
- فقط دو اصلاح لازم است: حذف کد مرده profiler و مقداردهی متریک‌های معلق (یا حذف تعریفشان).

### بار کلی Redis:
حداکثر ۲ تا ۳ GB بکاپ / چند ده کیلوبایت کلید — بار بسیار سبکی است و Postgres 17 فعلی به‌راحتی این workload را بدون Redis نیز تاب می‌آورد. انتخاب Redis عملاً یک انتخاب «راحتی و قابلیت» است، نه یک ضرورت معماری.
