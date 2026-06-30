# مستند دیتابیس ToopSet

این سند بر اساس مدل‌های SQLAlchemy در `backend/app/models` و migrationهای Alembic نوشته شده است. دیتابیس اصلی PostgreSQL است و ارتباط با آن از طریق SQLAlchemy async انجام می‌شود.

## نمای کلی

دیتابیس چهار دامنه اصلی دارد:

- هویت و امنیت: `users`, `refresh_tokens`, `bank_cards`
- بازار مجموعه‌های ورزشی: `vendors`, `vendor_images`, `time_slots`
- رزرو و مالی: `bookings`, `payments`, `wallets`, `wallet_transactions`, `penalties`
- تعامل و عملیات: `reviews`, `favorites`, `notifications`, `contact_messages`, `logs`, `settings`

بیشتر زمان‌ها با `DateTime(timezone=True)` ذخیره می‌شوند. در سرویس سانس‌ها، ورودی زمان محلی ایران قبل از ذخیره به UTC تبدیل می‌شود.

## روابط اصلی

- هر `user` می‌تواند نقش `user`, `manager`, یا `admin` داشته باشد.
- هر `vendor` متعلق به یک مدیر در `users` است.
- هر `time_slot` متعلق به یک `vendor` است.
- هر `booking` متعلق به یک `user` و یک `time_slot` است.
- هر `payment` متعلق به یک `booking` است.
- هر `review` متعلق به یک `user`, یک `vendor`, و یک `booking` یکتا است.
- هر `wallet` برای هر کاربر یکتا است و تراکنش‌های آن در `wallet_transactions` ثبت می‌شوند.

## جدول `users`

کاربرد: نگهداری حساب کاربران، مدیران مجموعه و ادمین‌ها. این جدول پایه احراز هویت، مجوزدهی و مالکیت داده‌هاست.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه داخلی کاربر |
| `full_name` | String(128) | required | نمایش نام در پروفایل، رزرو، گزارش و لاگ |
| `phone` | String(16) | unique, index, required | شناسه اصلی ورود و ثبت‌نام |
| `password_hash` | String(256) | required | نگهداری هش bcrypt رمز، نه رمز خام |
| `role` | Enum(`user`,`manager`,`admin`) | default `user` | کنترل سطح دسترسی |
| `avatar_url` | String(512) nullable | optional | مسیر تصویر پروفایل |
| `token_version` | Integer | default 0 | ابطال access tokenها در login/logout/all-session |
| `is_active` | Boolean | default true | غیرفعال‌سازی حساب بدون حذف داده |
| `created_at` | DateTime(timezone=True) | server `now()` | گزارش‌گیری و مرتب‌سازی |

ایندکس‌ها: `role`, `created_at`, و index/unique روی `phone`.

## جدول `refresh_tokens`

کاربرد: نگهداری refresh tokenها به صورت هش‌شده برای rotation، مدیریت session و تشخیص replay.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه رکورد |
| `token_hash` | String(128) | unique, index | ذخیره امن token بدون متن خام |
| `user_id` | FK users.id | CASCADE | مالک session |
| `session_id` | String(36), index | required | گروه‌بندی refresh tokenهای یک دستگاه/session |
| `issued_at` | DateTime(timezone=True) | server `now()` | زمان صدور |
| `expires_at` | DateTime(timezone=True) | required | انقضای refresh token |
| `revoked_at` | DateTime nullable | optional | ابطال session/token |
| `replaced_by` | String(128) nullable | optional | لینک به توکن جدید بعد از rotation |
| `device_info` | String(512) nullable | optional | نمایش session به کاربر |
| `ip_address` | String(45) nullable | optional | audit و امنیت، IPv4/IPv6 |
| `user_agent` | Text nullable | optional | audit و نمایش اطلاعات دستگاه |

ایندکس‌ها: `(user_id, revoked_at)`, `expires_at`, `session_id`.

## جدول `vendors`

کاربرد: نگهداری مجموعه‌های ورزشی قابل رزرو. نام قبلی در بعضی endpointها هنوز `courts` است، اما مدل فعلی `vendors` است.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه مجموعه |
| `manager_id` | FK users.id | CASCADE, index | مالک/مدیر مجموعه |
| `name` | String(256) | required | عنوان مجموعه |
| `sport_types` | ARRAY(String) | default `{}` | پشتیبانی چند رشته ورزشی |
| `address` | Text | required | نمایش و جست‌وجوی مکان |
| `latitude` | Float | required | نمایش روی نقشه |
| `longitude` | Float | required | نمایش روی نقشه |
| `capacity` | Integer | required | محدودیت تعداد شرکت‌کنندگان |
| `amenities` | JSON nullable | optional | امکانات انعطاف‌پذیر بدون تغییر schema |
| `is_active` | Boolean | default true | وضعیت تایید/فعال بودن مجموعه |
| `average_rating` | Float | default 0.0 | میانگین نظرات برای مرتب‌سازی و نمایش |
| `created_at` | DateTime(timezone=True) | server `now()` | audit و مرتب‌سازی |

ایندکس‌ها: `manager_id`, `is_active`, `created_at`.

## جدول `vendor_images`

کاربرد: تصاویر مرتب‌شده هر مجموعه.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه تصویر |
| `vendor_id` | FK vendors.id | CASCADE | اتصال تصویر به مجموعه |
| `url` | String(512) | required | مسیر فایل |
| `order` | Integer | default 0 | ترتیب نمایش گالری |
| `created_at` | DateTime(timezone=True) | server `now()` | audit |

## جدول `time_slots`

کاربرد: سانس‌های قابل رزرو برای هر مجموعه.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه سانس |
| `vendor_id` | FK vendors.id | CASCADE, index | مجموعه صاحب سانس |
| `start_time` | DateTime(timezone=True) | index | شروع سانس |
| `end_time` | DateTime(timezone=True) | required | پایان سانس |
| `base_price` | Numeric(10,2) | required | قیمت پایه |
| `ball_price` | Numeric(10,2) | default 0 | هزینه توپ در صورت درخواست |
| `ball_available` | Boolean | default false | امکان رزرو توپ |
| `gender` | Enum(`male`,`female`) | default `male` | فیلتر جنسیت سانس |
| `status` | Enum(`open`,`pending_cancellation`,`reserved`,`closed`) | default `open`, index | کنترل چرخه رزرو |
| `is_reserved` | Boolean | default false | چک سریع رزرو بودن |
| `version` | Integer | default 1 | optimistic concurrency برای جلوگیری از رزرو stale |

قید یکتا: `(vendor_id, start_time, end_time)` برای جلوگیری از سانس تکراری.

## جدول `bookings`

کاربرد: رزرو سانس توسط کاربر و نگهداری وضعیت پرداخت/لغو/جایگزینی.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه رزرو |
| `user_id` | FK users.id | CASCADE, index | رزروکننده |
| `slot_id` | FK time_slots.id | CASCADE, index | سانس رزروشده |
| `replaces_booking_id` | FK bookings.id nullable | SET NULL, index | رزرو جایگزین برای لغو نزدیک به زمان سانس |
| `status` | Enum(`pending_payment`,`confirmed`,`pending_cancellation`,`transferred`,`cancelled`) | default `pending_payment`, index | چرخه عمر رزرو |
| `price_paid` | Numeric(10,2) | required | مبلغ نهایی |
| `slot_price` | Numeric(10,2) nullable | optional | قیمت پایه در لحظه رزرو |
| `ball_price` | Numeric(10,2) | default 0 | قیمت توپ در لحظه رزرو |
| `with_ball` | Boolean | default false | درخواست توپ |
| `penalty_amount` | Numeric(10,2) nullable | optional | جریمه لغو |
| `participants_count` | SmallInteger | default 1 | کنترل ظرفیت مجموعه |
| `created_at` | DateTime(timezone=True) | server `now()` | audit |
| `updated_at` | DateTime(timezone=True) | server `now()`, onupdate | تغییرات وضعیت |
| `expires_at` | DateTime(timezone=True) nullable | optional | مهلت ۱۰ دقیقه‌ای پرداخت |

ایندکس: `created_at`.

## جدول `payments`

کاربرد: ثبت پرداخت‌های موفق و ناموفق مربوط به رزرو.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه پرداخت |
| `booking_id` | FK bookings.id | CASCADE, index | رزرو مربوطه |
| `amount` | Numeric(10,2) | required | مبلغ پرداخت |
| `gateway_transaction_id` | String(256) nullable | optional | شناسه تراکنش درگاه |
| `gateway_name` | String(64) nullable | optional | نام درگاه |
| `card_number` | String(32) nullable | optional | شماره کارت mask شده |
| `ref_id` | String(64) nullable | optional | شماره رسید |
| `gateway_fee` | Numeric(10,2) nullable | optional | کارمزد درگاه |
| `paid_at` | DateTime(timezone=True) nullable | optional | زمان پرداخت موفق |
| `status` | Enum(`pending`,`success`,`failed`) | default `pending` | نتیجه پرداخت |
| `created_at` | DateTime(timezone=True) | server `now()` | audit |

## جدول `wallets`

کاربرد: نگهداری موجودی کیف پول کاربر برای refund و برداشت/واریز.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | autoincrement | شناسه کیف پول |
| `user_id` | FK users.id | CASCADE, unique | هر کاربر فقط یک کیف پول |
| `balance` | Numeric(10,2) | default 0 | موجودی |
| `created_at` | DateTime(timezone=True) | server `now()` | audit |
| `updated_at` | DateTime(timezone=True) | server `now()`, onupdate | آخرین تغییر |

## جدول `wallet_transactions`

کاربرد: دفتر تراکنش‌های کیف پول.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | autoincrement | شناسه تراکنش |
| `wallet_id` | FK wallets.id | CASCADE, index | کیف پول مربوطه |
| `amount` | Numeric(10,2) | required | مبلغ تراکنش |
| `type` | String(20) | required | نوع مثل `deposit`, `withdrawal`, `refund` |
| `description` | Text nullable | optional | توضیح انسانی |
| `created_at` | DateTime(timezone=True) | server `now()` | زمان تراکنش |

## جدول `bank_cards`

کاربرد: نگهداری کارت‌های بانکی تاییدشده برای بازگشت وجه.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه کارت |
| `user_id` | FK users.id | CASCADE, index | مالک کارت |
| `encrypted_card_number` | String(512) | required | شماره کارت رمزنگاری‌شده با Fernet |
| `masked_card_number` | String(32) | required | نمایش امن کارت |
| `card_fingerprint` | String(64) | index | تشخیص کارت تکراری بدون ذخیره plaintext |
| `holder_name` | String(128) nullable | optional | نام دارنده از سرویس استعلام |
| `status` | Enum(`pending_confirmation`,`verified`,`rejected`) | default `pending_confirmation`, index | وضعیت تایید کارت |
| `verified_at` | DateTime(timezone=True) nullable | optional | زمان تایید |
| `created_at` | DateTime(timezone=True) | server `now()` | audit |
| `updated_at` | DateTime(timezone=True) | server `now()`, onupdate | آخرین تغییر |

قید یکتا: `(user_id, card_fingerprint)` برای جلوگیری از ثبت کارت تکراری برای یک کاربر.

## جدول `reviews`

کاربرد: نظر کاربر درباره تجربه رزرو.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه نظر |
| `user_id` | FK users.id | CASCADE, indexed via table args | نویسنده |
| `vendor_id` | FK vendors.id | CASCADE, index | مجموعه مربوطه |
| `booking_id` | FK bookings.id | CASCADE, unique | هر رزرو فقط یک نظر |
| `rating` | SmallInteger | required | امتیاز |
| `comment` | Text nullable | optional | متن نظر |
| `response` | Text nullable | optional | پاسخ مدیر/ادمین |
| `is_reported` | Boolean | default false | حذف از میانگین امتیاز در صورت گزارش |
| `created_at` | DateTime(timezone=True) | server `now()` | زمان ثبت |

## جدول `favorites`

کاربرد: لیست علاقه‌مندی‌های کاربر.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه علاقه‌مندی |
| `user_id` | FK users.id | CASCADE, index | کاربر |
| `vendor_id` | FK vendors.id | CASCADE, index | مجموعه |
| `created_at` | DateTime(timezone=True) | server `now()` | زمان افزودن |

قید یکتا: `(user_id, vendor_id)` برای جلوگیری از duplicate favorite.

## جدول `penalties`

کاربرد: ثبت جریمه‌های لغو رزرو.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه جریمه |
| `user_id` | FK users.id | CASCADE, index | کاربر جریمه‌شده |
| `booking_id` | FK bookings.id | CASCADE, index | رزرو مربوطه |
| `amount` | Numeric(10,2) | required | مبلغ جریمه |
| `reason` | String(128) | required | علت جریمه |
| `created_at` | DateTime(timezone=True) | server `now()` | زمان ثبت |

## جدول `notifications`

کاربرد: اعلان‌های کاربر مثل تایید رزرو، لغو رزرو، پیام همگانی.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه اعلان |
| `user_id` | FK users.id | CASCADE, index | گیرنده |
| `type` | String(64) | required | دسته اعلان |
| `message` | Text | required | متن اعلان |
| `is_read` | Boolean | default false | وضعیت خوانده‌شدن |
| `created_at` | DateTime(timezone=True) | server `now()` | زمان ایجاد |

## جدول `contact_messages`

کاربرد: پیام‌های فرم تماس عمومی.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه پیام |
| `name` | String(256) | required | نام فرستنده |
| `email` | String(256) nullable | optional | ایمیل |
| `phone` | String(32) | required | تلفن تماس |
| `subject` | String(512) | required | موضوع |
| `message` | Text | required | متن پیام |
| `created_at` | DateTime(timezone=True) | server `now()` | زمان ثبت |

## جدول `logs`

کاربرد: audit log برای عملیات مهم سیستم و امنیت.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه لاگ |
| `user_id` | FK users.id nullable | SET NULL | کاربر عامل، در صورت وجود |
| `action` | String(128) | required | نوع عملیات |
| `details` | Text nullable | optional | توضیح |
| `severity` | String(16) | default `INFO` | سطح اهمیت |
| `request_id` | String(64) nullable | optional | اتصال به correlation id |
| `ip_address` | String(45) nullable | optional | audit امنیتی |
| `user_agent` | Text nullable | optional | audit امنیتی |
| `created_at` | DateTime(timezone=True) | server `now()` | زمان رخداد |

## جدول `settings`

کاربرد: تنظیمات قابل تغییر سیستم مثل متن قوانین، اطلاعات تماس و تصاویر hero.

| فیلد | نوع | محدودیت/پیش‌فرض | دلیل وجود |
| --- | --- | --- | --- |
| `id` | Integer PK | primary key | شناسه تنظیم |
| `key` | String(128) | unique, index, required | کلید تنظیم |
| `value` | Text | required, default empty | مقدار تنظیم، گاهی JSON string |
| `description` | String(256) nullable | optional | توضیح برای ادمین |
| `created_at` | DateTime(timezone=True) | server `now()` | زمان ایجاد |
| `updated_at` | DateTime(timezone=True) | server `now()`, onupdate | آخرین ویرایش |

## نکات طراحی و ریسک‌ها

- ذخیره refresh token به صورت hash درست است و از افشای token خام در دیتابیس جلوگیری می‌کند.
- `token_version` برای single-device/session invalidation استفاده می‌شود؛ login و logout-all آن را تغییر می‌دهند.
- کارت بانکی encrypt و mask می‌شود، اما کلید Fernet از `SECRET_KEY` مشتق شده است. rotation کلید باید با برنامه migration/reencryption همراه باشد.
- مدل پرداخت فعلی mock است و نباید به عنوان پرداخت واقعی تولیدی استفاده شود.
- برای حذف اجباری کاربر، API ادمین raw delete در ترتیب FK-safe انجام می‌دهد؛ این endpoint باید فقط در محیط‌های کنترل‌شده استفاده شود.
