# مستند جامع فرایند رزرو و لغو — از سوی کاربر و مجموعه (Vendor)

> این سند فرایند کامل رزرو و لغو سانس را در ToopSet توضیح می‌دهد: معماری کد، جدول‌های دیتابیس و فیلدهای آن‌ها، ماشین‌های وضعیت، مرور بخش‌به‌بخش کد بک‌اند، فرایندهای سمت کاربر و سمت مدیر مجموعه، جاب‌های پس‌زمینه، مسیر فرانت‌اند و در پایان سناریوهای عملی با مثال.
>
> همه شماره خطوط بر اساس کد موجود در زمان نگارش است و ممکن است با تغییرات بعدی جابه‌جا شوند.

---

## فهرست

1. [معماری و فایل‌های درگیر](#1-معماری-و-فایلهای-درگیر)
2. [جدول‌های دیتابیس و فیلدها](#2-جدولهای-دیتابیس-و-فیلدها)
3. [ماشین‌های وضعیت](#3-ماشینهای-وضعیت)
4. [قواعد کسب‌وکار کلیدی](#4-قواعد-کسبوکار-کلیدی)
5. [فرایند رزرو از سوی کاربر — مرور کد](#5-فرایند-رزرو-از-سوی-کاربر--مرور-کد)
6. [فرایند پرداخت (درگاه زیبال)](#6-فرایند-پرداخت-درگاه-زیبال)
7. [انقضا و تعمیر خودکار](#7-انقضا-و-تعمیر-خودکار)
8. [فرایند لغو از سوی کاربر — مرور کد](#8-فرایند-لغو-از-سوی-کاربر--مرور-کد)
9. [فرایند جایگزینی (فروش مجدد سانس)](#9-فرایند-جایگزینی-فروش-مجدد-سانس)
10. [فرایند رزرو از سوی مجموعه (مدیر)](#10-فرایند-رزرو-از-سوی-مجموعه-مدیر)
11. [فرایند لغو از سوی مجموعه (مدیر)](#11-فرایند-لغو-از-سوی-مجموعه-مدیر)
12. [جاب‌های پس‌زمینه](#12-جابهای-پسزمینه)
13. [نقشه فرانت‌اند](#13-نقشه-فرانتاند)
14. [جدول انتقال‌های وضعیت (Transition Table)](#14-جدول-انتقالهای-وضعیت-transition-table)
15. [سناریوهای عملی و مثال‌ها](#15-سناریوهای-عملی-و-مثالها)
16. [اصول طراحی سیستم](#16-اصول-طراحی-سیستم)

---

## 1. معماری و فایل‌های درگیر

معموری لایه‌ای است: **Router → Service → Repository → Model**. سرویس مالک تراکنش است (`commit`/`rollback` را سرویس مدیریت می‌کند) و Repository فقط `flush` می‌کند.

### 1.1 سمت کاربر (online booking)

| لایه | فایل | نقش |
|---|---|---|
| Router | `backend/app/api/v1/bookings.py` | ۱۳ endpoint؛ اعتبارسنجی، rate-limit، ساخت سرویس، باطل‌کردن کش ادمین |
| Service | `backend/app/services/booking_service.py` | قلب منطق (~۳۰۷۰ خط): ساخت رزرو، پرداخت، لغو، جایگزینی، reconciliation |
| Repos | `repositories/booking_repo.py`، `payment_repo.py`، `replacement_repo.py`، `penalty_repo.py`، `bank_card_repo.py`، `review_repo.py` | کوئری‌های SQLAlchemy AsyncSession |
| Schemas | `backend/app/schemas/booking.py` | قرارداد ورودی/خروجی API |
| Models | `models/booking.py`، `time_slot.py`، `payment.py`، `refund.py`، `penalty.py`، `replacement.py`، `bank_card.py` | ORM و قیدهای سطح دیتابیس |

### 1.2 سمت مجموعه (manager / vendor)

| لایه | فایل | نقش |
|---|---|---|
| Router | `backend/app/api/v1/manager.py` | رزرو دستی، رزرو تکراری (بلندمدت)، لغو، مالی و تسویه |
| Service | `backend/app/services/finance_service.py` | `create_manager_booking` (خط ۱۵۳)، `create_recurring_manager_bookings` (خط ۱۹۸)، `cancel_booking_by_manager` (خط ۲۸۴)، `create_refund` (خط ۹۳) |
| Service | `backend/app/services/replacement_service.py` | `revoke_replacement_request` (خط ۱۰۹) — بستن پرونده جایگزینی هنگام لغو توسط مدیر |
| Model | `models/slot_cancellation.py` | سند «لغو توسط مدیر» با ردیابی SMS/نوتیفیکیشن |

### 1.3 سرویس‌های همکار

| سرویس | نقش در فرایند رزرو |
|---|---|
| `zibal_gateway.py` | `request_payment` / `verify_payment` / `inquiry_payment` — تنها مرجع حقیقت وضعیت پول |
| `payment_service.py` | درگاه mock برای محیط توسعه |
| `notification_service.py` | نوتیفیکیشن درون‌برنامه‌ای به کاربر و مدیر مجموعه |
| `sms_provider.py` | SMS تأیید رزرو و اطلاع لغو |
| `cache_service.py` | باطل‌کردن کش لیست سانس‌ها/داشبورد ادمین بعد از هر ترنزیشن |
| `bank_card_service.py` | ثبت/تأیید کارت بانکی (مقصد عودت) |
| `eitaa_service.py` | همگام‌سازی digest ایتا بعد از پرداخت موفق |

---

## 2. جدول‌های دیتابیس و فیلدها

### 2.1 نقشه ارتباط جدول‌ها

```
users ──┬──────────────< bookings >─────────────┬── time_slots >── vendors
        │                  │                     │        │
        │                  │ replaces_booking_id │        └──< slot_cancellations
        │                  └─── (self-FK) ───────┘
        │                  ├──< payments
        │                  ├──< refunds
        │                  ├──< penalties
        │                  ├──< reviews
        │                  └──< replacement_requests ──< booking_holds
        ├──< bank_cards (۱ به ۱)
        └──< logs (audit) / notifications / notification_deliveries
```

### 2.2 جدول `bookings` — قلب سیستم

تعریف: `backend/app/models/booking.py:39`

| فیلد | نوع | کاربرد |
|---|---|---|
| `id` | PK int | شماره رزرو؛ به کاربر نمایش داده می‌شود و در لاگ‌ها ارجاع می‌شود |
| `user_id` | FK→users `CASCADE` | مالک رزرو. در رزرو دستی، کاربرِ «موجود یا ایجادشده از روی شماره موبایل» است |
| `slot_id` | FK→time_slots `CASCADE` | سانس رزرو‌شده. CASCADE یعنی با حذف فیزیکی سانس (مثلاً جایگزینی برنامه هفتگی) رزروها هم حذف می‌شوند |
| `replaces_booking_id` | FK→bookings `SET NULL` | زنجیره جایگزینی: اگر این رزرو «جایگزین رزروِ لغوشده کاربر دیگری» است به رزرو قبلی اشاره می‌کند. رفتارِ آزادسازی سانس در انقضا/لغو به این فیلد وابسته است: سانس به `open` برگردد یا به `pending_cancellation` |
| `status` | enum `BookingStatus` | وضعیت رزرو (بخش ۳.۱) |
| `source` | enum `BookingSource` | `online` (کاربر از اپ) یا `manager_manual` (مدیر مجموعه به‌صورت حضوری). رزروهای دستی از پرداخت و تسویه آنلاین مستثنی هستند |
| `settlement_status` | enum `SettlementStatus` | چرخه تسویه با مجموعه. هفت وضعیت: `not_settled`، `settlement_requested`، `included_in_settlement`، `settled`، `excluded_due_to_refund`، `excluded_due_to_cancellation`، `excluded_manual_booking`. وقتی رزرو لغو/منتقل می‌شود، این فیلد تعیین می‌کند پول فروشنده از تسویه خارج شود |
| `created_by_manager_id` | FK→users `SET NULL` | برای رزرو `manager_manual`، کدام مدیر آن را ثبت کرد |
| `customer_full_name` | str(128), nullable | نام مشتری حضوری (رزرو دستی) |
| `customer_phone` | str(16), nullable, index | شماره مشتری حضوری؛ ایندکس دارد چون مدیر با شماره جستجو می‌کند |
| `price_paid` | Numeric(10,2) | **مبلغ نهایی قفل‌شده در لحظه رزرو** = `slot_price + ball_price`. مبنای همه محاسبات جریمه/عودت، حتی اگر قیمت سانس بعداً تغییر کند |
| `slot_price` | Numeric(10,2), nullable | اسنپ‌شات قیمت پایه سانس در لحظه رزرو (گزارش تفکیکی) |
| `ball_price` | Numeric(10,2), default 0 | قیمت توپ |
| `with_ball` | bool, default false | کاربر توپ خواست یا نه |
| `penalty_amount` | Numeric(10,2), nullable | جریمه ۱۰٪؛ در لغو قطعی و `transferred` پر می‌شود، در `pending_cancellation` صریحاً `None` است (هنوز قطعی نیست) |
| `created_at` / `updated_at` | timestamptz | `updated_at` با `onupdate` به‌روز می‌شود |
| `expires_at` | timestamptz, nullable | **مهلت ۱۰ دقیقه‌ای پرداخت** — فقط برای `pending_payment` معنا دارد؛ بعد از تأیید `None` می‌شود |

**ایندکس‌های قیددار** (`models/booking.py:42-65`):

| ایندکس | تضمین |
|---|---|
| `uq_bookings_one_active_per_slot` | یکتای شرطی روی `slot_id` در سه وضعیت زنده (`pending_payment/confirmed/pending_cancellation`) — **دو کاربر نمی‌توانند همزمان یک سانس بگیرند، حتی با باگ در کد، دیتابیس جلویش را می‌گیرد** |
| `uq_bookings_one_pending_payment_per_user` | هر کاربر فقط یک checkout زنده — پایه منطق «یک رزرو در انتظار پرداخت» |
| `ix_bookings_pending_expires_at` | ایندکس شرطی روی `expires_at` فقط برای ردیف‌های `pending_payment` — سویپر انقضا سریع است |
| `ix_bookings_user_id_status`، `ix_bookings_status_created_at`، `ix_bookings_created_at` | فیلترها و صفحه‌بندی لیست‌ها |

**رفتار محاسبه‌شده** — `is_completed_at(at)` (`models/booking.py:119`): «تکمیل‌شده» یعنی `confirmed` **و** `slot.end_time <= at`. «تکمیل» وضعیت ذخیره‌شده نیست و از زمان مشتق می‌شود تا جاب جدا و همگام‌سازی لازم نباشد.

### 2.3 جدول `time_slots` — سانس‌ها

تعریف: `backend/app/models/time_slot.py:40`

| فیلد | نوع | کاربرد |
|---|---|---|
| `id` | PK | شناسه سانس |
| `vendor_id` | FK→vendors `CASCADE` | مجموعه صاحب سانس |
| `start_time` / `end_time` | timestamptz | بازه سانس (UTC). مرجع همه تصمیم‌های زمانی: مرز ۴۸ ساعت لغو، پنجره ۱۴ روز رزرو، ممنوعیت لغو پس از شروع، ددلاین جایگزینی |
| `base_price` | Numeric(10,2) | قیمت پایه سانس |
| `gender` | enum `male/female` | سانس زنانه/مردانه |
| `status` | enum `SlotStatus` | وضعیت سانس (بخش ۳.۲) |
| `is_reserved` | bool | فلگ سریع فیلتر «آزاد/رزرو». در عمل همگام با `status` حرکت می‌کند؛ جدا نگه داشته شده چون ایندکس‌های شرطی «سانس‌های آزاد هر مجموعه» روی آن سوارند |
| `version` | int, default 1 | **قفل خوش‌بینانه (optimistic locking)**: کلاینت هنگام رزرو `version` را می‌فرستد؛ اگر مدیر در فاصله بین نمایش و تأیید، سانس را ویرایش/بسته باشد → `slot.version != data.version` → 409 «صفحه را به‌روز کنید» |

قیدها و ایندکس‌های خاص:

- `uq_time_slots_vendor_start_end`: یک مجموعه نمی‌تواند دو سانس هم‌زمان داشته باشد.
- `ix_time_slots_open_vendor_price` و `ix_time_slots_open_vendor_start_price` (ایندکس شرطی فقط روی `is_reserved = false AND status = 'open'`): کوئری اصلی صفحه فروش فقط ردیف‌های آزاد را اسکن می‌کند.
- `passive_deletes=True` روی relationship `bookings` (خط ۸۳): چون FK سطح دیتابیس `NOT NULL + CASCADE` است، بدون این فلگ ORM موقع حذف سانس اول `slot_id` رزروها را NULL می‌کند و با `NotNullViolation` کرش می‌کند.

`ball_available` و `ball_price` در جدول نیستند — property هستند که از vendor می‌خوانند؛ پیکربندی توپ سمت مجموعه است.

### 2.4 جدول `payments` — تراکنش‌های درگاه

تعریف: `backend/app/models/payment.py:22`. هر **تلاش پرداخت** یک ردیف است (نه هر رزرو) — پس یک رزرو می‌تواند چند ردیف داشته باشد: یک `failed` و بعد یک `success`.

| فیلد | نوع | کاربرد |
|---|---|---|
| `id` | PK | شناسه تلاش پرداخت |
| `booking_id` | FK→bookings `CASCADE` | رزرو مربوطه |
| `amount` | Numeric(10,2) | مبلغ ارسالی به درگاه — در verify با `paid_amount` درگاه مقایسه می‌شود |
| `gateway_transaction_id` | str(256), nullable | `trackId` زیبال. **اینتای شرطی**: هر track فقط یک‌بار قابل ثبت است (ضد double-spend) |
| `gateway_name` | str(64) | `zibal` یا نام درگاه mock |
| `card_number` | str(32), nullable | کارت پرداخت‌کننده — در پاسخ API همیشه ماسک می‌شود (`PaymentResponse` در `schemas/booking.py:88`) |
| `ref_id` | str(64) | کد پیگیری نمایشی به کاربر |
| `gateway_fee` | Numeric(10,2) | کارمزد درگاه (حسابداری) |
| `idempotency_key` | str(64), یکتای شرطی | مثل `booking:{id}:{token}` — درخواست تکراری همان کلید، پرداخت جدید نمی‌سازد |
| `processing_token` | str(64), nullable | **قلب الگوی پرداخت امن**: UUID که قبل از تماس با درگاه تولید و commit می‌شود؛ بعد از برگشت، ردیف فقط اگر هنوز همان token را داشته باشد به‌روزرسانی می‌شود. یعنی هیچ مسیر همزمان/تکراری نمی‌تواند روی تراکنش دیگری بنویسد |
| `failure_code` | str(64), nullable | کد خطای ماشین‌خوان — فهرست کامل در بخش ۶.۵ |
| `status` | enum `pending/success/failed/expired` | وضعیت تلاش |
| `paid_at` | timestamptz, nullable | زمان قطعی شدن پرداخت |
| `created_at` | timestamptz | زمان ایجاد تلاش |

ایندکس شرطی `ix_payments_zibal_pending_created_at`: فقط تراکنش‌های `pending` زیبالِ دارای track را ایندکس می‌کند — دقیقاً هدف جاب reconciliation هر دقیقه.

### 2.5 جدول `replacement_requests` — پرونده فروش مجدد

تعریف: `backend/app/models/replacement.py:42`. وقتی کاربرِ تأییدشده با «۴۸ ساعت یا کمتر مانده» لغو می‌کند، سانس او برای فروش به دیگری می‌رود؛ این جدول آن فرایند را مدیریت می‌کند.

| فیلد | نوع | کاربرد |
|---|---|---|
| `id` | PK | شناسه درخواست |
| `original_booking_id` | FK→bookings `CASCADE` | رزرو صاحب قبلی سانس |
| `replacement_booking_id` | FK→bookings `SET NULL`، یکتا | وقتی خریدار پیدا شد، رزرو جدید او (رابطه یک‌به‌یک) |
| `slot_id` | FK→time_slots `CASCADE` | سانسِ در معرض فروش |
| `status` | enum `ReplacementRequestStatus` | `open` → `held` → `completed` / `expired` / `revoked` (بخش ۳.۴) |
| `penalty_amount` | Numeric(10,2), `CHECK >= 0` | جریمه ۱۰٪ **فریزشده در لحظه درخواست** |
| `refund_amount` | Numeric(10,2), `CHECK >= 0` | مبلغ عودت ۹۰٪ فریزشده |
| `deadline` | timestamptz, index | مهلت پیدا شدن خریدار = `slot.start_time` |
| `created_at` / `updated_at` / `completed_at` | timestamptz | زمان‌ها |

قید یکتای شرطی `uq_replacement_requests_one_live_per_original`: روی هر رزرو فقط یک درخواست **زنده** (`open/held`)؛ ردیف‌های ترمینال به‌عنوان تاریخچه می‌مانند تا چرخه «لغو → انصراف → لغو مجدد» بتواند درخواست تازه باز کند.

### 2.6 جدول `booking_holds` — قفل موقت خریدار جایگزین

تعریف: `backend/app/models/replacement.py:93`. «رزروِ موقتِ بدون رکورد booking» — متقاضی جایگزین تا وقتی پرداخت نکرده رزرو واقعی نمی‌سازد.

| فیلد | نوع | کاربرد |
|---|---|---|
| `id` | PK | شناسه هولد |
| `replacement_request_id` | FK→replacement_requests `CASCADE` | پرونده مربوطه |
| `replacement_booking_id` | FK→bookings `SET NULL`، یکتا | بعد از پرداخت موفق، رزرو نهایی خریدار |
| `slot_id` | FK→time_slots `CASCADE` | سانس قفل‌شده |
| `user_id` | FK→users `CASCADE` | متقاضی |
| `status` | enum `BookingHoldStatus` | `active` → `processing` → `paid` / `expired` / `failed` / `cancelled` |
| `price_paid` / `slot_price` / `ball_price` / `with_ball` | Numeric/bool، `CHECK price_paid > 0` | همان ساختار مبلغی bookings |
| `expires_at` | timestamptz, index | مهلت هولد = `min(now + 10 دقیقه, deadline)` |
| `processing_token` + `processing_started_at` | str/datetime | الگوی توکن پرداخت امن؛ وضعیت `PROCESSING` + ایندکس یکتای زنده، بقیه خریداران را در فاصله تماس با درگاه بیرون نگه می‌دارد |
| `gateway_transaction_id` (یکتا)، `gateway_name`، `card_number`، `ref_id`، `gateway_fee`، `paid_at` | — | اطلاعات درگاه — هولد ردیف payment جداگانه ندارد و بعد از موفقیت، payment روی رزرو نهایی ساخته می‌شود |
| `failure_code` | str(64) | علت شکست: `hold_expired`، `cancelled_by_user`، `zibal_payment_failed`، `paid_but_transfer_conflicted`، `original_booking_cancelled` و… |
| `created_at` / `updated_at` | timestamptz | — |

قید یکتای شرطی `uq_booking_holds_one_live_per_slot` (`active/processing`): فقط یک متقاضی زنده per سانس.

### 2.7 جدول `refunds` — اسناد عودت وجه

تعریف: `backend/app/models/refund.py:38`.

| فیلد | نوع | کاربرد |
|---|---|---|
| `booking_id` + `type` | یکتای ترکیبی `uq_refunds_booking_type` | از هر رزرو حداکثر یک عودت از هر نوع. انواع: `user_cancellation` / `manager_cancellation` / `replaced_after_pending_cancellation` |
| `user_id` / `vendor_id` / `slot_id` | FK | لینک‌های مستقیم برای گزارش مالی هر طرف |
| `slot_start_time` / `slot_end_time` | timestamptz | **اسنپ‌شات** زمان سانس — سانس ممکن است حذف شود؛ سند عودت باید بدون JOIN هم خوانا باشد |
| `original_amount` / `slot_price` / `ball_price` / `total_paid` | Numeric | تفکیک اسنپ‌شات مبلغ |
| `penalty_amount` / `refund_amount` | Numeric | جریمه و مبلغ قابل پرداخت |
| `reason` | Text | علت (متن برای ادمین) |
| `status` | enum | چرخه ادمین‌محور: `pending` → `approved` → `paid` (یا `rejected`). سایت خودش پول برنمی‌گرداند؛ ادمین واریز دستی می‌کند |
| `penalty_charged_to_user` | bool, default true | جریمه از جیب کاربر بود؟ |
| `site_bears_penalty` | bool, default false | سایت جریمه را تقبل کرد؟ (در لغو توسط مدیر `true` است) |
| `requested_at` / `approved_at` / `paid_at` | timestamptz | تایم‌لاین فرایند |
| `admin_note` / `payment_tracking_code` | Text/str | یادداشت ادمین و کد رهگیری واریز |
| `destination_card_encrypted` / `destination_card_masked` / `destination_card_holder_name` | str, nullable | **اسنپ‌شات غیرقابل‌تغییر مقصد واریز**. چون `bank_cards` per-user آپسِرت می‌شود، اگر FK خالی بود و کاربر کارتش را عوض می‌کرد، مقصد عودت‌های قدیمی بی‌سروصدا عوض می‌شد — اسنپ‌شات (که در `FinanceService._attach_refund_destination` خط ۱۴۲ پر می‌شود و بعد از پر شدن هرگز تغییر نمی‌کند) این را قطعی می‌کند |

### 2.8 جدول `penalties` — سابقه جریمه

تعریف: `backend/app/models/penalty.py:12`.

| فیلد | کاربرد |
|---|---|
| `user_id` | FK→users — جریمه روی چه کسی |
| `booking_id` | FK→bookings، **یکتا** (`uq_penalties_booking_id`) — هر رزرو فقط یک‌بار جریمه می‌شود (ضد جریمه تکراری) |
| `amount` | مبلغ ۱۰٪ |
| `reason` | str(128) — علت انگلیسی ماشین‌خوان |
| `created_at` | زمان ثبت |

### 2.9 جدول `bank_cards` — مقصد واریز عودت

تعریف: `backend/app/models/bank_card.py:20`. یک کاربر یک کارت (یکتای `user_id`).

| فیلد | کاربرد |
|---|---|
| `encrypted_card_number` | شماره کارت رمزنگاری‌شده (str ۵۱۲) |
| `masked_card_number` | نسخه ماسک برای نمایش |
| `card_fingerprint` | اثر انگشت کارت — جلوگیری از ثبت یک کارت بین چند کاربر |
| `holder_name` | نام صاحب کارت |
| `status` | `pending_confirmation` → `verified` / `rejected` |
| `verified_at` | زمان تأیید. فقط کارت `verified` به‌عنوان مقصد عودت پذیرفته می‌شود |

### 2.10 جدول `slot_cancellations` — سند لغو توسط مدیر

تعریف: `backend/app/models/slot_cancellation.py:12`.

| فیلد | کاربرد |
|---|---|
| `slot_id` / `booking_id` (`SET NULL`) / `vendor_id` / `manager_id` | طرفین لغو |
| `affected_user_id` (`SET NULL`) / `affected_full_name` / `affected_phone` | اسنپ‌شات قربانی لغو (کاربر یا مشتری حضوری) |
| `reason` | علت لغو (اختیاری) |
| `release_slot` | bool — سانس بعد از لغو `open` شود یا `blocked` |
| `online_paid_amount` | مبلغ آنلاین پرداخت‌شده اگر بود (مبنای هزینه سایت) |
| `site_cost_amount` | هزینه‌ای که سایت متحمل شد (= مبلغ عودت) |
| `sms_status` / `notification_status` / `review_status` | وضعیت ارسال پیامک/نوتیف و بررسی بعدی |

### 2.11 جدول‌های درگیر جانبی

- **`users`**: خواندن `phone_verified_at` (پیش‌شرط رزرو)، `phone` (ارسال به زیبال و SMS)، `role`.
- **`vendors`**: فقط خواندنی در این فلو — `is_active` (تأیید ادمین)، `ball_available`/`ball_price` (توپ)، `manager_id`، `name`، `address`.
- **`logs`**: هر ترنزیشن مهم با `log_action` (`core/logger.py:36` — user_id, action, details, severity, ip, user_agent). خطاهای مالی با `severity="CRITICAL"`.
- **`notifications`** / **`notification_deliveries`**: اطلاع‌رسانی درون‌برنامه‌ای و کانال SMS.
- **`reviews`**: فیلد `has_review` در لیست رزروها (رزرو تکمیل‌شده قابل نظردهی است).
- **`settlements`**: چرخه تسویه فروشنده که `settlement_status` رزروها را مصرف می‌کند.

---

## 3. ماشین‌های وضعیت

### 3.1 `BookingStatus` (`models/booking.py:15`)

```
pending_payment ──پرداخت موفق──► confirmed ──شروع سانس──► (تکمیل؛ مشتق از زمان)
      │                              │
      ├──۱۰ دقیقه گذشت──► expired    ├──لغو >48h──► cancelled (+جریمه+عودت)
      ├──لغو کاربر/شکست درگاه──► cancelled   │
      └                              └──لغو ≤48h──► pending_cancellation
                                                    │ ├─خریدار پیدا شد──► transferred
                                                    │ └─ددلاین گذشت/انصراف──► confirmed
```

### 3.2 `SlotStatus` (`models/time_slot.py:25`)

```
open ──ایجاد رزرو──► reserving ──پرداخت──► reserved ──لغو ≤48h──► pending_cancellation
  ▲                    │                        │                       │
  └──انقضا/لغو unpaid──┘                        └──لغو مدیر/کاربر>48h──► open
                                                                       ├──فروش مجدد──► reserved
                                                                       └──گذشت ددلاین──► reserved
blocked / disabled / closed: وضعیت‌های مدیریتیِ غیرقابل رزرو
```

### 3.3 `PaymentStatus` (`models/payment.py:15`)

`pending` → `success` / `failed` / `expired` (انقضای checkout بدون نتیجه از درگاه).

### 3.4 `ReplacementRequestStatus` / `BookingHoldStatus` (`models/replacement.py`)

```
درخواست: open ──متقاضی هولد گرفت──► held ──پرداخت──► completed
   │                                   │
   │                                   └──شکست/انقضای هولد──► open (بازگشت به چرخه)
   ├──صاحب انصراف داد──► revoked
   └──گذشت deadline──► expired

هولد: active ──شروع پرداخت──► processing ──verify──► paid
                 │                          └──شکست──► failed
                 ├──گذشت ۱۰ دقیقه──► expired
                 └──لغو کاربر──► cancelled
```

### 3.5 `RefundStatus`

`pending` → `approved` → `paid` (یا `rejected`) — تماماً دست ادمین.

---

## 4. قواعد کسب‌وکار کلیدی

| قاعده | مقدار | محل اجرا |
|---|---|---|
| پنجره پرداخت رزرو | **۱۰ دقیقه** | `create_booking` خط ۹۰۳ (`expires_at = now + 10min`)، هولد خط ۸۶۲ |
| پنجره رزرو از امروز | **۱۴ روز** | `PUBLIC_BOOKING_WINDOW_DAYS` خط ۷۶ |
| مرز لغو قطعی/مشروط | **۴۸ ساعت تا شروع سانس** | `get_cancellation_terms` خط ۵۳۶ و `cancel_booking` خط ۲۷۳۳ |
| جریمه لغو | **۱۰٪ مبلغ پرداختی** | `Decimal("0.10")` در همه مسیرهای لغو/جایگزینی |
| تعداد checkout زنده per کاربر | **۱** | `_ensure_single_live_checkout` + ایندکس یکتای شرطی |
| تعداد رزرو زنده per سانس | **۱** | ایندکس یکتای شرطی `uq_bookings_one_active_per_slot` |
| پیش‌شرط رزرو | تأیید شماره موبایل (OTP) | `create_booking` خطوط ۷۳۰–۷۴۱ |
| کارت بانکی | برای لغوِ تأییدشده الزامی (verified) | `_ensure_verified_bank_card` خط ۱۲۸ |
| لغو پس از شروع سانس | ممنوع (هم کاربر هم مدیر) | چک `slot.start_time <= now_utc()` |
| اعتماد به درگاه | فقط state سرور-به-سرور زیبال (`verify`/`inquiry`)؛ فلگ‌های callback نادیده | `resolve_zibal_payment` خط ۱۳۳۱–۱۳۳۵ |
| رزرو بلندمدت مدیر | حداکثر ۶ ماه (۱۸۶ روز) | `create_recurring_manager_bookings` خط ۲۱۶ |

---

## 5. فرایند رزرو از سوی کاربر — مرور کد

مسیر: `POST /api/v1/bookings` (`api/v1/bookings.py:173`) با rate-limit `12/minute` → `BookingService.create_booking` (`booking_service.py:729`).

> نکته: این endpoint از `get_booking_service_fresh` (خط ۳۰۰۵) استفاده می‌کند نه نسخه کش‌شده، چون ستون `phone_verified_at` و `phone` را از DB واقعی می‌خواند — مسیر کشِ JWT فقط identity برمی‌گرداند.

### گام ۰ — پیش‌شرط تأیید موبایل (خطوط ۷۳۰–۷۴۱)

```python
if (self.current_user.role == "user"
        and not settings.is_development_or_bootstrap
        and not self.current_user.phone_verified_at):
    raise HTTPException(403, {"code": "phone_verification_required", ...})
```

در محیط توسعه (`is_development_or_bootstrap`) این گارد غیرفعال است تا تست‌ها روان باشند.

### گام ۱ — فقط یک checkout زنده: `_ensure_single_live_checkout` (خط ۱۵۰)

ابتدا ردیف کاربر با `SELECT ... FOR UPDATE` قفل می‌شود — قفلِ «هر کاربر» به‌عنوان mutex، چون رزروِ هنوز‌ساخته‌نشده‌ای برای قفل وجود ندارد. سپس:

1. **pending_payment منقضی‌شده:** اگر payment زنده با `gateway_transaction_id` دارد، اول `resolve_zibal_payment` تکلیف پول را روشن می‌کند (شاید کاربر پرداخت کرده و callback نرسیده). اگر قطعاً پول حرکت نکرده → رزرو `expired`، سانس `open`، کش‌ها باطل، و ادامه.
2. **pending_payment زنده:** خطای ۴۰۹ با payload ساختاریافته:
   ```python
   {"code": "pending_booking_limit_reached", "checkout_type": "booking",
    "booking_id": ..., "payment_url": "https://.../start/{track_id}",
    "expires_at": ..., "vendor_name": ..., "slot_date": ..., "slot_time": ...}
   ```
   فرانت‌اند این payload را به کارت زرد «رزرو در انتظار پرداخت دارید» تبدیل می‌کند.
3. **هولد جایگزینی زنده:** همان رفتار با `checkout_type: "replacement_hold"` و endpoint لغو متفاوت.

### گام ۲ — اعتبارسنجی سانس (خطوط ۷۴۳–۷۸۵)

به‌ترتیب، همه با ردیف سانس قفل‌شده (`for_update=True`):

1. وجود سانس و مجموعه + `vendor.is_active` (تأیید ادمین)
2. `slot.status` در `CLOSED/BLOCKED/DISABLED` نباشد
3. `slot.start_time > now` (شروع نشده)
4. `slot.start_time <= now + 14 روز` (پنجره رزرو)
5. اگر `with_ball` → `vendor.ball_available`
6. `slot.is_reserved` نباشد — با پیام اختصاصی برای `RESERVING`: «اگر او تا ۱۰ دقیقه دیگر نهایی نکند می‌توانید رزرو کنید»
7. **`slot.version == data.version`** — قفل خوش‌بینانه

### گام ۳ — دوشاخه اصلی (خط ۷۸۷ به بعد)

#### مسیر A: سانس آزاد (خطوط ۸۸۷–۹۳۷)

```python
booking = await self.booking_repo.create({
    "user_id": ..., "slot_id": ...,
    "status": BookingStatus.PENDING_PAYMENT,
    "price_paid": final_price,             # slot_price + ball_price
    "expires_at": now_utc() + timedelta(minutes=10),
})
await self.slot_repo.update(slot, {"is_reserved": True, "status": SlotStatus.RESERVING})
await invalidate_slot_list(slot.vendor_id); ...
await log_action(..., "booking_created", ...); await self.db.commit()
```

خروجی: `BookingDetailResponse` با `checkout_type="booking"`.

#### مسیر B: سانس در انتظار جایگزین (خطوط ۷۸۸–۸۸۱)

وقتی رزرو فعالِ سانس `PENDING_CANCELLATION` است:

1. اگر مالکِ همان کاربر است → ۴۰۹ «رزرو قبلی شما برای این سانس در انتظار جایگزین است».
2. `ReplacementRequest` بازیابی/ساخته می‌شود. **اگر `deadline` (شروع سانس) گذشته باشد، همان‌جا چرخه بسته می‌شود**: درخواست `expired`، رزرو اصلی دوباره `confirmed` + `penalty_amount=None`، سانس `reserved` — «lazy expiry» به‌جای اتکای صرف به جاب.
3. هولد زنده‌ی قبلیِ منقضی → بسته و درخواست دوباره `open`.
4. اگر درخواست `open` و بدون هولد زنده است:
   ```python
   hold = await self.replacement_repo.create_hold({
       "replacement_request_id": request.id, "slot_id": ..., "user_id": ...,
       "status": BookingHoldStatus.ACTIVE,
       "expires_at": min(now_utc() + timedelta(minutes=10), request.deadline),
   })
   # درخواست → HELD، سانس → RESERVING + is_reserved
   ```
5. خروجی: `ReplacementHoldResponse` با `checkout_type="replacement_hold"` — فرانت‌اند از همین فیلد می‌فهمد که باید `/replacement-holds/{id}/pay` را صدا بزند.

### گام ۴ — ادامه از سمت فرانت

`frontend/app/book/page.tsx:276` (`handleConfirm`): اول `POST /bookings`، بعد **بلافاصله** pay مناسب هر `checkout_type`؛ اگر پاسخ `payment_gateway: "zibal"` داشت → ریدایرکت به `start_url`.

---

## 6. فرایند پرداخت (درگاه زیبال)

### 6.1 شروع پرداخت — `pay_booking` (خط ۱۹۹۶) / `_start_zibal_payment` (خط ۹۶۰)

مسیر: `POST /bookings/{id}/pay` با rate-limit `10/min`.

1. قفل ردیف رزرو؛ چک مالکیت و `status == PENDING_PAYMENT`.
2. **اگر `expires_at` گذشته:**
   - payment زنده با track دارد → `resolve_zibal_payment(track_id)` (پول شاید حرکت کرده)؛ اگر `paid` شد، همان booking برمی‌گردد.
   - وگرنه: رزرو `expired` + سانس آزاد (با احترام به `replaces_booking_id`: اگر رزرو قبلی هنوز `pending_cancellation` است، سانس به همان وضعیت برمی‌گردد نه `open`) → ۴۰۹ «مهلت پرداخت تمام شده».
3. **Idempotency:** اگر payment زنده با track_id هست → همان `start_url` قبلی برگردانده می‌شود بدون ساخت تراکنش جدید. اگر payment زنده ولی بدون track (در حال ساخت) → ۴۰۹ «دوباره پرداخت نکنید».
4. **الگوی پرداخت امن:**
   ```python
   processing_token = uuid4().hex
   payment = await self.payment_repo.create({
       "booking_id": ..., "amount": booking.price_paid, "status": "pending",
       "idempotency_key": f"booking:{booking_id}:{processing_token}",
       "processing_token": processing_token,
   })
   await self.db.commit()          # ← ردیف پایدار قبل از تماس بیرونی
   result = await gateway.request_payment(...)   # تماس شبکه‌ای
   # به‌روزرسانی فقط اگر ردیف هنوز همان token را دارد:
   if payment and payment.processing_token == processing_token:
       await self.payment_repo.update(payment, {"gateway_transaction_id": result.track_id, ...})
       await self.db.commit()
   ```
5. خروجی `PaymentStartResponse` شامل `start_url` → ریدایرکت کاربر به صفحه بانک.

### 6.2 بازگشت از درگاه — `verify_zibal_payment` (خط ۱۴۳۸)

مسیر: `POST /payments/zibal/verify` با `track_id` (از `app/book/payment/callback/page.tsx`). ۹ گام شماره‌گذاری‌شده در خود کد:

| گام | کد | توضیح |
|---|---|---|
| 1 | ۱۴۴۰ | قفل ردیف payment با `for_update` — ضد verify همزمان دو callback |
| 2 | ۱۴۵۷ | Idempotent: اگر `SUCCESS + CONFIRMED` → همان جواب قبلی |
| 3 | ۱۴۶۰–۱۴۶۵ | **آزادکردن قفل‌ها قبل از تماس شبکه‌ای** (فقط IDها نگه داشته می‌شوند + `expected_amount`) و `commit` |
| 4 | ۱۴۶۸–۱۴۷۳ | تماس `gateway.verify_payment(track_id)` — ممکن است چند ثانیه بلوک کند |
| 5 | ۱۴۷۶–۱۴۷۹ | بازگشت قفل‌ها؛ اگر ردیف‌ها حذف شده‌اند ۴۰۴ |
| 6 | ۱۴۸۲ | چک idempotent مجدد بعد از قفل مجدد |
| 7 | ۱۴۹۰–۱۵۱۶ | **محافظ عدم تطابق مبلغ** (تلورانس ۱ تومان): در صورت مغایرت، پول `SUCCESS` با `failure_code=amount_mismatch` ثبت و لاگ CRITICAL — پول گم نمی‌شود، به پشتیبانی می‌رود |
| 8 | ۱۵۱۹–۱۵۴۲ | **رزرو دیگر قابل پرداخت نیست** (مثلاً همزمان لغو شده): `SUCCESS` با `failure_code=paid_but_booking_not_payable` + CRITICAL |
| 9 | ۱۵۴۵–۱۵۸۹ | نهایی‌سازی: payment `success`، رزرو `CONFIRMED`، سانس `RESERVED`، کش‌ها باطل، لاگ، نوتیفیکیشن به کاربر و مدیر، SMS، همگام‌سازی Eitaa |

### 6.3 طبقه‌بندی نتیجه — `resolve_zibal_payment` (خط ۱۲۴۹)

خروجی یکی از چهار outcome:

| outcome | معنا | منبع |
|---|---|---|
| `paid` | پرداخت و نهایی‌سازی کامل | payment=SUCCESS و رزرو=CONFIRMED |
| `failed` | پول حرکت نکرده، رزرو آزاد شد | verify ناموفق + inquiry تأیید کرد |
| `pending` | درگاه هنوز قطعی نگفته | `payment_status=None` یا `-1` داخل مهلت |
| `reconciliation_required` | پول موافق، نهایی‌سازی مخالف → صف پشتیبانی | `verified=true` اما رزرو pay-ready نیست و… |

منطق: اول state محلی → بعد `verify` → در صورت خطا `inquiry` (کامنت خط ۱۳۳۳: فلگ‌های callback عمداً نادیده گرفته می‌شوند). اگر inquiry گفت `-1` (در انتظار پرداخت) و مهلت محلی گذشته → `_expire_zibal_booking_checkout` رزرو را قطعاً می‌بندد.

### 6.4 گارد لغو unpaid — `_ensure_zibal_checkout_unpaid` (خط ۱۲۱۸)

فقط `inquiry` زیبال مرجع است:
- `verified` یا `payment_status ∈ {1,2}` → لغو ممنوع (پول بوده)
- `payment_status = None` → «چند لحظه دیگر»
- `-1` (در انتظار) یا `3` (لغو توسط پرداخت‌کننده) → اجازه لغو — دقیقاً معادل دکمه لغوی خود درگاه

### 6.5 فهرست `failure_code` های مهم

| کد | معنا |
|---|---|
| `insufficient_funds` / `fraud_detected` | رد درگاه (mock) |
| `gateway_timeout_uncertain` | timeout نامشخص — payment در `pending` می‌ماند، دوباره پرداخت ممنوع |
| `amount_mismatch` | مبلغ درگاه ≠ مبلغ رزرو (CRITICAL) |
| `paid_but_booking_not_payable` / `paid_but_booking_conflicted` | پول گرفته شد ولی رزرو قابل نهایی‌سازی نبود (CRITICAL) |
| `cancelled_by_user` | لغو unpaid از داخل سایت |
| `zibal_checkout_expired` / `zibal_payment_failed` | انقضا/شکست قطعیِ تأییدشده با inquiry |

---

## 7. انقضا و تعمیر خودکار

رزرو `pending_payment` منقضی‌شده از **سه مسیر** بسته می‌شود (همه در نهایت یک کار را می‌کنند — رزرو `expired` + `settlement_status=excluded_due_to_cancellation` + آزادسازی درست سانس):

1. **Lazy/درون‌درخواستی:** موقع رزرو بعدی (`_ensure_single_live_checkout` خط ۱۸۱)، موقع pay (خط ۹۷۷)، موقع cancel (خط ۲۶۲۵).
2. **سویپر هر دقیقه:** `main.py:83` → `list_expired_pending_with_slots` (`booking_repo.py:302`) با `with_for_update(skip_locked=True)`؛ با preload دسته‌ای سانس و رزروهای قبلیِ جایگزینی — اگر رزرو منقضی جایگزین بود و رزرو اصلی هنوز `pending_cancellation`، سانس به آن وضعیت برمی‌گردد نه `open`.
3. **انقضای checkout زیبال:** `_expire_zibal_booking_checkout` (خط ۱۱۵۰) وقتی inquiry گفت پول حرکت نکرده ولی مهلت محلی گذشته.

**نکته حیاتی سویپر:** شرط `~exists(pending payment)` — رزروهایی که payment در انتظار نتیجه درگاه دارند هرگز سویپر نمی‌شوند؛ تکلیفشان فقط از درگاه می‌آید.

---

## 8. فرایند لغو از سوی کاربر — مرور کد

### 8.1 پیش‌نمایش شروط — `GET /bookings/{id}/cancellation-terms` → `get_cancellation_terms` (خط ۴۶۰)

| شرط | `mode` | `can_cancel` | نکته |
|---|---|---|---|
| رزرو `cancelled/transferred/pending_cancellation` یا ترمینال | `already_cancelled` / `already_pending_cancellation` / `not_cancellable` | false | با `blocking_reason` |
| `slot.start_time <= now` | `started` | false | بعد از شروع، لغو ممنوع |
| رزرو `pending_payment` | `pending_payment` | true | بدون کارت، بدون شروط |
| `confirmed` و بیشتر از ۴۸h | `refund_with_penalty` | true | عودت ۹۰٪ + جریمه ۱۰٪، نیاز به کارت verified |
| `confirmed` و ≤۴۸h | `pending_replacement` | true | عودت مشروط به فروش مجدد، نیاز به کارت verified |

فیلد `rules` شامل متن پنج قاعده است که عیناً در دایالوگ لغو نمایش داده می‌شود.

### 8.2 اجرای لغو — `POST /bookings/{id}/cancel` → `cancel_booking` (خط ۲۵۹۴)

ورودی `BookingCancelRequest` (`schemas/booking.py:24`): `accepted_terms`، `card_number` (اختیاری)، `expected_mode` (اختیاری).

#### بخش ۱ — گاردایال‌ها (خطوط ۲۵۹۷–۲۶۲۳)

قفل ردیف رزرو (`_get_owned_booking_for_cancel`)، مالکیت (یا ادمین)، وضعیت‌های ترمینال → ۴۰۹، شروع‌نشدن سانس.

#### بخش ۲ — حالت unpaid: `pending_payment` (خطوط ۲۶۲۵–۲۷۰۷)

خطرناک‌ترین حالت — کاربر شاید همین الان روی صفحه بانک است:

1. اگر payment زنده با track: `resolve_zibal_payment` → اگر `paid` → ۴۰۹ «تابع قوانین بازپرداخت»؛ اگر قطعی نشده → `_ensure_zibal_checkout_unpaid` (استعلام مستقیم).
2. اگر payment زنده ولی فقط `processing_token` (در حال ساخت) → ۴۰۹ «چند لحظه دیگر».
3. **بعد از رفت‌وبرگشت شبکه، ردیف رزرو دوباره با قفل خوانده می‌شود** (خط ۲۶۵۵) — ممکن است در فاصله releasing locks paid یا expired شده باشد.
4. نهایی: payment → `failed(cancelled_by_user)`، رزرو → `CANCELLED` + `excluded_due_to_cancellation`، سانس → `OPEN` (یا `PENDING_CANCELLATION` اگر رزرو جایگزینِ یک رزروِ هنوز-در-انتظار بود)، لاگ، commit.

#### بخش ۳ — گارد تغییر شرایط (خطوط ۲۷۰۹–۲۷۳۱)

```python
actual_mode = "pending_replacement" if time_until_slot <= timedelta(hours=48) else "refund_with_penalty"
if data.expected_mode and data.expected_mode != actual_mode:
    raise HTTPException(409, {"code": "cancellation_terms_changed", ...})
```

کاربر شروط را برای mode ای تأیید کرده که دیگر معتبر نیست (مرز ۴۸ ساعت رد شده). سپس `accepted_terms` الزامی و `_ensure_verified_bank_card(data.card_number)` — اگر کارت verified ندارد و شماره فرستاده، همین‌جا کارت lookup/ثبت/تأیید می‌شود (`BankCardService`).

#### بخش ۴ — حالت ≤۴۸ ساعت: انتظار جایگزین (خطوط ۲۷۳۳–۲۷۹۱)

```python
penalty_amount = price_paid * 0.10 ; refund_amount = price_paid - penalty
booking → PENDING_CANCELLATION (penalty_amount=None — هنوز قطعی نیست)
slot    → PENDING_CANCELLATION (is_reserved=True — سانس عملاً «در انتظار» فروخته می‌شود)
ReplacementRequest(open, penalty, refund, deadline=slot.start_time)
```

**هیچ رکورد عودت/جریمه‌ای اینجا ساخته نمی‌شود** — عودت فقط در صورت فروش مجدد قطعی می‌شود. اطلاع‌رسانی به کاربر و مدیر انجام می‌شود.

#### بخش ۵ — حالت >۴۸ ساعت: لغو قطعی با جریمه (خطوط ۲۷۹۳–۲۸۸۰)

- رزرو → `CANCELLED` + `penalty_amount=10%` + `settlement_status=excluded_due_to_refund`
- رکورد `Penalty` (یکتا per booking)
- سانس → `OPEN` (فقط اگر `was_confirmed`)
- `FinanceService.create_refund(type=USER_CANCELLATION, status=PENDING, penalty_charged_to_user=True, site_bears_penalty=False)` — idempotent (یکتای booking+type) و اسنپ‌شات کارت مقصد
- اطلاع‌رسانی + لاگ + commit

پرداختِ خودِ عودت (`PENDING → APPROVED → PAID`) دستی و توسط ادمین انجام می‌شود.

### 8.3 انصراف از لغو — `POST /bookings/{id}/withdraw-cancellation` → `withdraw_cancellation` (خط ۲۸۸۲)

شرط‌ها: رزرو `PENDING_CANCELLATION`، سانس شروع نشده، درخواست جایگزینی `OPEN` (نه `HELD` — یعنی کسی وسط پرداخت نیست).
اثر: درخواست → `REVOKED`، رزرو → `CONFIRMED` (`penalty_amount=None`)، سانس → `RESERVED`، نوتیفیکیشن، لاگ. قفل ردیف سانس این ترنزیشن را با ایجاد هولد جدید سریالایز می‌کند (خط ۲۹۰۰ کامنت).

### 8.4 لغو هولد جایگزینی — `DELETE /bookings/replacement-holds/{id}` → `cancel_replacement_hold` (خط ۲۲۹۵)

هولد باید `ACTIVE` باشد (اگر `PROCESSING` است → ۴۰۹ «در حال پردازش»). اثر: هولد `CANCELLED(cancelled_by_user)`، درخواست دوباره `OPEN`، سانس → `PENDING_CANCELLATION` (برگشت به فروش).

---

## 9. فرایند جایگزینی (فروش مجدد سانس)

شروع: کاربر B سانسی را می‌خرد که رزروش `PENDING_CANCELLATION` متعلق به کاربر A است (بخش ۵ گام ۳ مسیر B). سپس B هولد را پرداخت می‌کند: `POST /replacement-holds/{id}/pay` → `pay_replacement_hold` (خط ۲۴۱۴):

1. گاردها: مالکیت، هولد `ACTIVE` (یا `PAID` → برگرداندن رزرو نهایی)، درخواست `HELD`، `expires_at` و `deadline` نگذشته. اگر گذشته: هولد `EXPIRED` و **اگر ددلاین گذشته**: درخواست `EXPIRED` + رزرو اصلی دوباره `CONFIRMED` + سانس `RESERVED`.
2. هولد → `PROCESSING` با `processing_token`، **commit** (قفل‌ها قبل از تماس درگاه آزاد می‌شوند — کامنت خط ۲۵۰۴: PROCESSING + ایندکس یکتای زنده، بقیه خریداران را بیرون نگه می‌دارد).
3. Zibal: `request_payment` با `order_id=f"hold:{hold_id}"`؛ track روی هولد ثبت؛ `start_url` برمی‌گردد.
4. بعد از بازگشت از درگاه، `verify_zibal_payment` مسیر هولد را هم پوشش می‌دهد (`_verify_zibal_replacement_hold` خط ۱۵۹۱) → `_finalize_replacement_payment` (خط ۱۶۶۴).

### `_finalize_replacement_payment` — تراکنش اتمیک ۹ مرحله‌ای

گارد اول: اگر **هر** پیش‌شرطی (درخواست HELD، رزرو اصلی `PENDING_CANCELLATION`، `deadline > now`) از دست رفته باشد: پول با `failure_code=paid_but_transfer_conflicted` ثبت + CRITICAL + ۴۰۹ پشتیبانی. پولِ گرفته‌شده هیچ‌وقت گم نمی‌شود؛ بدترین حالت صف بررسی است.

در حالت سالم، همه در یک تراکنش:

1. رزرو A → `TRANSFERRED` + `penalty_amount` + `excluded_due_to_refund`
2. رزرو جدید برای B → مستقیم `CONFIRMED` با `replaces_booking_id=A`
3. رکورد `Payment` موفق روی رزرو B
4. `Refund` نوع `REPLACED_AFTER_PENDING_CANCELLATION` برای A + رکورد `Penalty`
5. درخواست `COMPLETED` + هولد `PAID`
6. سانس → `RESERVED`
7. نوتیفیکیشن‌ها (A: جایگزین شد؛ B: تأیید شد؛ مدیر: جایگزینی)
8. لاگ + commit + SMS برای B + همگام‌سازی Eitaa

**اگر تا شروع سانس خریدار پیدا نشود:** همان جایی که خریدار وارد می‌شود (`create_booking` خط ۸۰۹ یا `pay_replacement_hold` خط ۲۴۶۶ یا جاب `_expire_replacement_work_periodically`) درخواست `EXPIRED` و رزرو A به `CONFIRMED` برمی‌گردد — A سانسش را نگه می‌دارد و پولش برنمی‌گردد (ریسکِ پذیرفته‌شده در لغو ≤۴۸h).

---

## 10. فرایند رزرو از سوی مجموعه (مدیر)

### 10.1 رزرو دستی (حضوری) — `POST /manager/bookings/manual`

`api/v1/manager.py:197` → `FinanceService.create_manager_booking` (خط ۱۵۳):

1. `_get_slot_for_manager` (خط ۷۰): سانس باید متعلق به مجموعه همین مدیر باشد.
2. گاردها: مجموعه فعال، سانس `OPEN` و `is_reserved=false`، بدون رزرو فعال (با `get_active_by_slot(for_update=True)`).
3. `_get_or_create_customer` (خط ۷۷): اگر کاربری با این شماره هست → همان؛ وگرنه کاربر OTP-خورده (بدون رمز) ساخته می‌شود تا رزرو owner داشته باشد.
4. رکورد رزرو:
   ```python
   status=CONFIRMED (بدون پرداخت و بدون مهلت!)
   source=MANAGER_MANUAL
   settlement_status=EXCLUDED_MANUAL_BOOKING   # پولی از سایت رد نشده
   created_by_manager_id=..., customer_full_name=..., customer_phone=...
   price_paid=0, slot_price=slot.base_price
   ```
5. سانس → `RESERVED`، SMS تأیید به مشتری.

نکته‌ی `manager.py:210-212`: بعد از commit، رزرو با `get_by_id` دوباره بارگذاری می‌شود چون دسترسی lazy به relationship در مسیر async بعد از commit خطای `MissingGreenlet` می‌دهد.

### 10.2 رزرو بلندمدت تکراری — `POST /manager/bookings/recurring`

`create_recurring_manager_bookings` (خط ۱۹۸): برای مشتری حضوری، در بازه تاریخ (حداکثر ۱۸۶ روز = ۶ ماه) و روزهای هفته انتخابی، سانس‌های منطبق را پیدا می‌کند؛ سانس‌های ناسازگار در لیست `conflicts` برمی‌گردند (و اگر `allow_partial=false` کل عملیات رد می‌شود)؛ در غیر این صورت برای هر سانس آزاد یک رزرو دستی می‌سازد. timezone با `iran_to_utc` مدیریت می‌شود.

---

## 11. فرایند لغو از سوی مجموعه (مدیر)

`POST /manager/bookings/{id}/cancel` (`manager.py:248`) → `cancel_booking_by_manager` (`finance_service.py:284`). ورودی: `reason` (اختیاری) و `release_slot` (bool).

تفاوت‌های بنیادین با لغو کاربر:

| جنبه | لغو کاربر | لغو مدیر |
|---|---|---|
| جریمه | ۱۰٪ از کاربر | **بدون جریمه**؛ `site_bears_penalty=True` |
| عودت | ۹۰٪ (یا مشروط) | **۱۰۰٪** اگر پرداخت آنلاین بوده |
| سناریو وضعیت سانس | `open` | به انتخاب مدیر: `release_slot=true` → `open`، `false` → `blocked` (مثلاً تعمیرات) |
| پرونده | refunds | refunds + **slot_cancellations** |

مراحل کد:

1. قفل رزرو، چک تعلق سانس به مجموعه مدیر، شروع‌نشدن سانس، وضعیت ترمینال نبودن.
2. **محاسبه هزینه سایت:** اگر رزرو `online` است و payment موفق دارد و وضعیتش `CONFIRMED/PENDING_CANCELLATION`:
   - `create_refund(type=MANAGER_CANCELLATION, penalty=0, refund=100%, penalty_charged_to_user=False, site_bears_penalty=True)`
   - `settlement_status = EXCLUDED_DUE_TO_REFUND`
   - وگرنه (رزرو دستی/پرداخت‌نشده): فقط `EXCLUDED_DUE_TO_CANCELLATION`.
3. **اگر رزرو `PENDING_CANCELLATION` بود:** `revoke_replacement_request` (`replacement_service.py:109`) — همه هولدهای زنده `CANCELLED(original_booking_cancelled)` و درخواست `REVOKED` (متقاضیِ وسطِ پرداخت نمی‌تواند بعداً رزرو را بقاپد).
4. رزرو → `CANCELLED`؛ سانس → `OPEN` یا `BLOCKED` طبق `release_slot`.
5. اطلاع‌رسانی به قربانی: نوتیفیکیشن درون‌برنامه‌ای + SMS با ثبت `NotificationDelivery` (وضعیت ارسال حتی در شکست ذخیره می‌شود — `sms_status`/`notification_status`).
6. سند `SlotCancellation` با اسنپ‌شات کامل (مبلغ آنلاین، هزینه سایت، مخاطب، وضعیت پیام‌ها) ذخیره می‌شود.

---

## 12. جاب‌های پس‌زمینه

همه در `backend/app/main.py` به‌صورت حلقه‌های `while True` با `asyncio.sleep(60)`:

| جاب | خط | کار |
|---|---|---|
| `_cancel_expired_pending` | ۸۳ | انقضای رزروهای `pending_payment` بدون payment زنده؛ batch + preload؛ احترام به زنجیره جایگزینی |
| `_reconcile_zibal_payments_periodically` | ۱۴۵ | فقط وقتی `payment_gateway=zibal`؛ callbackهای گم‌شده را resolve می‌کند + متریک Prometheus-style موفق/شکست جاب |
| `_expire_replacement_work_periodically` | ۱۸۲ | انقضای هولدها و درخواست‌های جایگزینی سررسیدشده (اگر ددلاین گذشته → رزرو اصلی دوباره confirmed) |

---

## 13. نقشه فرانت‌اند

| صفحه/کامپوننت | نقش |
|---|---|
| `app/book/page.tsx` | ستاپ: چک لاگین → هدایت OTP اگر لازم → `pending-checkout` → نمایش تأیید (با `BookingBallOption`) → create+pay → ریدایرکت درگاه. حالت conflict با کارت زرد و دو دکمه «ادامه پرداخت قبلی» / «لغو قبلی و آزادسازی» (خط ۲۳۶ `handleCancelPendingCheckout`) |
| `app/book/payment/page.tsx` | ادامه/تکرار پرداخت یک رزرو `pending_payment` + امکان لغو از همین‌جا |
| `app/book/payment/callback/page.tsx` | بازگشت از زیبال با `trackId` → `POST /payments/zibal/verify` → چهار حالت UI (paid/failed/pending/reconciliation) |
| `app/dashboard/bookings/page.tsx` | لیست (current/past/cancelled)؛ `handleCancelClick` (خط ۱۴۰) شروط را می‌گیرد؛ `handleConfirmCancel` (خط ۱۷۵) با `expected_mode` لغو می‌زند؛ `handleWithdrawCancellation` (خط ۱۵۸) |
| `components/bookings/booking-cancel-dialog.tsx` | دایالوگ شروط لغو (`ResponsiveDialog` — Dialog در دسکتاپ، Drawer در موبایل طبق قواعد پروژه): مود، مبلغ عودت، جریمه، قواعد، چک‌باکس تأیید، فیلد کارت در صورت نیاز |
| `components/vendors/vendor-booking.tsx` | دیالوگ رزرو سانس در صفحه مجموعه (انتخاب توپ و هدایت به `/book`) |
| `components/vendors/dashboard/vendor-bookings-tab.tsx` | تب رزروهای پنل مدیر مجموعه |

---

## 14. جدول انتقال‌های وضعیت (Transition Table)

### 14.1 `bookings.status`

| از | به | متد (فایل:خط) | پیش‌شرط‌ها / عوارض |
|---|---|---|---|
| — | `pending_payment` | `create_booking` (booking_service.py:891) | همه گاردها؛ سانس → RESERVING؛ expires_at=+10m |
| — | `confirmed` | `create_manager_booking` (finance_service.py:172) | رزرو دستی؛ source=manager_manual |
| `pending_payment` | `confirmed` | `verify_zibal_payment` (booking_service.py:1557) | payment=success؛ سانس → RESERVED؛ SMS/نوتیف |
| `pending_payment` | `cancelled` | `cancel_booking` (booking_service.py:2672) | unpaid + گارد درگاه؛ سانس → OPEN |
| `pending_payment` | `cancelled` | `_record_failed_zibal_attempt` (booking_service.py:1878) | شکست قطعیِ تأییدشده با inquiry |
| `pending_payment` | `expired` | سویپر (main.py:130)، `_expire_zibal_booking_checkout` (booking_service.py:1177)، lazy expiry در pay/create/cancel | مهلت گذشته + پول حرکت نکرده |
| `confirmed` | `cancelled` | `cancel_booking` (booking_service.py:2813) | >48h؛ +جریمه +Penalty +Refund(user_cancellation)؛ سانس → OPEN |
| `confirmed` | `pending_cancellation` | `cancel_booking` (booking_service.py:2736) | ≤48h؛ +ReplacementRequest؛ سانس → PENDING_CANCELLATION |
| `confirmed` | `cancelled` | `cancel_booking_by_manager` (finance_service.py:333) | لغو مدیر؛ عودت ۱۰۰٪ اگر آنلاین؛ +SlotCancellation |
| `pending_cancellation` | `transferred` | `_finalize_replacement_payment` (booking_service.py:1738) | خریدار پرداخت کرد؛ +Penalty +Refund(replaced) |
| `pending_cancellation` | `confirmed` | `withdraw_cancellation` (booking_service.py:2927)، انقضای ددلاین (booking_service.py:813، 2474؛ main.py:182) | انصراف مالک یا نیامدن خریدار؛ درخواست REVOKED/EXPIRED |
| `pending_payment` | `confirmed` | مسیر جایگزینی — از هولد ساخته می‌شود (booking_service.py:1746) | رزرو جدید مستقیم confirmed با replaces_booking_id |

### 14.2 `time_slots.status`

| از | به | فایل:خط | رویداد |
|---|---|---|---|
| `open` | `reserving` | booking_service.py:906 | ایجاد رزرو/هولد |
| `reserving` | `reserved` | booking_service.py:1564 | verify موفق |
| `reserving` | `open` | booking_service.py:192، 1021، 2695؛ main.py:128 | انقضا/لغو unpaid |
| `reserved` | `open` | booking_service.py:2817؛ finance_service.py:335 | لغو confirmed کاربر/مدیر(release) |
| `reserved` | `pending_cancellation` | booking_service.py:2743 | لغو ≤48h |
| `pending_cancellation` | `reserving` | booking_service.py:868 | متقاضی جایگزین هولد گرفت |
| `pending_cancellation` | `reserved` | booking_service.py:1813 (فروش)، 816/2483 (انقضای ددلاین) | فروش موفق یا برگشت به مالک |
| `open` | `blocked` | finance_service.py:337 | لغو مدیر بدون release |

---

## 15. سناریوهای عملی و مثال‌ها

> اعداد مثال: قیمت سانس ۵۰۰٬۰۰۰ تومان، توپ ۵۰٬۰۰۰ تومان. زمان‌ها UTC ذخیره و در UI به وقت ایران و تاریخ شمسی نمایش داده می‌شوند.

### سناریو ۱ — رزرو عادی موفق

1. **شنبه ۱۰:۰۰** — علی سانس «سه‌شنبه ۱۸:۰۰ تا ۱۹:۰۰ مجموعه آرنا» را در صفحه مجموعه انتخاب می‌کند → `with_ball=true` → هدایت به `/book?slot_id=42&vendor_id=7&with_ball=true`.
2. فرانت اول `GET /bookings/pending-checkout` → `null` (بدون checkout زنده). سپس `GET /slots/42` و نمایش تأیید: قیمت ۵۰۰٬۰۰۰ + توپ ۵۰٬۰۰۰ = **۵۵۰٬۰۰۰ تومان**.
3. «تأیید و پرداخت» → `POST /bookings {slot_id:42, version:3, with_ball:true}`:
   - `phone_verified_at` دارد ✓؛ checkout زنده ندارد ✓؛ سانس open و version=3 ✓؛ ۱۴ روز پنجره ✓
   - رزرو #۵۰۱ ساخته می‌شود: `pending_payment`, `price_paid=550000`, `expires_at=10:10`.
   - سانس #۴۲: `reserving`.
4. فرانت بلافاصله `POST /bookings/501/pay` → ردیف `payments` با `processing_token` ساخته و commit → تماس زیبال → `track_id=9901` ثبت → `start_url` برمی‌گردد → ریدایرکت علی به بانک.
5. **۱۰:۰۶** — علی در بانک رمز را می‌زند؛ زیبال او را به `/book/payment/callback?trackId=9901` برمی‌گرداند.
6. فرانت `POST /payments/zibal/verify {track_id:9901}`:
   - قفل payment → not success → آزادسازی قفل → تماس verify زیبال → `paid=550000` ✓ (تطابق مبلغ) → قفل مجدد → نهایی‌سازی:
   - payment: `success, ref_id=...` | رزرو #۵۰۱: `confirmed` | سانس #۴۲: `reserved`
   - نوتیف به علی و مدیر آرنا، SMS تأیید، digest ایتا.
7. UI: «پرداخت موفق — شماره رزرو ۵۰۱».

### سناریو ۲ — انقضای مهلت ۱۰ دقیقه (پشیمانی بی‌ضربه)

همان شروع سناریو ۱، ولی علی بعد از ریدایرکت، صفحه بانک را می‌بندد و ۱۵ دقیقه هیچ کاری نمی‌کند:

- **۱۰:۰۸** جاب `_cancel_expired_pending` هنوز چیزی پیدا نمی‌کند (payment زنده دارد — `~exists(pending payment)` شرط سویپر نیست).
- **۱۰:۱۰+** اگر علی برگردد و pay یا cancel یا رزرو جدید بزند: `resolve_zibal_payment(9901)` → inquiry می‌گوید `-1` و مهلت گذشته → `_expire_zibal_booking_checkout`: payment `expired(zibal_checkout_expired)`، رزرو #۵۰۱ `expired`، سانس #۴۲ `open`. پیام: «مهلت پرداخت تمام شد و سانس آزاد شد.»
- اگر علی هیچ‌وقت برنگردد، جاب تعمیر زیبال (بخش ۱۲) همین را خودکار انجام می‌دهد.

### سناریو ۳ — دو کاربر همزمان یک سانس (Race)

- **۱۰:۰۰:۰۰.۱** علی و **۱۰:۰۰:۰۰.۳** سارا هر دو روی سانس #۴۲ «تأیید و پرداخت» می‌زنند:
  - هر دو `POST /bookings` با `version=3` می‌فرستند.
  - تراکنش علی اول قفل ردیف سانس را می‌گیرد و رزرو #۵۰۱ را می‌سازد.
  - تراکنش سارا بعد از آزاد شدن قفل، `is_reserved=true` را می‌بیند → ۴۰۹: «این سانس هم‌اکنون توسط فرد دیگری در حال رزرو است؛ اگر او تا ۱۰ دقیقه دیگر نهایی نکند می‌توانید رزرو کنید».
  - حتی اگر این چک باگ می‌داشت، `uq_bookings_one_active_per_slot` در سطح دیتابیس ردیف دوم را رد می‌کرد.
- اگر علی پرداخت نکند (سناریو ۲)، سانس آزاد می‌شود و سارا می‌تواند دوباره تلاش کند.

### سناریو ۴ — لغو رزروِ پرداخت‌نشده در میانه‌ی بودن روی صفحه بانک

علی رزرو #۵۰۱ را ساخته، به بانک ریدایرکت شده، ولی از داشبورد (تب دیگر) «لغو» را می‌زند:

- `GET /cancellation-terms` → `mode=pending_payment`، بدون کارت و شروط.
- `POST /cancel {expected_mode:"pending_payment"}`:
  - payment زنده با track دارد → `resolve_zibal_payment(9901)`:
    - اگر علی **رمز را زده بود** و callback هنوز نیامده → inquiry می‌گوید `verified` → ۴۰۹ «پرداخت موفق شده؛ تابع قوانین بازپرداخت» — لغو انجام نمی‌شود و مسیر درست (عودت) پیشنهاد می‌شود.
    - اگر هنوز پرداخت نکرده → inquiry `-1` → اجازه لغو: payment `failed(cancelled_by_user)`، رزرو `cancelled`، سانس `open`.
  - بعد از استعلام، ردیف رزرو **دوباره با قفل خوانده می‌شود** — اگر در همین فاصله callback پرداخت رسیده بود، لغو بی‌اثر می‌شود.

### سناریو ۵ — لغو تأییدشده، بیشتر از ۴۸ ساعت مانده

- سانس علی (سناریو ۱) سه‌شنبه ۱۸:۰۰ است؛ او شنبه (۶۶ ساعت مانده) لغو می‌کند:
  - terms → `mode=refund_with_penalty`، `requires_bank_card=true`، عودت **۴۹۵٬۰۰۰**، جریمه **۵۵٬۰۰۰**.
  - کارت verified ندارد → در دایالوگ شماره کارت می‌گیرد؛ `_ensure_verified_bank_card` کارت را lookup/تأیید می‌کند.
  - `expected_mode` مطابق است، `accepted_terms=true`.
  - اثر: رزرو `cancelled(55,000)`، `Penalty(55,000)`، `Refund(user_cancellation, 495,000, PENDING)` با اسنپ‌شات کارت مقصد، سانس `open`.
  - سپس ادمین در پنل عودت‌ها → `approved` → واریز دستی → `paid` + کد رهگیری.

### سناریو ۶ — لغو ≤۴۸ ساعت و فروش موفق مجدد (جایگزینی)

- **دوشنبه ۲۰:۰۰** (۲۲ ساعت مانده) علی #۵۰۱ را لغو می‌کند:
  - terms → `mode=pending_replacement`؛ «این رزرو اکنون لغو نمی‌شود؛ ابتدا در انتظار جایگزین قرار می‌گیرد».
  - رزرو → `pending_cancellation`؛ سانس → `pending_cancellation` (همچنان `is_reserved`)؛ درخواست جایگزینی #۷۷ ساخته می‌شود (`penalty=55,000`, `refund=495,000`, `deadline=سه‌شنبه ۱۸:00`).
- **دوشنبه ۲۱:۰۰** — محمد همین سانس را می‌خواهد:
  - `create_booking` رزرو فعالِ `pending_cancellation` را می‌بیند (مالکش علی نیست) → درخواست #۷۷ `open` است → هولد #۱۲ برای محمد با `expires_at=21:10` → سانس `reserving`. جواب: `checkout_type=replacement_hold`.
  - فرانت `POST /replacement-holds/12/pay` → هولد `processing` + track زیبال → ریدایرکت.
  - بازگشت و verify موفق → `_finalize_replacement_payment` در یک تراکنش:
    - رزرو علی #۵۰۱ → `transferred(55,000)` + `Refund(replaced_after_pending_cancellation, 495,000, PENDING)` + `Penalty(55,000)` برای علی
    - رزرو جدید #۵۱۲ برای محمد → `confirmed` با `replaces_booking_id=501` + `Payment(success)`
    - درخواست `completed`، هولد `paid`، سانس `reserved`
    - علی نوتیف «جایگزین شد»، محمد «تأیید شد».

### سناریو ۷ — لغو ≤۴۸ ساعت بدون خریدار

- مثل سناریو ۶ ولی هیچ‌کس نمی‌خرد. سه‌شنبه ۱۸:۰۰ می‌رسد:
  - اولین نقطه تماس (مثلاً جاب `_expire_replacement_work_periodically` یا هر تلاش رزرو بعدی): درخواست #۷۷ → `expired`؛ رزرو علی → دوباره `confirmed` (`penalty_amount=None`)؛ سانس → `reserved`.
  - نتیجه: علی سانس را نگه داشت، پولی برنگشت، هیچ جریمه‌ای ننشست. (ریسکی که در شروط لغو به او گفته شده بود.)

### سناریو ۸ — انصراف از لغو

- بعد از سناریو ۶ (قبل از آمدن محمد)، علی پشیمان می‌شود: `POST /bookings/501/withdraw-cancellation`:
  - درخواست #۷۷ هنوز `open` است ✓ → `revoked`؛ رزرو → `confirmed`؛ سانس → `reserved`؛ نوتیف «انصراف از لغو ثبت شد».
  - اگر محمد **در همان لحظه** هولد گرفته بود (`held`) → ۴۰۹ «کاربر جایگزین در حال تکمیل رزرو است».

### سناریو ۹ — لغو توسط مدیر مجموعه (تعطیلی ناگهانی)

- مدیر آرنا دوشنبه می‌بیند زمین خراب است؛ رزرو محمد #۵۱۲ را لغو می‌کند با `reason="خرابی زمین"` و `release_slot=false`:
  - رزرو online با payment موفق → `Refund(manager_cancellation, refund=۵۵۰٬۰۰۰ کامل, penalty=0, site_bears_penalty=true)` و `settlement_status=excluded_due_to_refund`.
  - اگر رزرو `pending_cancellation` بود، پرونده جایگزینی هم `revoke` می‌شد.
  - رزرو → `cancelled`؛ سانس → `blocked` (به انتخاب مدیر).
  - محمد نوتیف + SMS می‌گیرد؛ سند `SlotCancellation` با هزینه سایت ۵۵۰٬۰۰۰ ثبت می‌شود (گزارش هزینه‌های سایت).

### سناریو ۱۰ — رزرو دستی مدیر + لغو آن

- مدیر برای مشتری حضوری «رضا / ۰۹۱۲…» سانس #۴۳ را ثبت می‌کند:
  - کاربری با آن شماره نیست → کاربر OTP ساخته می‌شود.
  - رزرو #۵۲۰: `confirmed`, `source=manager_manual`, `price_paid=0`, `settlement_status=excluded_manual_booking`, `created_by_manager_id=…`, `customer_full_name=رضا`.
  - سانس `reserved`، SMS به رضا.
- اگر مدیر بعداً لغوش کند: چون payment موفق ندارد، فقط `settlement_status=excluded_due_to_cancellation` — هیچ عودتی ساخته نمی‌شود؛ پولی از سایت رد نشده بود.

### سناریو ۱۱ — callback گم‌شده (Reconciliation)

- علی رمز بانک را می‌زند، پول کم می‌شود، ولی اینترنت قطع می‌شود و callback هرگز به مرورگر نمی‌رسد:
  - رزرو #۵۰۱ همچنان `pending_payment` و payment `pending(track=9901)`.
  - جاب هر دقیقه (`_reconcile_zibal_payments_periodically` → `reconcile_stale_zibal_payments`, booking_service.py:3019) تراکنش‌های stale (>۲ دقیقه) را resolve می‌کند:
    - verify موفق → نهایی‌سازی کامل مثل سناریو ۱؛ علی بعداً در داشبورد رزرو `confirmed` را می‌بیند.
  - اول `expire_pending_for_nonpayable_bookings` رزروهایی را که اصلاً قابل پرداخت نیستند تمیز می‌کند؛ اگر نتیجه‌ای قطعی شد کش داشبورد ادمین هم باطل می‌شود.

### سناریو ۱۲ — یک checkout زنده per کاربر

- علی رزرو پرداخت‌نشده #۵۳۰ دارد و می‌خواهد سانس دیگری بگیرد:
  - `GET /pending-checkout` یا `POST /bookings` (جديد) → ۴۰۹ با `pending_booking_limit_reached` + جزئیات #۵۳۰ و `payment_url`.
  - فرانت کارت زرد نشان می‌دهد: «ادامه و تکمیل پرداخت رزرو قبلی» (ریدایرکت به همان `start_url`) یا «لغو رزرو قبلی و آزادسازی سانس» (`POST /{id}/cancel {expected_mode:"pending_payment"}`) و بعد ادامه رزرو جدید.

---

## 16. اصول طراحی سیستم

1. **سه لایه دفاع همزمانی:**
   - قفل ردیفی `FOR UPDATE` برای هر ترنزیشن حساس (سانس، رزرو، payment، درخواست، حتی ردیف user به‌عنوان mutex per-carrier).
   - `slot.version` برای قفل خوش‌بینانه بین «نمایش به کاربر» و «تأیید».
   - ایندکس‌های یکتای شرطی به‌عنوان آخرین دیوار — حتی با باگ در کد، دیتابیس وضعیت ناممکن را رد می‌کند.
2. **قانون طلایی پرداخت:** هیچ تصمیم مالی بر اساس state محلی گرفته نمی‌شود؛ فقط `verify`/`inquiry` سرور-به-سرور زیبال مرجع است. فلگ‌های callback عمداً نادیده گرفته می‌شوند.
3. **پول گم نمی‌شود:** بدترین سناریو همیشه «ثبت پول + کد خطا + لاگ CRITICAL + صف پشتیبانی» است (`amount_mismatch`، `paid_but_booking_not_payable`، `paid_but_transfer_conflicted`).
4. **قفل‌ها قبل از هر تماس شبکه‌ای آزاد می‌شوند** و بعد از پاسخ دوباره گرفته می‌شوند؛ صحت با `processing_token` و چک idempotent مجدد تضمین می‌شود (کامنت‌های کد در `_start_zibal_payment`، `verify_zibal_payment`، `pay_replacement_hold` همین را توضیح می‌دهند).
5. **پایدارسازی قبل از خطا:** هر جا `HTTPException` بعد از نوشتن مطرح می‌شود، اول `commit` می‌شود تا وابستگی `get_db` (rollback روی exception) ردیف‌های append-only (payment، لاگ) را برنگرداند (کامنت خطوط ۹۵۶ و ۲۴۱۰).
6. **مدل مالی لغو:** جریمه همیشه ۱۰٪ است؛ فرق دو بازه زمانی فقط در این است که ریسک «فروش مجدد» در ≤۴۸h سمت سایت می‌ماند (عودت مشروط) و در >۴h بلافاصله قطعی می‌شود. در لغو مدیر، سایت کل ریسک را می‌پذیرد (`site_bears_penalty`) و مشتری ۱۰۰٪ عودت می‌گیرد.
7. **اسنپ‌شات‌های غیرقابل‌تغییر:** مبالغ (`price_paid`)، زمان سانس در Refund، و کارت مقصد عودت در لحظه قطعیت فریز می‌شوند تا تغییرات بعدی (قیمت سانس، تعویض کارت، حذف سانس) اسناد مالی قبلی را فاسد نکنند.
8. **تکمیل از زمان مشتق می‌شود** نه status ذخیره‌شده (`is_completed_at`) — بدون جاب همگام‌سازی.
9. **Lazy + sweeper:** هر ترنزیشن زمان‌محور (انقضا، ددلاین جایگزینی) هم داخل مسیرهای کاربر چک می‌شود و هم جاب هر دقیقه پاکسازی می‌کند؛ سویپر `skip_locked` دارد تا ورکرها مزاحم هم نشوند و ردیف‌های دارای payment زنده را دست نمی‌زند.
10. **قابلیت مشاهده:** هر ترنزیشن لاگ audit دارد؛ ادمین کش‌هایش بلافاصله باطل می‌شود؛ جاب reconciliation متریک موفق/شکست ثبت می‌کند.
