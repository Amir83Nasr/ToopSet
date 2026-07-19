# مستند فرایندهای رزرو و لغو

این سند رفتار فعلی کد را توضیح می‌دهد؛ یعنی آنچه در مدل‌ها، سرویس‌ها و endpointهای فعلی اجرا می‌شود، نه الزاماً چیزی که از نظر محصول ایده‌آل است.

فایل‌های اصلی مرتبط:

- `app/models/booking.py`
- `app/models/time_slot.py`
- `app/models/payment.py`
- `app/models/refund.py`
- `app/models/settlement.py`
- `app/models/slot_cancellation.py`
- `app/services/booking_service.py`
- `app/services/finance_service.py`
- `app/services/time_slot_service.py`
- `app/api/v1/bookings.py`
- `app/api/v1/manager.py`
- `app/api/v1/admin.py`

## موجودیت‌های اصلی

### `time_slots`

سانس قابل رزرو را نگه می‌دارد.

وضعیت‌های مهم:

- `open`: آزاد و قابل رزرو.
- `reserving`: موقتاً در اختیار یک رزرو در مرحله پرداخت است.
- `pending_cancellation`: رزرو قبلی توسط کاربر درخواست لغو داده و منتظر جایگزین است.
- `reserved`: رزرو قطعی شده است.
- `blocked`: توسط مدیر/سیستم مسدود شده است.
- `disabled`: غیرفعال است.
- `closed`: بسته است.

فیلد مهم:

- `is_reserved`: نشان می‌دهد سانس درگیر رزرو است. در `pending_cancellation` هم مقدار آن `true` می‌ماند، چون رزرو قبلی هنوز کاملاً بسته نشده است.

### `bookings`

رزرو کاربر یا رزرو دستی مدیر را نگه می‌دارد.

وضعیت‌های عملیاتی:

- `pending_payment`: رزرو ساخته شده ولی پرداخت کامل نشده است.
- `confirmed`: رزرو پرداخت‌شده/قطعی است.
- `pending_cancellation`: کاربر نزدیک زمان سانس درخواست لغو داده و سیستم منتظر رزرو جایگزین است.
- `transferred`: رزرو قبلی با رزرو جایگزین حل شده است.
- `cancelled`: رزرو لغو شده است.
- `expired`: مهلت پرداخت رزرو تمام شده است.

منبع رزرو:

- `online`: رزرو عمومی توسط کاربر.
- `manager_manual`: رزرو دستی توسط سالندار.

وضعیت تسویه:

- `not_settled`: قابل تسویه در آینده.
- `settlement_requested`: داخل درخواست تسویه مدیر قرار گرفته است.
- `included_in_settlement`: درخواست تسویه توسط ادمین تایید شده است.
- `settled`: با مدیر تسویه شده است.
- `excluded_due_to_refund`: به دلیل عودت از تسویه خارج شده است.
- `excluded_due_to_cancellation`: به دلیل لغو/انقضا/رزرو دستی از چرخه تسویه خارج شده است.

### `payments`

پرداخت‌های رزرو را نگه می‌دارد.

وضعیت‌ها:

- `pending`
- `success`
- `failed`
- `expired`

در کد فعلی پرداخت موفق در `pay_booking` ساخته می‌شود. شکست‌های پرداخت نیز با `status=failed` ثبت می‌شوند.

### `refunds`

درخواست‌های عودت وجه را نگه می‌دارد.

نوع‌ها:

- `user_cancellation`: لغو توسط کاربر، بیشتر از ۴۸ ساعت مانده به شروع سانس.
- `manager_cancellation`: لغو رزرو آنلاین پرداخت‌شده توسط سالندار.
- `replaced_after_pending_cancellation`: رزرو قبلی بعد از پیدا شدن جایگزین عودت می‌خورد.

وضعیت‌ها:

- `pending`: ساخته شده و منتظر ادمین است.
- `approved`: ادمین تایید کرده است.
- `rejected`: ادمین رد کرده است.
- `paid`: عودت پرداخت شده است.

### `penalties`

جریمه لغو کاربر را نگه می‌دارد. در جریان‌های فعلی، جریمه ۱۰٪ برای لغو کاربر یا جایگزینی ثبت می‌شود.

### `slot_cancellations`

گزارش لغو توسط سالندار را نگه می‌دارد. این جدول برای audit و بررسی ادمین استفاده می‌شود و شامل وضعیت SMS/notification و هزینه سایت است.

## رزرو توسط کاربر

مسیرها:

- `POST /api/v1/bookings`
- `POST /api/v1/bookings/{booking_id}/pay`

### مرحله ۱: ساخت رزرو

ورودی اصلی:

- `slot_id`
- `version`
- `participants_count`
- `with_ball`

فرایند:

1. سانس با lock خوانده می‌شود.
2. وجود vendor و فعال بودن آن بررسی می‌شود.
3. اگر سانس `closed`، `blocked` یا `disabled` باشد، درخواست رد می‌شود.
4. اگر زمان سانس گذشته باشد، درخواست رد می‌شود.
5. اگر سانس خارج از بازه عمومی ۱۴ روز آینده باشد، درخواست رد می‌شود.
6. اگر توپ درخواست شده ولی برای سانس فعال نباشد، درخواست رد می‌شود.
7. اگر `slot.is_reserved = true` باشد و وضعیت سانس `pending_cancellation` نباشد، درخواست رد می‌شود.
8. `version` سانس بررسی می‌شود تا stale UI رزرو نسازد.
9. ظرفیت vendor با `participants_count` بررسی می‌شود.
10. رزرو فعال قبلی برای سانس بررسی می‌شود.

حالت‌های مهم:

- اگر رزرو فعال قبلی وجود نداشته باشد، رزرو جدید عادی ساخته می‌شود.
- اگر رزرو فعال قبلی `pending_cancellation` باشد و متعلق به کاربر دیگری باشد، `booking` جدید ساخته نمی‌شود؛ یک `booking_hold` مرتبط با `replacement_request` ساخته می‌شود.
- اگر رزرو قبلی `pending_cancellation` متعلق به همین کاربر باشد، درخواست رد می‌شود.

تغییرات دیتابیس:

- در رزرو عادی یک رکورد `bookings` ساخته می‌شود:
  - `status = pending_payment`
  - `source = online`
  - `settlement_status = not_settled`
  - `expires_at = now + 10 minutes`
  - `replaces_booking_id = null`
- در حالت جایگزینی:
  - یک `replacement_requests` باز باید برای رزرو قبلی وجود داشته باشد.
  - یک `booking_holds` با `status=active` و مهلت حداکثر ۱۰ دقیقه ساخته می‌شود.
  - هم‌زمان فقط یک Hold با وضعیت `active/processing` برای سانس مجاز است.
  - تا قبل از پرداخت موفق هیچ رزرو دوم در جدول `bookings` وجود ندارد.
- سانس آپدیت می‌شود:
  - `time_slots.status = reserving`
  - `time_slots.is_reserved = true`
  - `version += 1`
- برای رزرو عادی notification مدیر و log `booking_created` ثبت می‌شود؛ برای جایگزینی log `replacement_hold_created` ثبت می‌شود.

### مرحله ۲: پرداخت رزرو عادی

فرایند:

1. رزرو با lock خوانده می‌شود.
2. مالکیت رزرو بررسی می‌شود.
3. رزرو باید `pending_payment` باشد.
4. اگر `expires_at` گذشته باشد:
   - رزرو `expired` می‌شود.
   - `settlement_status = excluded_due_to_cancellation`
   - سانس آزاد می‌شود: `open / is_reserved=false`
5. اگر سانس بسته/مسدود/غیرفعال باشد، درخواست رد می‌شود.
6. اگر سانس واقعاً توسط رزرو دیگری گرفته شده باشد، درخواست رد می‌شود.
7. پرداخت شبیه‌سازی می‌شود.

در پرداخت موفق:

- رکورد `payments` با `status=success` ساخته می‌شود.
- سانس قطعی می‌شود:
  - `time_slots.status = reserved`
  - `time_slots.is_reserved = true`
  - `version += 1`
- رزرو جدید قطعی می‌شود:
  - `bookings.status = confirmed`
- notification تایید رزرو برای کاربر ساخته می‌شود.
- audit log با action `booking_confirmed` ثبت می‌شود.

### مرحله ۳: پرداخت Hold جایگزینی

1. Hold، درخواست جایگزینی، رزرو قبلی و slot با قفل سطری بررسی می‌شوند.
2. Hold قبل از تماس درگاه به `processing` می‌رود و commit می‌شود تا قفل دیتابیس هنگام I/O خارجی نگه داشته نشود.
3. در پرداخت موفق، رزرو قبلی ابتدا `transferred` می‌شود تا قید «یک رزرو فعال برای هر سانس» آزاد شود.
4. رزرو جدید مستقیماً `confirmed` و payment آن `success` ساخته می‌شود.
5. refund و penalty بر اساس snapshot ثبت‌شده در `replacement_request` ایجاد می‌شوند.
6. request به `completed`، Hold به `paid` و slot به `reserved` می‌روند.
7. فراخوانی دوباره endpoint همان رزرو جدید را برمی‌گرداند و رکورد مالی تکراری نمی‌سازد.

اگر Hold بدون پرداخت منقضی یا لغو شود، request دوباره `open` و slot دوباره `pending_cancellation` می‌شود و رزرو قبلی تغییر نمی‌کند. Timeout نامطمئن درگاه در `processing` باقی می‌ماند تا دوباره فروشی رخ ندهد.

در پرداخت ناموفق:

- رکورد `payments` با `status=failed` ساخته می‌شود.
- notification خطای پرداخت برای کاربر ساخته می‌شود.
- audit log با action `payment_failed` ثبت می‌شود.
- رزرو همچنان `pending_payment` می‌ماند تا منقضی شود یا کاربر دوباره تلاش کند.

## لغو توسط کاربر

مسیرها:

- `GET /api/v1/bookings/{booking_id}/cancellation-terms`
- `POST /api/v1/bookings/{booking_id}/cancel`

### پیش‌نمایش شروط لغو

سرویس `get_cancellation_terms` وضعیت رزرو، زمان سانس و کارت بانکی تاییدشده را بررسی می‌کند.

حالت‌های خروجی:

- `already_cancelled`: رزرو قبلاً لغو/منتقل شده است.
- `already_pending_cancellation`: رزرو قبلاً وارد انتظار جایگزین شده است.
- `not_cancellable`: وضعیت رزرو قابل لغو نیست.
- `started`: زمان سانس گذشته یا شروع شده است.
- `pending_payment`: رزرو پرداخت نشده است و می‌تواند بدون عودت لغو شود.
- `pending_replacement`: ۴۸ ساعت یا کمتر تا شروع سانس مانده است.
- `refund_with_penalty`: بیشتر از ۴۸ ساعت تا شروع سانس مانده است.

### لغو رزرو پرداخت‌نشده

شرط:

- `booking.status = pending_payment`

فرایند:

1. رزرو `cancelled` می‌شود.
2. `settlement_status = excluded_due_to_cancellation`
3. اگر سانس در وضعیت `reserving` باشد:
   - اگر رزرو جایگزین نباشد، سانس `open / is_reserved=false` می‌شود.
   - اگر رزرو جایگزین باشد و رزرو قبلی هنوز `pending_cancellation` باشد، سانس به `pending_cancellation / is_reserved=true` برمی‌گردد.

در این حالت refund و penalty ساخته نمی‌شود.

### لغو رزرو قطعی بیشتر از ۴۸ ساعت قبل از شروع

شرط‌ها:

- `booking.status = confirmed`
- زمان شروع سانس در آینده است.
- بیشتر از ۴۸ ساعت تا شروع سانس باقی مانده است.
- کاربر شروط لغو را تایید کرده باشد: `accepted_terms=true`
- کاربر کارت بانکی تاییدشده داشته باشد یا در درخواست شماره کارت معتبر بدهد.

فرایند:

1. جریمه ۱۰٪ محاسبه می‌شود.
2. مبلغ عودت = مبلغ پرداختی - جریمه.
3. رکورد `penalties` ساخته می‌شود.
4. audit log با action `penalty_created` ثبت می‌شود.
5. رزرو آپدیت می‌شود:
   - `status = cancelled`
   - `penalty_amount = 10%`
   - `settlement_status = excluded_due_to_refund`
6. سانس آزاد می‌شود:
   - `time_slots.status = open`
   - `time_slots.is_reserved = false`
   - `version += 1`
7. رکورد `refunds` ساخته می‌شود:
   - `type = user_cancellation`
   - `status = pending`
   - `penalty_charged_to_user = true`
   - `site_bears_penalty = false`
8. audit log با action `refund_created` ثبت می‌شود.
9. notification برای مدیر vendor ساخته می‌شود.
10. audit log با action `booking_cancelled` ثبت می‌شود.

نتیجه برای کاربران دیگر:

- سانس به صورت آزاد نمایش داده و قابل رزرو می‌شود.

### لغو رزرو قطعی ۴۸ ساعت یا کمتر قبل از شروع

شرط‌ها:

- `booking.status = confirmed`
- زمان شروع سانس در آینده است.
- ۴۸ ساعت یا کمتر تا شروع سانس باقی مانده است.
- کاربر شروط لغو را تایید کرده باشد.
- کارت بانکی تاییدشده وجود داشته باشد یا شماره کارت در درخواست ثبت شود.

فرایند:

1. رزرو آپدیت می‌شود:
   - `status = pending_cancellation`
   - `penalty_amount = null`
2. سانس آپدیت می‌شود:
   - `time_slots.status = pending_cancellation`
   - `time_slots.is_reserved = true`
   - `version += 1`

در این لحظه refund و penalty ساخته نمی‌شود.

نتیجه برای کاربران دیگر:

- در UI عمومی، این سانس مثل «آزاد» نمایش داده می‌شود.
- در بک‌اند، رزرو کاربر جدید با `replaces_booking_id` به رزرو قبلی وصل می‌شود.
- عودت و جریمه کاربر قبلی فقط زمانی ساخته می‌شود که کاربر جدید پرداخت موفق انجام دهد.

اگر هیچ جایگزینی پیدا نشود:

- در کد فعلی job جداگانه‌ای برای بستن نهایی این حالت دیده نمی‌شود.
- رزرو قبلی در `pending_cancellation` باقی می‌ماند مگر جریان دیگری آن را تغییر دهد.

## رزرو توسط سالندار

مسیرها:

- `POST /api/v1/manager/bookings`
- `POST /api/v1/manager/bookings/recurring`

### رزرو دستی تکی

شرط‌ها:

- کاربر فعلی manager یا admin باشد.
- vendor متعلق به manager باشد، مگر اینکه کاربر admin باشد.
- vendor فعال باشد.
- ظرفیت رعایت شود.
- سانس `open` و `is_reserved=false` باشد.
- رزرو فعال دیگری برای سانس وجود نداشته باشد.

فرایند:

1. اگر مشتری با شماره تلفن وجود نداشته باشد، یک کاربر OTP ساخته می‌شود.
2. رکورد `bookings` ساخته می‌شود:
   - `status = confirmed`
   - `source = manager_manual`
   - `settlement_status = excluded_due_to_cancellation`
   - `created_by_manager_id = current_user.id`
   - `price_paid = 0`
   - `slot_price = slot.base_price`
   - `ball_price = 0`
3. سانس قطعی می‌شود:
   - `time_slots.status = reserved`
   - `time_slots.is_reserved = true`

نکته مالی:

- چون پولی از درگاه سایت گرفته نشده، این رزرو وارد تسویه آنلاین نمی‌شود.

### رزرو تکرارشونده

فرایند:

1. vendor و مالکیت بررسی می‌شود.
2. بازه تاریخ و حداکثر ۶ ماه بودن آن بررسی می‌شود.
3. روزهای هفته و ساعت‌های هدف به سانس‌های موجود match می‌شوند.
4. اگر سانس وجود نداشته باشد یا آزاد نباشد، conflict ثبت می‌شود.
5. اگر `allow_partial=false` و conflict وجود داشته باشد، کل درخواست رد می‌شود.
6. برای سانس‌های معتبر، همان فرایند رزرو دستی تکی اجرا می‌شود.

نتیجه:

- رزروهای ساخته‌شده `source=manager_manual` دارند.
- از نظر مالی مثل رزرو دستی هستند و وارد تسویه آنلاین نمی‌شوند.

## لغو توسط سالندار

مسیر:

- `POST /api/v1/manager/bookings/{booking_id}/cancel`

ورودی:

- `reason`
- `release_slot`

شرط‌ها:

- booking وجود داشته باشد.
- slot وجود داشته باشد.
- slot متعلق به vendor مدیر باشد، مگر اینکه کاربر admin باشد.
- رزرو قبلاً `cancelled`، `transferred` یا `expired` نباشد.

### لغو رزرو آنلاین پرداخت‌شده توسط سالندار

شرط:

- `booking.source = online`
- payment موفق برای booking وجود داشته باشد.
- `booking.status = confirmed`

فرایند:

1. رکورد `refunds` ساخته می‌شود:
   - `type = manager_cancellation`
   - `status = pending`
   - `penalty_amount = 0`
   - `refund_amount = booking.price_paid`
   - `penalty_charged_to_user = false`
   - `site_bears_penalty = true`
2. `booking.settlement_status = excluded_due_to_refund`
3. `booking.status = cancelled`
4. اگر `release_slot=true`:
   - سانس `open / is_reserved=false` می‌شود.
5. اگر `release_slot=false`:
   - سانس `blocked / is_reserved=false` می‌شود.
6. notification برای کاربر ساخته می‌شود.
7. SMS delivery record ساخته می‌شود و ارسال SMS تلاش می‌شود.
8. رکورد `slot_cancellations` ساخته می‌شود:
   - `online_paid_amount = booking.price_paid`
   - `site_cost_amount = booking.price_paid`
   - `review_status = pending`
   - وضعیت SMS/notification ثبت می‌شود.

اثر مالی:

- عودت کامل برای کاربر ساخته می‌شود.
- هزینه این لغو روی سایت/سیستم ثبت می‌شود، نه کاربر.
- رزرو از تسویه مدیر خارج می‌شود.

### لغو رزرو دستی یا رزرو بدون پرداخت آنلاین

فرایند:

1. `booking.settlement_status = excluded_due_to_cancellation`
2. `booking.status = cancelled`
3. اگر `release_slot=true`:
   - سانس `open / is_reserved=false` می‌شود.
4. اگر `release_slot=false`:
   - سانس `blocked / is_reserved=false` می‌شود.
5. notification/SMS مثل حالت قبل انجام می‌شود.
6. رکورد `slot_cancellations` ساخته می‌شود.

اثر مالی:

- refund ساخته نمی‌شود، چون پرداخت آنلاین موفقی وجود ندارد.
- `site_cost_amount = 0`

## نقش ادمین

ادمین در کد فعلی چند نقش جدا دارد.

### مدیریت سانس‌ها

در `TimeSlotService` ادمین مثل مدیر مجاز است vendor را مدیریت کند.

ادمین می‌تواند:

- سانس بسازد.
- سانس را ویرایش کند.
- سانس را حذف کند.
- وضعیت سانس را تغییر دهد.

محدودیت‌ها:

- سانس رزروشده (`is_reserved=true`) قابل ویرایش یا حذف نیست.
- اگر status به `reserved` یا `reserving` تغییر کند، `is_reserved=true` می‌شود.
- اگر status به `open`، `closed`، `blocked` یا `disabled` تغییر کند، `is_reserved=false` می‌شود.

### لغو رزرو از مسیر عمومی booking

مسیر admin bookings در فرانت فعلی از این endpoint استفاده می‌کند:

- `POST /api/v1/bookings/{booking_id}/cancel`

در بک‌اند، همین متد `BookingService.cancel_booking` اجرا می‌شود. چون `_get_owned_booking_for_cancel` برای admin اجازه دسترسی می‌دهد، ادمین می‌تواند booking دیگران را بخواند و وارد مسیر لغو کند.

اما محدودیت مهم فعلی:

- برای رزرو قطعی، این مسیر همان قوانین لغو کاربر را اعمال می‌کند.
- اگر `accepted_terms=true` ارسال نشود، با خطای ۴۰۰ رد می‌شود.
- اگر کارت بانکی لازم باشد، چک کارت بانکی روی `current_user` انجام می‌شود؛ یعنی برای ادمین رفتار ایده‌آل/اختصاصی ندارد.

نتیجه:

- در کد فعلی «لغو ادمین» به عنوان فرایند مستقل و تمیز پیاده‌سازی نشده است.
- برای لغو عملیاتی توسط مجموعه/ادمین، مسیر بهتر و کامل‌تر همان `manager/bookings/{id}/cancel` است که در `FinanceService.cancel_booking_by_manager` قرار دارد.

### بررسی عودت‌ها

مسیر:

- `PATCH /api/v1/admin/refunds/{refund_id}`

فرایند:

1. refund با lock خوانده می‌شود.
2. `status` آپدیت می‌شود.
3. `admin_note` ثبت می‌شود.
4. اگر `payment_tracking_code` ارسال شود، ثبت می‌شود.
5. اگر status برابر `approved` شود:
   - `approved_at = now`
6. اگر status برابر `paid` شود:
   - اگر `approved_at` خالی باشد، مقدار می‌گیرد.
   - `paid_at = now`
7. audit log با action `refund_status_updated` ثبت می‌شود.

نکته:

- پرداخت واقعی بانکی در کد انجام نمی‌شود؛ فقط وضعیت و کد رهگیری ثبت می‌شود.
- کارت مقصد در زمان ایجاد Refund به‌صورت رمز‌شده و ۴+۴ mask‌شده snapshot می‌شود.
- Admin برای واریز دستی از مسیر audit‌شده نمایش مقصد استفاده می‌کند؛ برای ثبت `paid` وجود کارت مقصد و کد رهگیری الزامی است.
- User وضعیت Refund را از `GET /api/v1/refunds/my` و کنار رزرو لغوشده می‌بیند.

### بررسی تسویه‌ها

مسیرها:

- `GET /api/v1/admin/settlements`
- `PATCH /api/v1/admin/settlements/{settlement_id}`

فرایند تغییر وضعیت:

- `approved`:
  - `settlement.approved_at = now`
  - `approved_amount` ثبت می‌شود یا برابر `requested_amount` قرار می‌گیرد.
  - رزروهای داخل settlement به `included_in_settlement` می‌روند.
- `paid`:
  - `paid_at = now`
  - اگر `approved_at` خالی باشد، ثبت می‌شود.
  - رزروهای داخل settlement به `settled` می‌روند.
- `rejected`:
  - رزروهای داخل settlement دوباره `not_settled` می‌شوند.

## تسویه رزروهای آنلاین

مسیرهای مدیر:

- `GET /api/v1/manager/finance/summary`
- `POST /api/v1/manager/settlements`
- `GET /api/v1/manager/settlements`

رزرو فقط وقتی قابل تسویه است که:

- `source = online`
- `status = confirmed`
- `settlement_status = not_settled`
- payment موفق داشته باشد.
- `time_slots.end_time <= now`

وقتی مدیر درخواست تسویه می‌زند:

1. bookingهای eligible با lock پیدا می‌شوند.
2. رکورد `settlements` ساخته می‌شود:
   - `status = pending`
   - `requested_amount = sum(price_paid)`
   - `bookings_count = count(bookings)`
3. برای هر booking رکورد `settlement_items` ساخته می‌شود.
4. هر booking به `settlement_requested` می‌رود.

## خلاصه state machine رزرو

### رزرو آنلاین عادی

```text
open slot
  -> create booking
booking: pending_payment
slot: reserving / is_reserved=true
  -> pay success
booking: confirmed
slot: reserved / is_reserved=true
  -> slot ends
booking: confirmed
settlement_status: not_settled
  -> manager settlement request
settlement_status: settlement_requested
  -> admin approve
settlement_status: included_in_settlement
  -> admin paid
settlement_status: settled
```

### رزرو آنلاین با انقضای پرداخت

```text
booking: pending_payment
slot: reserving
  -> payment window expired
booking: expired
settlement_status: excluded_due_to_cancellation
slot: open / is_reserved=false
```

اگر رزرو pending payment از نوع جایگزین باشد:

```text
replacement booking: expired
old booking: pending_cancellation
slot: pending_cancellation / is_reserved=true
```

### لغو کاربر بیشتر از ۴۸ ساعت قبل

```text
booking: confirmed
slot: reserved
  -> user cancel
booking: cancelled
settlement_status: excluded_due_to_refund
slot: open / is_reserved=false
refund: pending / user_cancellation
penalty: 10%
```

### لغو کاربر ۴۸ ساعت یا کمتر قبل

```text
booking: confirmed
slot: reserved
  -> user cancel
booking: pending_cancellation
slot: pending_cancellation / is_reserved=true
  -> another user creates a booking_hold
slot: reserving / is_reserved=true
  -> replacement hold pays successfully
old booking: transferred
new booking: confirmed
slot: reserved / is_reserved=true
refund: pending / replaced_after_pending_cancellation
penalty: 10%
```

اگر تا deadline جایگزین قطعی پیدا نشود:

```text
replacement_request: expired
booking: confirmed
slot: reserved / is_reserved=true
refund: none
penalty: none
```

در این حالت رزرو و حق استفاده از سانس همچنان متعلق به کاربر اول است.

### لغو توسط سالندار با آزادسازی

```text
booking: confirmed
slot: reserved
  -> manager cancel release_slot=true
booking: cancelled
slot: open / is_reserved=false
slot_cancellations: pending review
refund: pending if online paid
```

### لغو توسط سالندار بدون آزادسازی

```text
booking: confirmed
slot: reserved
  -> manager cancel release_slot=false
booking: cancelled
slot: blocked / is_reserved=false
slot_cancellations: pending review
refund: pending if online paid
```

### رزرو دستی سالندار

```text
slot: open
  -> manager manual booking
booking: confirmed
source: manager_manual
price_paid: 0
settlement_status: excluded_due_to_cancellation
slot: reserved / is_reserved=true
```

## نکات و ریسک‌های فعلی

1. لغو ادمین فرایند اختصاصی ندارد و از مسیر لغو کاربر استفاده می‌کند.
2. اگر رزرو در `pending_cancellation` بماند و جایگزین پیدا نشود، در کد فعلی job مشخصی برای نهایی‌سازی آن دیده نمی‌شود.
3. UI عمومی سانس `pending_cancellation` را مثل آزاد نشان می‌دهد، ولی بک‌اند همچنان آن را به عنوان رزرو جایگزین ثبت می‌کند.
4. پرداخت واقعی و عودت واقعی بانکی در کد شبیه‌سازی/ثبت وضعیت است؛ انتقال پول واقعی انجام نمی‌شود.
5. پرداخت ناموفق رزرو را بلافاصله آزاد نمی‌کند؛ رزرو تا retry یا انقضای پنجره پرداخت در `pending_payment` می‌ماند.
