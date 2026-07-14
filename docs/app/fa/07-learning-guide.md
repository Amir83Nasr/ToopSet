# بخش ۶ — راهنمای یادگیری

مسیر پیشنهادی برای یک توسعه‌دهنده جدید تا در این کدبیس مولد شود.

---

## قدم ۱: درک دامنه

**مطالعه:**

- `README.md` (نمای کلی پروژه، فهرست ویژگی‌ها، جدول استک)
- `docs/app/01-overview.md` (این مستندات)

**مفاهیم:** رزرو زمین ورزشی در ایران، رابط فارسی-اول، دسترسی مبتنی بر نقش (user/manager/admin)، چرخه حیات رزرو-پرداخت-لغو.

**چرا اول:** نمی‌توانید درباره کد استدلال کنید بدون اینکه بفهمید سیستم چه کاری انجام می‌دهد و به چه کسی خدمت می‌کند. دامنه ساده است اما تفاوت‌های ظریف مختص ایران دارد (سانس‌های تفکیک جنسیتی، تقویم شمسی، واحد پول تومان، فرمت موبایل ایرانی).

---

## قدم ۲: اجرای محلی پروژه

**فایل‌ها:**

- `compose.yml` (PostgreSQL + Redis)
- `.env.example` → بخش backend را به `backend/.env` و بخش frontend را به `frontend/.env.local` کپی کنید
- `Makefile` (اهداف: `make dev`، `make migrate`، `make seed`)

**مراحل:**

```bash
docker compose up -d              # راه‌اندازی PostgreSQL + Redis
cd backend && pip install -r requirements.txt
alembic upgrade head              # اجرای مایگریشن‌ها
python scripts/seed.py            # دادة نمونه
uvicorn app.main:app --reload     # شروع بک‌اند روی :8000
cd ../frontend && pnpm install && pnpm dev  # شروع فرانت‌اند روی :3000
```

**چرا دوم:** اجرای سیستم به شما اجازه می‌دهد endpointهای API را از طریق Swagger (`/docs`) ببینید، فرانت‌اند را مشاهده کنید و قبل از خواندن کد، نحوه اتصال قطعات را درک کنید.

---

## قدم ۳: درک لایه‌بندی بک‌اند

**مطالعه (به ترتیب):**
۱. `backend/app/main.py` — نحوه شروع اپلیکیشن، پشته میدلور، ثبت روترها
۲. `backend/app/api/deps.py` — تزریق وابستگی (احراز هویت، نشست DB)
۳. `backend/app/core/config.py` — تمام تنظیمات پیکربندی
۴. `backend/app/core/database.py` — موتور، فکتوری نشست، زمان‌سنجی کوئری

**مفاهیم:** چرخه حیات اپ FastAPI، ترتیب میدلور، مدیریت نشست ناهمزمان، پیکربندی مبتنی بر محیط.

**چرا سوم:** این ۴ فایل ستون فقرات هستند. هر درخواست از میدلورهای main.py عبور می‌کند، از تزریق deps.py استفاده می‌کند، تنظیمات config.py را می‌خواند و از طریق database.py به DB دسترسی پیدا می‌کند.

---

## قدم ۴: ردیابی یک درخواست کامل

**جریان ایجاد رزرو را از ابتدا تا انتها دنبال کنید:**

۱. `backend/app/api/v1/bookings.py` — هندلر مسیر
۲. `backend/app/schemas/booking.py` — اعتبارسنجی درخواست/پاسخ
۳. `backend/app/services/booking_service.py` — متد `create_booking()`
۴. `backend/app/repositories/booking_repo.py` — دسترسی به داده
۵. `backend/app/models/booking.py` + `time_slot.py` — مدل‌های ORM

**مفاهیم:** معماری ۳ لایه در عمل، اعتبارسنجی Pydantic، کوئری‌های ناهمزمان SQLAlchemy، قفل خوش‌بینانه، قفل ردیف FOR UPDATE.

**چرا چهارم:** ردیابی یک جریان کامل، معماری را با مثال به شما آموزش می‌دهد. ایجاد رزرو پیچیده‌ترین عملیات تکی است و تمام لایه‌ها را لمس می‌کند.

---

## قدم ۵: درک احراز هویت

**مطالعه:**
۱. `backend/app/core/security.py` — ایجاد/رمزگشایی JWT، چرخش کلید، هش رمز عبور
۲. `backend/app/services/auth_service.py` — ورود، ثبت‌نام، چرخش refresh، مدیریت نشست
۳. `backend/app/services/otp_service.py` — جریان OTP بدون رمز عبور
۴. `backend/app/models/refresh_token.py` — ذخیره توکن refresh

**مفاهیم:** ادعاهای JWT (sub، ver، sid، type)، امضای HS256، چرخش کلید (هدرهای kid)، نسخه‌بندی توکن برای ابطال، چرخش توکن refresh با تشخیص replay، هش bcrypt.

**چرا پنجم:** احراز هویت در هر endpoint محافظت شده نفوذ می‌کند. درک token_version، چرخش refresh و سیستم احراز هویت ۴ سطحی (public/optional/user/manager/admin) قبل از کار روی هر ویژگی ضروری است.

---

## قدم ۶: مطالعه اسکیما دیتابیس

**مطالعه:**

- `docs/app/03-database.md` (این مستندات)
- `backend/app/models/__init__.py` (ثبت مدل‌ها)
- مرور هر فایل مدل به مدت ۲ دقیقه، تمرکز روی روابط و محدودیت‌ها

**مفاهیم:** تمام ۲۰ مدل، روابط آنها، ۱۱ enum، ایندکس partial unique، فیلد version قفل خوش‌بینانه.

**چرا ششم:** وقتی یک جریان درخواست و احراز هویت را فهمیدید، اسکیما دانش ضروری بعدی است. هر سرویس/ریپازیتوری به درک روابط مدل وابسته است.

---

## قدم ۷: درک قوانین کسب‌وکار

**مطالعه:**

- `backend/app/services/booking_service.py` — کل فایل، تمرکز روی `cancel_booking()`
- `backend/app/services/finance_service.py` — عملیات مدیر، ایجاد بازگشت وجه
- `backend/app/services/payment_service.py` — درگاه ساختگی (فایل کوتاه)
- `backend/docs/booking-cancellation-flow-fa.md` — مستندات فارسی قوانین لغو

**مفاهیم:** سطوح لغو (>۴۸ ساعت = ۱۰٪ جریمه، ≤۴۸ ساعت = انتظار جایگزین)، رزروهای جایگزین، چرخه حیات تسویه، بازگشت وجه کیف پول، رزروهای حضوری مدیر.

**چرا هفتم:** جریان رزرو-لغو-بازگشت وجه پیچیده‌ترین منطق کسب‌وکار است. رزروها، سانس‌ها، جریمه‌ها، بازگشت وجه، کیف پول و اعلان‌ها را به هم متصل می‌کند.

---

## قدم ۸: کاوش فرانت‌اند

**مطالعه:**

- `frontend/lib/api.ts` — نحوه ارتباط فرانت‌اند با بک‌اند
- `frontend/hooks/use-auth.ts` — مدیریت state احراز هویت
- `frontend/app/vendors/[id]/page.tsx` — یک صفحه پیچیده با تقویم سانس + رزرو
- `frontend/components/ui/` — مرور primitives shadcn موجود

**مفاهیم:** ذخیره توکن در کوکی، تازه‌سازی خودکار در ۴۰۱، تبدیل ارقام فارسی، مدیریت تاریخ شمسی، ملاحظات چیدمان RTL.

**چرا هشتم:** تا اینجا بک‌اند را فهمیده‌اید. فرانت‌اند از نظر معماری ساده‌تر است — درک کلاینت API و هوک احراز هویت به شما امکان پیمایش هر صفحه را می‌دهد.

---

## قدم ۹: اجرا و درک تست‌ها

**مطالعه:**

- `backend/tests/conftest.py` — زیرساخت تست و fixtureها
- `backend/tests/test_bookings.py` — الگوهای تست یکپارچه‌سازی
- `backend/tests/test_auth.py` — تست جریان احراز هویت
- `backend/tests/test_security.py` — موارد لبه امنیتی

**اجرا:**

```bash
cd backend && pytest -x -q    # اجرای تمام تست‌های بک‌اند
cd frontend && npx vitest run # اجرای تمام تست‌های فرانت‌اند
```

**مفاهیم:** ایزولاسیون تست تراکنشی، helperهای fixture احراز هویت، نحوه نوشتن یک تست جدید.

**چرا نهم:** درک الگوهای تست به شما امکان می‌دهد تغییرات خود را تأیید کنید و برای ویژگی‌های جدید تست بنویسید.

---

## قدم ۱۰: مرور زیرساخت

**مطالعه:**

- `Makefile` — تمام دستورات توسعه موجود
- `lefthook.yml` — هوک‌های کیفیت کد (pre-commit/pre-push)
- `backend/Dockerfile` — بیلد تولید
- `backend/app/core/metrics.py` — ابزار دقیق Prometheus
- `backend/app/core/profiler.py` — پروفایلر درخواست

**مفاهیم:** گردش کار توسعه (lefthook، make lint، make test، make check)، بیلد چند مرحله‌ای Docker، تنظیمات مانیتورینگ.

**چرا آخر:** دانش زیرساخت برای توسعه ویژگی ضروری نیست، اما برای استقرار و اشکال‌زدایی مسائل تولید حیاتی است.

---

## مرجع سریع: "کجاست...؟"

| می‌خواهم...                                   | نگاه کن به...                                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| یک endpoint API جدید اضافه کنم          | `backend/app/api/v1/` (ایجاد فایل مسیر، ثبت در main.py)            |
| یک مدل DB جدید اضافه کنم             | `backend/app/models/` سپس `alembic revision --autogenerate`                      |
| منطق کسب‌وکار اضافه کنم           | `backend/app/services/` (ایجاد یا گسترش سرویس)                       |
| یک کوئری اضافه کنم                     | `backend/app/repositories/` (ایجاد یا گسترش ریپازیتوری)         |
| یک صفحه فرانت‌اند اضافه کنم    | `frontend/app/` (مسیردهی مبتنی بر فایل Next.js)                     |
| یک کامپوننت UI اضافه کنم            | `frontend/components/` (استفاده از primitives shadcn/ui)                     |
| رفتار احراز هویت را تغییر دهم | `backend/app/core/security.py` + `backend/app/services/auth_service.py`             |
| مایگریشن اضافه کنم                    | `cd backend && alembic revision --autogenerate -m "description"`                      |
| تست اجرا کنم                                | `make test` (بک‌اند) یا `cd frontend && npx vitest run`                     |
| قالب‌بندی را بررسی کنم             | `make precommit`                                                                      |
| تمام endpointهای API را ببینم           | اجرای بک‌اند → مراجعه به`http://localhost:8000/docs`              |
| یک ویژگی را درک کنم                    | با فایل سرویس شروع کن، سپس به ریپازیتوری و API برو |
