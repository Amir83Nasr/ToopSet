# راهنمای جامع چرخه رزرو، پرداخت، لغو و تسویه

این سند رفتار فعلی سیستم رزرو توپ‌ست را بر اساس پیاده‌سازی موجود توضیح می‌دهد.
هدف آن این است که تیم محصول، ادمین، توسعه‌دهنده و پشتیبانی برداشت یکسانی از وضعیت
هر رزرو، آثار مالی آن و ایرادهای شناخته‌شده داشته باشند.

> تاریخ بازبینی: ۱۴۰۵/۰۵/۱۲
> محدوده: `Booking`، `TimeSlot`، `Payment`، `Refund`، جایگزینی و تسویه وندور

## ۱. تصویر کلی دامنه

یک «رزرو» فقط یک وضعیت ندارد. برای فهم وضعیت واقعی آن باید حداقل این داده‌ها کنار
هم بررسی شوند:

```text
Booking.status
Booking.source
Booking.settlement_status
Payment.status
TimeSlot.start_time / TimeSlot.end_time
```

موجودیت‌های اصلی و ارتباط آن‌ها:

```text
User ──< Booking >── TimeSlot >── Vendor
             │
             ├──< Payment
             ├──< Refund
             ├──< Penalty
             ├── SettlementItem >── Settlement
             └── ReplacementRequest / BookingHold
```

- `Booking` مالکیت و وضعیت عملیاتی رزرو را نگه می‌دارد.
- `TimeSlot` زمان، قیمت پایه و وضعیت اشغال سانس را نگه می‌دارد.
- `Payment` تلاش‌ها و نتیجه پرداخت درگاه را نگه می‌دارد.
- `Refund` بازپرداخت پول مشتری را نگه می‌دارد.
- `Penalty` جریمه لغو را نگه می‌دارد.
- `Settlement` درخواست پرداخت سهم وندور را نگه می‌دارد.

منبع اصلی مدل رزرو: [`backend/app/models/booking.py`](../backend/app/models/booking.py)

## ۲. فیلدهای Booking

### ۲.۱. شناسه‌ها و ارتباطات

| فیلد                    | نوع مفهومی | کاربرد                                   |
| ----------------------- | ---------- | ---------------------------------------- |
| `id`                    | عدد        | شناسه یکتای رزرو                         |
| `user_id`               | FK         | کاربری که رزرو به نام اوست               |
| `slot_id`               | FK         | سانس مربوط به رزرو                       |
| `replaces_booking_id`   | FK اختیاری | رزرو قبلی که این رزرو جایگزین آن شده است |
| `created_by_manager_id` | FK اختیاری | مدیر ایجادکننده رزرو دستی                |

`replaces_booking_id` به معنای تغییر مالک رکورد قبلی نیست. در جایگزینی، رکورد قبلی
`transferred` می‌شود و یک Booking جدید برای مشتری جایگزین ساخته می‌شود.

### ۲.۲. وضعیت‌ها

| فیلد                | مقادیر اصلی                                                                                   | کاربرد                        |
| ------------------- | --------------------------------------------------------------------------------------------- | ----------------------------- |
| `status`            | `pending_payment`, `confirmed`, `pending_cancellation`, `transferred`, `cancelled`, `expired` | وضعیت عملیاتی رزرو            |
| `source`            | `online`, `manager_manual`                                                                    | منبع ایجاد رزرو               |
| `settlement_status` | وضعیت‌های تسویه                                                                               | وضعیت مالی رزرو نسبت به وندور |

`status` و `settlement_status` مستقل‌اند. برای مثال یک رزرو می‌تواند هم‌زمان:

```json
{
  "status": "confirmed",
  "settlement_status": "settlement_requested"
}
```

باشد؛ یعنی رزرو از نظر عملیاتی قطعی و از نظر مالی داخل درخواست تسویه است.

### ۲.۳. اطلاعات مشتری

| فیلد                 | کاربرد                   |
| -------------------- | ------------------------ |
| `customer_full_name` | نام مشتری در رزرو دستی   |
| `customer_phone`     | شماره مشتری در رزرو دستی |

در رزرو آنلاین، اطلاعات اصلی مشتری از رابطه `Booking.user` خوانده می‌شود. در رزرو
دستی، مدیر ممکن است اطلاعات شخصی را در همین دو فیلد ثبت کند.

### ۲.۴. اطلاعات مالی

| فیلد             | کاربرد                                     |
| ---------------- | ------------------------------------------ |
| `price_paid`     | مبلغ کل رزرو؛ قیمت سانس به‌علاوه هزینه توپ |
| `slot_price`     | snapshot قیمت سانس هنگام رزرو              |
| `ball_price`     | snapshot هزینه توپ هنگام رزرو              |
| `with_ball`      | آیا توپ انتخاب شده است                     |
| `penalty_amount` | جریمه نهایی‌شده لغو، در صورت وجود          |

رابطه مورد انتظار مبالغ:

```text
price_paid = slot_price + ball_price
```

وجود مقدار در `price_paid` به‌تنهایی اثبات نمی‌کند پول دریافت شده است. پرداخت واقعی
باید از وجود `Payment.status = success` احراز شود.

### ۲.۵. سایر فیلدها

| فیلد         | کاربرد                        |
| ------------ | ----------------------------- |
| `created_at` | زمان ایجاد رزرو               |
| `updated_at` | زمان آخرین تغییر              |
| `expires_at` | پایان مهلت پرداخت رزرو آنلاین |

## ۳. چرخه وضعیت عملیاتی رزرو

```mermaid
stateDiagram-v2
    [*] --> pending_payment: ایجاد رزرو آنلاین
    pending_payment --> confirmed: پرداخت موفق
    pending_payment --> cancelled: انصراف پیش از پرداخت
    pending_payment --> expired: پایان مهلت پرداخت

    confirmed --> cancelled: لغو مجاز
    confirmed --> pending_cancellation: لغو در ۴۸ ساعت پایانی
    pending_cancellation --> confirmed: انصراف از لغو یا نبود جایگزین
    pending_cancellation --> transferred: پرداخت موفق مشتری جایگزین
    pending_cancellation --> cancelled: لغو توسط مدیر پیش از شروع سانس

    transferred --> [*]
    cancelled --> [*]
    expired --> [*]
```

رزرو دستی مستقیماً با وضعیت `confirmed` ساخته می‌شود و مرحله پرداخت آنلاین ندارد.

### ۳.۱. `pending_payment`

رزرو آنلاین ایجاد شده ولی پرداخت نهایی نشده است.

```json
{
  "status": "pending_payment",
  "source": "online",
  "settlement_status": "not_settled",
  "expires_at": "حدود ۱۰ دقیقه بعد از ایجاد"
}
```

رفتار مورد انتظار:

- سانس موقتاً `reserving` و رزروشده می‌شود.
- تنها صاحب رزرو اجازه پرداخت دارد.
- پرداخت موفق، Booking را `confirmed` می‌کند.
- اتمام مهلت، Booking را `expired` و سانس را آزاد می‌کند.
- لغو پیش از پرداخت، Booking را `cancelled` می‌کند و Refund ندارد.
- این وضعیت هرگز قابل تسویه با وندور نیست.

### ۳.۲. `confirmed`

رزرو قطعی و فعال است.

#### رزرو آنلاین

```json
{
  "status": "confirmed",
  "source": "online",
  "settlement_status": "not_settled"
}
```

رزرو آنلاین قطعی در حالت سالم باید یک Payment موفق داشته باشد. پیش از پایان سانس
قابل تسویه نیست و پس از پایان سانس، در صورت برقرار بودن سایر شروط، قابل تسویه می‌شود.

#### رزرو دستی مدیر

```json
{
  "status": "confirmed",
  "source": "manager_manual",
  "settlement_status": "excluded_due_to_cancellation",
  "created_by_manager_id": 42,
  "price_paid": 0
}
```

رزرو دستی پرداخت آنلاین ندارد و وارد تسویه سایت با وندور نمی‌شود. سیستم فعلی مبلغ
پرداخت حضوری را ثبت نمی‌کند.

### ۳.۳. `pending_cancellation`

اگر مشتری در بازه ۴۸ ساعت پایانی درخواست لغو دهد، رزرو بلافاصله لغو و Refund نمی‌شود؛
بلکه وارد فرایند یافتن جایگزین می‌شود.

```json
{
  "status": "pending_cancellation",
  "source": "online",
  "settlement_status": "not_settled",
  "penalty_amount": null
}
```

- مالکیت رزرو هنوز متعلق به مشتری قبلی است.
- سانس آزاد نیست.
- Refund قطعی هنوز ساخته نشده است.
- این رزرو قابل تسویه نیست.
- مشتری می‌تواند درخواست لغو باز را پس بگیرد.
- اگر جایگزین پیدا نشود، رزرو دوباره `confirmed` می‌شود.

### ۳.۴. `transferred`

با پرداخت موفق مشتری جایگزین:

- Booking قبلی `transferred` می‌شود.
- Booking قبلی از تسویه خارج می‌شود.
- جریمه و Refund مشتری قبلی ثبت می‌شود.
- Booking جدید با `replaces_booking_id` ساخته می‌شود.
- Booking جدید `confirmed` و بعد از پایان سانس قابل تسویه است.

رکورد قبلی:

```json
{
  "status": "transferred",
  "settlement_status": "excluded_due_to_refund",
  "penalty_amount": 50000
}
```

رکورد جدید:

```json
{
  "status": "confirmed",
  "source": "online",
  "settlement_status": "not_settled",
  "replaces_booking_id": 123
}
```

### ۳.۵. `cancelled`

رزرو دیگر فعال نیست. آثار مالی آن به علت و زمان لغو وابسته است.

#### لغو رزرو پرداخت‌نشده

```json
{
  "status": "cancelled",
  "settlement_status": "excluded_due_to_cancellation",
  "penalty_amount": null
}
```

Refund ندارد، چون پرداخت موفقی وجود نداشته است.

#### لغو زودهنگام توسط مشتری

در لغو بیش از ۴۸ ساعت مانده به شروع سانس:

```text
penalty_amount = price_paid × ۱۰٪
refund_amount = price_paid - penalty_amount
```

Booking به `cancelled / excluded_due_to_refund` می‌رود و Refund جداگانه ساخته می‌شود.

#### لغو توسط مدیر مجموعه

لغو مدیر برای رزرو آنلاین پرداخت‌شده:

- فقط پیش از شروع سانس مجاز است.
- کل `price_paid` برای Refund ثبت می‌شود.
- مشتری جریمه نمی‌شود.
- هزینه مالی لغو بر عهده سایت ثبت می‌شود.
- Booking از تسویه وندور خارج می‌شود.

### ۳.۶. `expired`

مهلت پرداخت رزرو تمام شده است.

```json
{
  "status": "expired",
  "source": "online",
  "settlement_status": "excluded_due_to_cancellation"
}
```

- سانس آزاد می‌شود.
- Refund ساخته نمی‌شود.
- رزرو قابل پرداخت، لغو یا تسویه نیست.

## ۴. چرخه وضعیت تسویه Booking

مقادیر `settlement_status`:

| وضعیت                          | معنی                                             |
| ------------------------------ | ------------------------------------------------ |
| `not_settled`                  | هنوز وارد درخواست تسویه نشده است                 |
| `settlement_requested`         | داخل درخواست تسویه pending قرار دارد             |
| `included_in_settlement`       | درخواست توسط ادمین تأیید شده ولی پرداخت نشده است |
| `settled`                      | تسویه به‌عنوان پرداخت‌شده ثبت شده است            |
| `excluded_due_to_refund`       | به علت Refund یا انتقال از تسویه خارج است        |
| `excluded_due_to_cancellation` | بدون بدهی قابل تسویه از چرخه خارج است            |

چرخه عادی:

```mermaid
stateDiagram-v2
    [*] --> not_settled
    not_settled --> settlement_requested: ثبت درخواست وندور
    settlement_requested --> included_in_settlement: تأیید ادمین
    included_in_settlement --> settled: ثبت پرداخت و کد رهگیری
    settlement_requested --> not_settled: رد درخواست

    not_settled --> excluded_due_to_refund: لغو یا انتقال با Refund
    not_settled --> excluded_due_to_cancellation: لغو بدون پرداخت یا رزرو دستی
```

## ۵. شروط دقیق قابل تسویه بودن یک رزرو

تمام شروط زیر باید هم‌زمان برقرار باشند:

```text
Booking.source == online
Booking.status == confirmed
Booking.settlement_status == not_settled
Payment.status == success
TimeSlot.end_time <= now
TimeSlot.vendor_id == vendor مورد درخواست
```

اگر بازه تسویه ارسال شود، در پیاده‌سازی فعلی بازه روی `Booking.created_at` اعمال می‌شود،
نه تاریخ برگزاری سانس.

رزروهای زیر قابل تسویه نیستند:

- رزرو دستی مدیر؛
- رزرو منتظر پرداخت؛
- رزرو بدون Payment موفق؛
- رزرو منقضی، لغوشده یا منتقل‌شده؛
- رزرو منتظر جایگزین؛
- سانسی که هنوز پایان نیافته است؛
- رزروی که در درخواست تسویه دیگری قرار دارد؛
- رزروی که قبلاً تسویه شده است؛
- رزروی که به علت Refund از تسویه خارج شده است.

## ۶. جدول ترکیب‌های مهم و معتبر

| `status`               | `source`         | `settlement_status`            | تفسیر                              |
| ---------------------- | ---------------- | ------------------------------ | ---------------------------------- |
| `pending_payment`      | `online`         | `not_settled`                  | منتظر پرداخت                       |
| `confirmed`            | `online`         | `not_settled`                  | قطعی؛ بعد از پایان سانس قابل تسویه |
| `confirmed`            | `online`         | `settlement_requested`         | درخواست تسویه ثبت شده              |
| `confirmed`            | `online`         | `included_in_settlement`       | تأییدشده و منتظر پرداخت وندور      |
| `confirmed`            | `online`         | `settled`                      | رزرو برگزار و تسویه شده            |
| `confirmed`            | `manager_manual` | `excluded_due_to_cancellation` | رزرو دستی و خارج از تسویه          |
| `pending_cancellation` | `online`         | `not_settled`                  | منتظر مشتری جایگزین                |
| `transferred`          | `online`         | `excluded_due_to_refund`       | رزرو مشتری قبلی منتقل شده است      |
| `cancelled`            | `online`         | `excluded_due_to_refund`       | لغو همراه با بازپرداخت             |
| `cancelled`            | `online`         | `excluded_due_to_cancellation` | لغو بدون پرداخت موفق               |
| `expired`              | `online`         | `excluded_due_to_cancellation` | پایان مهلت پرداخت                  |

## ۷. قواعد و invariantهای حیاتی

این قواعد باید در بک‌اند تضمین شوند و UI فقط بازتاب آن‌ها باشد:

۱. برای هر سانس حداکثر یک Booking فعال مجاز است. وضعیت‌های فعال عبارت‌اند از:
`pending_payment`، `confirmed` و `pending_cancellation`.

۲. هر کاربر حداکثر یک Booking با وضعیت `pending_payment` می‌تواند داشته باشد.

۳. برای هر Booking حداکثر یک Payment موفق مجاز است.

۴. سانسی که شروع شده یا گذشته است، نه توسط کاربر و نه توسط مدیر قابل لغو نیست.

۵. مبلغ پرداخت موفق باید با مبلغ مورد انتظار Booking تطابق داشته باشد.

۶. Booking فاقد Payment موفق نباید وارد تسویه شود.

۷. Booking لغوشده، منتقل‌شده یا Refundشده نباید به `settled` برسد.

۸. تغییر Booking، Refund و Settlement مرتبط باید اتمیک و در یک تراکنش باشد.

۹. وضعیت `paid` باید نهایی و غیرقابل بازگشت باشد؛ اصلاح آن باید از مسیر عملیات مالی
جبرانی و auditشده انجام شود.

## ۸. باگ‌ها و شکاف‌های شناخته‌شده

### ۸.۱. بحرانی: درخواست مجدد پس از رد تسویه شکست می‌خورد

**وضعیت:** باز
**بخش:** `SettlementItem`

با رد درخواست، Booking دوباره `not_settled` می‌شود؛ بنابراین ظاهراً باید قابل درخواست
مجدد باشد. اما روی `SettlementItem.booking_id` محدودیت یکتایی دائمی وجود دارد. ساخت
درخواست دوم برای همان Booking با خطای دیتابیس شکست می‌خورد.

**راهکار پیشنهادی:**

- یا هنگام Reject آیتم قبلی حذف/باطل شود؛
- یا محدودیت یکتا به یک قاعده شرطی برای درخواست‌های فعال تبدیل شود؛
- یا مدل آیتم دارای وضعیت و سابقه چندباره باشد و یکتایی دائمی حذف شود.

راهکار سوم برای audit مالی مناسب‌تر است.

### ۸.۲. بحرانی: تسویه جزئی با وضعیت آیتم‌ها سازگار نیست

**وضعیت:** باز

ادمین می‌تواند `approved_amount` را کمتر از `requested_amount` ثبت کند، اما سیستم مشخص
نمی‌کند کدام Bookingها یا چه سهمی از هر Booking تأیید شده‌اند. هنگام `paid` شدن، تمام
Bookingهای درخواست `settled` می‌شوند و داشبورد مبلغ کامل آن‌ها را تسویه‌شده می‌شمارد.

**راهکار پیشنهادی:** یکی از دو سیاست باید صریح انتخاب شود:

- تسویه فقط به صورت کامل؛ در این صورت `approved_amount` باید دقیقاً برابر مبلغ درخواست باشد؛
- تسویه جزئی؛ در این صورت مبلغ تأییدشده باید در سطح هر `SettlementItem` ثبت شود و فقط
  آیتم‌های کامل تسویه‌شده به `settled` بروند.

### ۸.۳. بحرانی: پنل ادمین امکان ثبت `paid` ندارد

**وضعیت:** باز

بک‌اند برای paid شدن، `payment_tracking_code` می‌خواهد؛ اما صفحه ادمین فقط فیلد
`status` را ارسال می‌کند. بنابراین انتخاب «پرداخت شده» در UI خطا می‌دهد.

**راهکار پیشنهادی:** دیالوگ پرداخت شامل مبلغ نهایی، مقصد بانکی، کد رهگیری، تاریخ پرداخت
و تأیید نهایی اضافه شود.

### ۸.۴. بحرانی: مقصد بانکی وندور در Settlement وجود ندارد

**وضعیت:** باز

سیستم برای Settlement شماره کارت/شبا، نام صاحب حساب و snapshot مقصد پرداخت ندارد.
در نتیجه ادمین از خود درخواست تسویه نمی‌فهمد مبلغ را به چه حسابی منتقل کند و تغییر
بعدی حساب وندور نیز می‌تواند سابقه را مبهم کند.

**راهکار پیشنهادی:** حساب بانکی تأییدشده وندور اضافه و هنگام ایجاد Settlement به صورت
immutable snapshot ذخیره شود.

### ۸.۵. مهم: کمیسیون در مبلغ تسویه اعمال نمی‌شود

**وضعیت:** باز

تنظیم `commission_percent` وجود دارد، ولی مبلغ درخواست برابر مجموع کامل `price_paid`
است. کارمزد درگاه و کمیسیون سایت کسر یا snapshot نمی‌شوند.

**راهکار پیشنهادی:** در زمان قطعی شدن پرداخت، اجزای زیر snapshot شوند:

```text
gross_amount
commission_percent
commission_amount
gateway_fee
vendor_net_amount
```

Settlement باید بر اساس `vendor_net_amount` ساخته شود، نه تنظیم قابل تغییر زمان تسویه.

### ۸.۶. مهم: خلاصه مالی با شرط واقعی تسویه یکسان نیست

**وضعیت:** باز

خلاصه مالی برای نمایش «قابل تسویه» بودن، وجود Payment موفق را بررسی نمی‌کند؛ اما ساخت
درخواست تسویه آن را اجباری می‌داند. بنابراین ممکن است UI مبلغی قابل تسویه نمایش دهد
ولی API درخواست را رد کند.

**راهکار پیشنهادی:** eligibility در یک query/helper واحد تعریف و هم برای summary و هم
برای ساخت درخواست استفاده شود.

### ۸.۷. مهم: رزروهای تسویه تأییدشده از آمار در جریان ناپدید می‌شوند

**وضعیت:** باز

بعد از تأیید ادمین، Booking به `included_in_settlement` می‌رود؛ ولی خلاصه مالی فقط
`settlement_requested` را در «در جریان تسویه» جمع می‌کند. مبلغ درخواست approved اما
پرداخت‌نشده در کارت‌های مالی نمایش داده نمی‌شود.

**راهکار پیشنهادی:** هر دو وضعیت `settlement_requested` و `included_in_settlement` در
آمار در جریان لحاظ و در صورت نیاز به دو زیرگروه pending و approved تفکیک شوند.

### ۸.۸. مهم: تشخیص لغو توسط مدیر در گزارش مالی نادرست است

**وضعیت:** باز

گزارش برای تشخیص لغو مدیر از `created_by_manager_id` استفاده می‌کند. این فیلد سازنده
رزرو را نشان می‌دهد، نه عامل لغو. بنابراین رزرو آنلاین لغوشده توسط مدیر ممکن است به
اشتباه «لغو توسط کاربر» شمرده شود.

**راهکار پیشنهادی:** گزارش از `SlotCancellation` یا فیلد صریح `cancelled_by_user_id` و
`cancellation_actor_role` استفاده کند.

### ۸.۹. مهم: مبلغ Refund در summary وضعیت را تفکیک نمی‌کند

**وضعیت:** باز

`refunds_amount` مجموع Refundهای pending، approved، rejected و paid است. این عدد نه
بدهی باز است و نه مبلغ پرداخت‌شده.

**راهکار پیشنهادی:** حداقل این مقادیر جدا گزارش شوند:

```text
pending_refund_amount
approved_refund_amount
paid_refund_amount
rejected_refund_amount
```

### ۸.۱۰. متوسط: بازه تسویه بر اساس تاریخ ایجاد رزرو است

**وضعیت:** نیازمند تصمیم محصول

`period_from` و `period_to` روی `Booking.created_at` اعمال می‌شوند، در حالی که برداشت
طبیعی از «تسویه سانس‌های یک بازه» معمولاً تاریخ پایان سانس است.

**راهکار پیشنهادی:** قرارداد API مشخص کند بازه مربوط به کدام تاریخ است. برای تسویه
عملکرد وندور، استفاده از `TimeSlot.end_time` منطقی‌تر است.

### ۸.۱۱. متوسط: ادمین جزئیات آیتم‌های درخواست را نمی‌بیند

**وضعیت:** باز

پاسخ Settlement فقط مبلغ کل و تعداد Bookingها را برمی‌گرداند. ادمین تاریخ سانس، مبلغ
هر Booking، پرداخت درگاه، Refund، کمیسیون و مبلغ خالص هر آیتم را نمی‌بیند و امکان
حسابرسی قبل از تأیید ندارد.

**راهکار پیشنهادی:** endpoint جزئیات Settlement و جدول آیتم‌ها در پنل ادمین اضافه شود.

### ۸.۱۲. متوسط: تکرار همان وضعیت Settlement مجاز است

**وضعیت:** باز

ارسال `approved → approved` یا `paid → paid` رد نمی‌شود. این رفتار می‌تواند مبلغ
تأییدشده، یادداشت یا timestamp نهایی را بازنویسی کند.

**راهکار پیشنهادی:** same-state transition رد شود و رکورد paid immutable باشد.

### ۸.۱۳. متوسط: رزرو آنلاین وضعیت `completed` ندارد

**وضعیت:** شکاف مدل دامنه

پس از پایان سانس، Booking همچنان `confirmed` باقی می‌ماند و پایان‌یافتن آن فقط از روی
`TimeSlot.end_time` استنباط می‌شود. این موضوع queryها، گزارش‌ها و UI را مستعد اختلاف
می‌کند.

**راهکارهای ممکن:**

- اضافه کردن وضعیت `completed` با job زمان‌بندی‌شده؛
- یا حفظ `confirmed` و تعریف رسمی مفهوم derived به نام `is_completed` در یک helper
  مشترک و استفاده اجباری همه بخش‌ها از آن.

راهکار دوم ساده‌تر است و از transition انبوه جلوگیری می‌کند.

### ۸.۱۴. کم: `expires_at` بعد از پرداخت موفق پاک نمی‌شود

**وضعیت:** باز

در پرداخت موفق، `status` به confirmed تغییر می‌کند ولی `expires_at` قبلی باقی می‌ماند.
در منطق فعلی فقط Bookingهای pending بر اساس آن منقضی می‌شوند، پس الزاماً اثر عملیاتی
ندارد؛ اما برای گزارش و دیباگ گمراه‌کننده است.

**راهکار پیشنهادی:** در نهایی‌سازی پرداخت، `expires_at = null` شود.

### ۸.۱۵. کم: وضعیت رزرو دستی نام‌گذاری مالی نامناسبی دارد

**وضعیت:** باز

رزرو دستی با `excluded_due_to_cancellation` ساخته می‌شود، در حالی که لغوی رخ نداده
است. این نام گزارش و تحلیل داده را مخدوش می‌کند.

**راهکار پیشنهادی:** وضعیت مستقلی مانند `excluded_manual_booking` اضافه شود یا علت
خروج از تسویه در فیلد جداگانه نگهداری شود.

### ۸.۱۶. رفع‌شده: مدیر می‌توانست سانس شروع‌شده یا گذشته را لغو کند

**وضعیت:** رفع‌شده در ۱۴۰۵/۰۵/۱۲

پیش از اصلاح، مسیر لغو مدیر محدودیت زمانی نداشت و رزرو پایان‌یافته حتی پس از ورود به
چرخه تسویه قابل لغو و Refund بود. اکنون بک‌اند از لحظه شروع سانس لغو را با پاسخ ۴۰۹
رد می‌کند و UI نیز عملیات لغو را غیرفعال نشان می‌دهد.

کنترل اصلی در:
[`backend/app/services/finance_service.py`](../backend/app/services/finance_service.py)

تست رگرسیون در:
[`backend/tests/test_reservation_critical_flows.py`](../backend/tests/test_reservation_critical_flows.py)

## ۹. اولویت پیشنهادی اصلاحات

### فاز اول: جلوگیری از خطای مالی مستقیم

۱. اصلاح Reject و امکان درخواست مجدد بدون شکستن unique constraint؛
۲. تعیین تکلیف یا حذف تسویه جزئی؛
۳. تکمیل ثبت paid با مقصد بانکی و کد رهگیری؛
۴. جلوگیری از settled شدن Booking لغوشده/Refundشده؛
۵. immutable کردن Settlement پرداخت‌شده.

### فاز دوم: محاسبه صحیح سهم وندور

۱. snapshot کمیسیون و مبلغ خالص در زمان پرداخت؛
۲. یکسان‌سازی eligibility در summary و request؛
۳. اصلاح آمار approved و Refundها؛
۴. اصلاح تشخیص عامل لغو.

### فاز سوم: شفافیت و عملیات

۱. صفحه جزئیات Settlement برای ادمین؛
۲. تاریخچه درخواست‌ها برای وندور؛
۳. تعریف رسمی completed؛
۴. اصلاح نام‌گذاری رزرو دستی؛
۵. اضافه کردن audit و reconciliation مالی.

## ۱۰. تست‌های ضروری

حداقل تست‌های زیر باید برای چرخه Booking و Settlement وجود داشته باشند:

- هم‌زمانی دو رزرو برای یک سانس؛
- پرداخت موفق و تبدیل pending به confirmed؛
- انقضای رزرو و آزادسازی سانس؛
- ممنوعیت لغو کاربر و مدیر بعد از شروع سانس؛
- لغو زودهنگام و محاسبه دقیق جریمه و Refund؛
- لغو ۴۸ ساعت پایانی و چرخه جایگزینی؛
- انتقال اتمیک مالکیت پس از پرداخت جایگزین؛
- جلوگیری از تسویه Booking بدون Payment موفق؛
- جلوگیری از ورود یک Booking به دو درخواست فعال هم‌زمان؛
- Reject و درخواست مجدد؛
- approved و paid با کد رهگیری؛
- رفتار تسویه جزئی؛
- جلوگیری از تغییر Settlement paid؛
- تطابق مجموع آیتم‌ها با مبلغ درخواست و مبلغ پرداخت‌شده؛
- تطابق گزارش summary با query واقعی eligibility.

## ۱۱. فایل‌های کلیدی پیاده‌سازی

- مدل رزرو: [`backend/app/models/booking.py`](../backend/app/models/booking.py)
- مدل پرداخت: [`backend/app/models/payment.py`](../backend/app/models/payment.py)
- مدل Refund: [`backend/app/models/refund.py`](../backend/app/models/refund.py)
- مدل Settlement: [`backend/app/models/settlement.py`](../backend/app/models/settlement.py)
- منطق رزرو و پرداخت: [`backend/app/services/booking_service.py`](../backend/app/services/booking_service.py)
- منطق لغو مدیر و تسویه: [`backend/app/services/finance_service.py`](../backend/app/services/finance_service.py)
- API مدیر مجموعه: [`backend/app/api/v1/manager.py`](../backend/app/api/v1/manager.py)
- API مالی ادمین: [`backend/app/api/v1/admin.py`](../backend/app/api/v1/admin.py)
- داشبورد رزروهای وندور: [`frontend/components/vendors/dashboard/vendor-bookings-tab.tsx`](../frontend/components/vendors/dashboard/vendor-bookings-tab.tsx)
- داشبورد مالی وندور: [`frontend/components/vendors/dashboard/vendor-finance-tab.tsx`](../frontend/components/vendors/dashboard/vendor-finance-tab.tsx)
- صفحه تسویه ادمین: [`frontend/app/dashboard/admin/settlements/page.tsx`](../frontend/app/dashboard/admin/settlements/page.tsx)
