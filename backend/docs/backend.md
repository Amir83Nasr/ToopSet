# مستندات Backend پروژه ToopSet

این سند بر اساس کد فعلی backend نوشته شده است و سه بخش اصلی دارد: endpointهای API، جدول‌های دیتابیس، و توضیح فایل‌های backend.

## نمای کلی

- فریم‌ورک اصلی: FastAPI
- دیتابیس: PostgreSQL با SQLAlchemy async و Alembic
- کش و داده موقت: Redis
- احراز هویت: JWT Bearer token
- مانیتورینگ: Prometheus metrics، health check و پشتیبانی Sentry
- مسیر پایه API: `/api/v1`
- فایل entrypoint: `app/main.py`

نقش‌های سیستم:

- `user`: کاربر عادی برای مشاهده مجموعه‌ها، رزرو، پرداخت، نظر، علاقه‌مندی و کیف پول.
- `manager`: مدیر مجموعه برای ثبت مجموعه، مدیریت سانس‌ها، دیدن رزروهای مجموعه و پاسخ به نظرها.
- `admin`: مدیر سیستم برای مدیریت کاربران، لاگ‌ها، تنظیمات، تایید مجموعه‌ها و گزارش‌ها.

## Endpointها

### Root و Monitoring

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/` | عمومی | کاربر را به Swagger در `/docs` هدایت می‌کند. |
| GET | `/health` | عمومی | وضعیت سلامت سرویس، دیتابیس و Redis را برمی‌گرداند. |
| GET | `/metrics` | عمومی/مانیتورینگ | خروجی Prometheus metrics را برای مانیتورینگ ارائه می‌دهد. |

### Auth - احراز هویت و پروفایل

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| POST | `/api/v1/auth/register` | عمومی، rate limit: `3/minute` | ثبت‌نام کاربر جدید با شماره تلفن، رمز عبور و نام کامل. خروجی شامل access token، refresh token و اطلاعات کاربر است. |
| POST | `/api/v1/auth/login` | عمومی، rate limit: `5/minute` | ورود کاربر با شماره تلفن و رمز عبور. با هر ورود `token_version` افزایش پیدا می‌کند تا نشست قبلی نامعتبر شود. |
| POST | `/api/v1/auth/refresh` | عمومی، rate limit: `10/minute` | دریافت access token و refresh token جدید با refresh token معتبر. |
| GET | `/api/v1/auth/me` | کاربر لاگین‌شده | اطلاعات کاربر فعلی را از روی JWT برمی‌گرداند. |
| PATCH | `/api/v1/auth/profile` | کاربر لاگین‌شده | ویرایش نام کامل و/یا رمز عبور. برای تغییر رمز، رمز فعلی لازم است. |
| POST | `/api/v1/auth/avatar` | کاربر لاگین‌شده | آپلود تصویر پروفایل. نوع و حجم فایل اعتبارسنجی می‌شود و آدرس فایل در `avatar_url` ذخیره می‌شود. |
| DELETE | `/api/v1/auth/avatar` | کاربر لاگین‌شده | حذف تصویر پروفایل کاربر و پاک کردن فایل از storage محلی. |

### Vendors - مجموعه‌ها/زمین‌ها

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/vendors` | عمومی با auth اختیاری | لیست مجموعه‌ها را با pagination و فیلترهای `sport_types`, `search`, `is_active`, بازه تاریخ، بازه قیمت، موقعیت جغرافیایی و sort برمی‌گرداند. برای کاربر عمومی فقط مجموعه‌های فعال دیده می‌شود؛ manager مجموعه‌های خودش و admin همه را می‌بیند. |
| GET | `/api/v1/vendors/{vendor_id}` | عمومی با auth اختیاری | جزئیات یک مجموعه، تصاویر مرتب‌شده، اطلاعات مدیر و حداقل قیمت سانس را برمی‌گرداند. مجموعه غیرفعال برای کاربر عمومی مخفی است. |
| GET | `/api/v1/vendors/{vendor_id}/reviews` | عمومی | نظرهای یک مجموعه را با pagination برمی‌گرداند. |
| POST | `/api/v1/vendors` | manager | ثبت مجموعه جدید. هر manager فقط یک مجموعه می‌تواند ثبت کند. مجموعه تازه با `is_active=false` ساخته می‌شود و نیاز به تایید admin دارد. |
| PATCH | `/api/v1/vendors/{vendor_id}` | مالک مجموعه یا admin | ویرایش اطلاعات مجموعه، افزودن تصویر و حذف تصاویر انتخابی. |
| DELETE | `/api/v1/vendors/{vendor_id}` | مالک مجموعه یا admin | حذف مجموعه و فایل‌های تصاویر مربوط به آن. |
| POST | `/api/v1/vendors/{vendor_id}/images` | مالک مجموعه یا admin | افزودن تصویر به مجموعه با URL آماده و تعیین order بعدی. |
| DELETE | `/api/v1/vendors/{vendor_id}/images/{image_id}` | مالک مجموعه یا admin | حذف یک تصویر مجموعه از دیتابیس و storage. |
| PUT | `/api/v1/vendors/{vendor_id}/images/reorder` | مالک مجموعه یا admin | مرتب‌سازی تصاویر مجموعه با دریافت آرایه‌ای از image idها. |

### Time Slots - سانس‌ها

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/vendors/{vendor_id}/slots` | عمومی با auth اختیاری | لیست سانس‌های یک مجموعه را با فیلتر `date` و pagination برمی‌گرداند. صفحه اول در Redis cache می‌شود. |
| POST | `/api/v1/vendors/{vendor_id}/slots` | manager یا admin | ساخت یک سانس. زمان ورودی به عنوان زمان ایران دریافت و برای ذخیره به UTC تبدیل می‌شود. |
| POST | `/api/v1/vendors/{vendor_id}/slots/generate` | manager یا admin | تولید گروهی سانس‌ها بر اساس بازه تاریخ، روزهای هفته و templateهای ساعت/قیمت. سانس‌های تکراری skip می‌شوند. |
| PATCH | `/api/v1/vendors/{vendor_id}/slots/{slot_id}` | manager یا admin | ویرایش سانس. سانس رزرو شده قابل ویرایش نیست. |
| DELETE | `/api/v1/vendors/{vendor_id}/slots/{slot_id}` | manager یا admin | حذف سانس. سانس رزرو شده قابل حذف نیست. |
| GET | `/api/v1/slots/{slot_id}` | عمومی با auth اختیاری | جزئیات یک سانس را برای جریان رزرو برمی‌گرداند؛ شامل نام مجموعه، آدرس و نوع ورزش. |

### Bookings - رزروها

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/bookings` | کاربر لاگین‌شده | رزروهای کاربر فعلی را با pagination و فیلتر `status` برمی‌گرداند. |
| GET | `/api/v1/bookings/completed` | کاربر لاگین‌شده | رزروهای تایید شده و قابل نظر دادن کاربر را برمی‌گرداند. |
| GET | `/api/v1/bookings/all` | admin | همه رزروها را با `search` و `status` برای پنل ادمین برمی‌گرداند و cache می‌کند. |
| GET | `/api/v1/bookings/{booking_id}` | مالک رزرو یا admin | جزئیات رزرو شامل سانس، مجموعه و پرداخت مرتبط را برمی‌گرداند. |
| POST | `/api/v1/bookings` | کاربر لاگین‌شده | ساخت رزرو pending برای یک `slot_id`. ظرفیت، رزرو نبودن سانس و `version` سانس بررسی می‌شود و مهلت پرداخت ۱۰ دقیقه‌ای ثبت می‌شود. |
| POST | `/api/v1/bookings/{booking_id}/pay` | مالک رزرو | پرداخت رزرو با درگاه mock. در صورت موفقیت، پرداخت ثبت می‌شود، رزرو `confirmed` می‌شود و سانس reserved می‌شود. |
| POST | `/api/v1/bookings/{booking_id}/cancel` | مالک رزرو یا admin | لغو رزرو. کمتر از ۲ ساعت مانده به شروع مجاز نیست؛ بین ۲ تا ۲۴ ساعت ۵۰٪ جریمه ثبت می‌شود؛ مبلغ برگشتی به کیف پول واریز می‌شود. |

### Dashboard - آمار و گزارش‌ها

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/dashboard/stats` | کاربر لاگین‌شده | آمار عمومی داشبورد مثل تعداد کاربران، مجموعه‌ها، رزروها و درآمد روز را برمی‌گرداند. |
| GET | `/api/v1/dashboard/manager/revenue` | manager یا admin | گزارش درآمد مجموعه‌های manager در بازه `date_from` تا `date_to`. |
| GET | `/api/v1/dashboard/admin-stats` | admin | آمار اصلی پنل admin با فیلتر تاریخ. |
| GET | `/api/v1/dashboard/manager-stats` | manager یا admin | آمار اختصاصی manager مثل رزروهای مجموعه‌ها و عملکرد سانس‌ها. |
| GET | `/api/v1/dashboard/admin/monthly-recap` | admin | خلاصه ماهانه برای پنل admin. |
| GET | `/api/v1/dashboard/admin/charts` | admin | داده نمودارهای admin dashboard. |
| GET | `/api/v1/dashboard/user-stats` | کاربر لاگین‌شده | آمار کاربر فعلی مثل تعداد رزرو، پرداخت و علاقه‌مندی. |

### Reviews - نظرها

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/reviews/recent` | عمومی با auth اختیاری | آخرین نظرها را با limit برمی‌گرداند. |
| GET | `/api/v1/reviews/my` | کاربر لاگین‌شده | نظرهای ثبت‌شده توسط کاربر فعلی را برمی‌گرداند. |
| POST | `/api/v1/reviews` | کاربر لاگین‌شده | ثبت نظر برای یک booking تایید شده. فقط بعد از گذشت ۲ ساعت از پایان سانس مجاز است و هر booking فقط یک review دارد. |
| POST | `/api/v1/reviews/{review_id}/report` | admin | علامت‌گذاری نظر به عنوان گزارش‌شده. |
| POST | `/api/v1/reviews/{review_id}/respond` | manager مالک مجموعه یا admin | ثبت پاسخ manager/admin به نظر. |
| DELETE | `/api/v1/reviews/{review_id}` | admin | حذف نظر و محاسبه دوباره میانگین امتیاز مجموعه. |

### Users - مدیریت کاربران

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/users` | admin | لیست کاربران با `search`, `role`, `is_active` و pagination. |
| GET | `/api/v1/users/{user_id}` | admin | جزئیات یک کاربر برای پنل مدیریت. |
| PATCH | `/api/v1/users/{user_id}/role` | admin | تغییر نقش کاربر. جلوی سناریوهای خطرناک مثل تغییر نقش خود admin طبق service گرفته می‌شود. |
| PATCH | `/api/v1/users/{user_id}/toggle-active` | admin | فعال/غیرفعال کردن حساب کاربر. |

### Payments - پرداخت‌ها

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/payments/my` | کاربر لاگین‌شده | پرداخت‌های کاربر فعلی با جست‌وجو و فیلتر status. |
| GET | `/api/v1/payments/all` | admin | همه پرداخت‌ها برای پنل admin با جست‌وجو و فیلتر status. |

### Wallet - کیف پول

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/wallet/balance` | کاربر لاگین‌شده | موجودی کیف پول کاربر را برمی‌گرداند و در صورت نبود wallet آن را ایجاد می‌کند. |
| POST | `/api/v1/wallet/deposit` | کاربر لاگین‌شده | افزایش موجودی کیف پول و ثبت تراکنش deposit. |
| POST | `/api/v1/wallet/withdraw` | کاربر لاگین‌شده | کاهش موجودی در صورت کافی بودن balance و ثبت تراکنش withdrawal. |
| GET | `/api/v1/wallet/transactions` | کاربر لاگین‌شده | تاریخچه تراکنش‌های کیف پول با `limit` و `offset`. |

### Notifications - اعلان‌ها

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/notifications` | کاربر لاگین‌شده | لیست اعلان‌های کاربر با `unread_only`, `search`, `type` و pagination. |
| GET | `/api/v1/notifications/unread-count` | کاربر لاگین‌شده | تعداد اعلان‌های خوانده‌نشده کاربر. |
| POST | `/api/v1/notifications/{notification_id}/read` | مالک اعلان | علامت‌گذاری یک اعلان به عنوان خوانده‌شده. |
| POST | `/api/v1/notifications/read-all` | کاربر لاگین‌شده | خوانده‌شده کردن همه اعلان‌های کاربر. |

### Favorites - علاقه‌مندی‌ها

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/favorites` | کاربر لاگین‌شده | لیست مجموعه‌های علاقه‌مندی کاربر. |
| GET | `/api/v1/favorites/check` | کاربر لاگین‌شده | بررسی چند vendor id با query `vendor_ids=1,2,3` و برگرداندن idهای favorite شده. |
| POST | `/api/v1/favorites/{vendor_id}` | کاربر لاگین‌شده | افزودن مجموعه به علاقه‌مندی‌ها. |
| DELETE | `/api/v1/favorites/{vendor_id}` | کاربر لاگین‌شده | حذف مجموعه از علاقه‌مندی‌ها. |

### Manager - پنل مدیر مجموعه

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/manager/bookings` | manager یا admin | لیست رزروهای مجموعه‌های manager با فیلتر status، vendor، بازه تاریخ و search. |
| GET | `/api/v1/manager/slots` | manager یا admin | لیست سانس‌های مجموعه‌های manager با فیلتر vendor، reserved بودن و بازه تاریخ. |

### Contact - پیام تماس

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| POST | `/api/v1/contact` | عمومی | ثبت پیام تماس شامل نام، ایمیل، تلفن، موضوع و متن پیام. |
| GET | `/api/v1/contact/admin` | admin | مشاهده پیام‌های تماس با pagination و cache. |
| DELETE | `/api/v1/contact/admin/{message_id}` | admin | حذف پیام تماس. |

### Uploads - آپلود فایل

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| POST | `/api/v1/uploads/vendor-image` | manager یا admin | آپلود تصویر مجموعه. فایل در `uploads/vendors` ذخیره می‌شود و یک `temp_id` یک‌ساعته در Redis ساخته می‌شود تا هنگام ایجاد مجموعه مصرف شود. |

### Settings - تنظیمات عمومی

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/settings/{key}` | کاربر لاگین‌شده | خواندن مقدار یک تنظیم سیستم بر اساس key. |

### Penalties - جریمه‌ها

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| GET | `/api/v1/penalties` | کاربر لاگین‌شده | لیست جریمه‌های کاربر فعلی. جریمه‌ها معمولاً هنگام لغو رزرو در بازه ۲ تا ۲۴ ساعت مانده به شروع سانس ایجاد می‌شوند. |

### Admin - مدیریت سیستم

| Method | Path | دسترسی | کاربرد |
|---|---|---|---|
| POST | `/api/v1/admin/notifications/broadcast` | admin | ارسال اعلان همگانی به همه کاربران و ثبت audit log. |
| GET | `/api/v1/admin/logs` | admin | مشاهده audit logها با فیلتر action، user، بازه تاریخ و pagination. |
| DELETE | `/api/v1/admin/logs/clear` | admin | پاک کردن همه logها. |
| DELETE | `/api/v1/admin/logs/{log_id}` | admin | حذف یک log مشخص. |
| GET | `/api/v1/admin/pending-vendors` | admin | لیست مجموعه‌های غیرفعال در انتظار تایید. |
| POST | `/api/v1/admin/vendors/{vendor_id}/approve` | admin | تایید مجموعه و فعال کردن آن. |
| POST | `/api/v1/admin/vendors/{vendor_id}/reject` | admin | رد مجموعه در انتظار تایید و حذف رکورد/تصاویر آن. |
| DELETE | `/api/v1/admin/vendors/{vendor_id}` | admin | حذف دائمی یک مجموعه. |
| DELETE | `/api/v1/admin/users/{user_id}` | admin | حذف دائمی کاربر با بررسی وابستگی‌ها. اگر کاربر رزرو، مجموعه، نظر یا جریمه داشته باشد خطا می‌دهد. |
| DELETE | `/api/v1/admin/users/{user_id}/force` | admin | حذف اجباری کاربر و داده‌های مرتبط او با ترتیب امن نسبت به foreign keyها. |
| DELETE | `/api/v1/admin/reviews/{review_id}` | admin | حذف دائمی یک نظر از دیتابیس. |
| GET | `/api/v1/admin/settings` | admin | لیست همه تنظیمات سیستم. |
| PUT | `/api/v1/admin/settings/{setting_id}` | admin | ویرایش مقدار یک تنظیم سیستم و ثبت audit log. |
| POST | `/api/v1/admin/settings/seed` | admin | ایجاد تنظیمات پیش‌فرض سیستم در صورت نبودن آن‌ها. |
| POST | `/api/v1/admin/seed-admin` | عمومی، فقط قبل از وجود admin | ساخت اولین admin سیستم. اگر admin از قبل وجود داشته باشد خطا می‌دهد. |

## جدول‌های دیتابیس

### `users`

جدول اصلی کاربران سیستم است. همه نقش‌ها، یعنی user، manager و admin در همین جدول نگهداری می‌شوند.

فیلدهای مهم:

- `id`: شناسه اصلی کاربر.
- `full_name`: نام کامل.
- `phone`: شماره تلفن یکتا و index شده؛ مبنای login/register.
- `password_hash`: هش رمز عبور.
- `role`: نقش کاربر؛ یکی از `user`, `manager`, `admin`.
- `avatar_url`: مسیر تصویر پروفایل.
- `token_version`: کنترل نشست تک‌دستگاهی؛ با login افزایش پیدا می‌کند.
- `is_active`: فعال یا غیرفعال بودن حساب.
- `created_at`: زمان ایجاد.

ارتباط‌ها: هر user می‌تواند مجموعه‌های manager، رزروها، نظرها، جریمه‌ها و logهای خودش را داشته باشد.

### `vendors`

اطلاعات مجموعه/زمین ورزشی را نگه می‌دارد. هر vendor متعلق به یک manager است.

فیلدهای مهم:

- `manager_id`: کاربر manager مالک مجموعه.
- `name`: نام مجموعه.
- `sport_types`: آرایه نوع ورزش‌ها مثل futsal، football، basketball.
- `address`, `latitude`, `longitude`: اطلاعات مکانی.
- `capacity`: ظرفیت شرکت‌کنندگان.
- `images`: آرایه قدیمی URL تصاویر؛ در کنار جدول جدید `vendor_images` وجود دارد.
- `amenities`: امکانات مجموعه به صورت JSON.
- `is_active`: وضعیت فعال/تایید شده بودن. مجموعه جدید manager با false ساخته می‌شود.
- `average_rating`: میانگین امتیاز نظرها.
- `created_at`: زمان ثبت.

ارتباط‌ها: با `users`, `time_slots`, `reviews`, `vendor_images`.

### `vendor_images`

نسخه ساختاریافته‌تر تصاویر مجموعه است و ترتیب نمایش تصاویر را نگه می‌دارد.

فیلدهای مهم:

- `vendor_id`: مجموعه مربوطه.
- `url`: مسیر یا URL تصویر.
- `order`: ترتیب نمایش.
- `created_at`: زمان ثبت تصویر.

### `time_slots`

سانس‌های قابل رزرو هر مجموعه را نگه می‌دارد.

فیلدهای مهم:

- `vendor_id`: مجموعه مربوطه.
- `start_time`, `end_time`: زمان شروع و پایان با timezone.
- `base_price`: قیمت پایه سانس.
- `is_reserved`: آیا سانس رزرو قطعی شده است یا نه.
- `version`: برای optimistic locking در جریان رزرو؛ frontend نسخه سانس را ارسال می‌کند تا تغییر همزمان تشخیص داده شود.

ارتباط‌ها: هر سانس به یک vendor تعلق دارد و حداکثر یک booking دارد.

### `bookings`

رزروهای کاربران را نگه می‌دارد.

فیلدهای مهم:

- `user_id`: کاربر رزروکننده.
- `slot_id`: سانس رزرو شده؛ unique است تا هر سانس فقط یک رزرو داشته باشد.
- `status`: یکی از `pending_payment`, `confirmed`, `cancelled`.
- `price_paid`: مبلغ رزرو.
- `penalty_amount`: مبلغ جریمه در صورت لغو دیرهنگام.
- `participants_count`: تعداد شرکت‌کنندگان.
- `expires_at`: مهلت پرداخت رزرو pending.
- `created_at`, `updated_at`: زمان‌های ثبت و بروزرسانی.

ارتباط‌ها: با user، time_slot، payments، review و penalties.

### `payments`

اطلاعات پرداخت هر رزرو را ذخیره می‌کند.

فیلدهای مهم:

- `booking_id`: رزرو مربوطه؛ unique است.
- `amount`: مبلغ پرداخت.
- `gateway_transaction_id`: شناسه تراکنش درگاه mock.
- `gateway_name`: نام درگاه mock.
- `card_number`: شماره کارت mask شده.
- `ref_id`: کد پیگیری.
- `gateway_fee`: کارمزد درگاه.
- `paid_at`: زمان پرداخت موفق.
- `status`: یکی از `pending`, `success`, `failed`.
- `created_at`: زمان ایجاد رکورد پرداخت.

### `reviews`

نظر و امتیاز کاربران برای یک رزرو/مجموعه را نگه می‌دارد.

فیلدهای مهم:

- `user_id`: کاربر نویسنده نظر.
- `vendor_id`: مجموعه مورد نظر.
- `booking_id`: رزرو مربوطه؛ unique است تا هر رزرو یک نظر داشته باشد.
- `rating`: امتیاز عددی.
- `comment`: متن نظر.
- `response`: پاسخ manager/admin.
- `is_reported`: گزارش‌شده بودن نظر.
- `created_at`: زمان ثبت.

بعد از ثبت یا حذف نظر، `average_rating` مجموعه دوباره محاسبه می‌شود.

### `penalties`

جریمه‌های مالی کاربران را نگه می‌دارد؛ در حال حاضر مهم‌ترین کاربرد آن لغو رزرو در بازه ۲ تا ۲۴ ساعت مانده به شروع سانس است.

فیلدهای مهم:

- `user_id`: کاربر جریمه‌شده.
- `booking_id`: رزرو مرتبط.
- `amount`: مبلغ جریمه.
- `reason`: دلیل جریمه.
- `created_at`: زمان ثبت.

### `wallets`

کیف پول هر کاربر را نگه می‌دارد.

فیلدهای مهم:

- `user_id`: کاربر مالک wallet؛ unique است.
- `balance`: موجودی.
- `created_at`, `updated_at`: زمان ایجاد و بروزرسانی.

کیف پول هنگام نیاز با `get_or_create` ساخته می‌شود.

### `wallet_transactions`

تاریخچه تغییرات موجودی کیف پول است.

فیلدهای مهم:

- `wallet_id`: کیف پول مربوطه.
- `amount`: مبلغ تراکنش.
- `type`: نوع تراکنش مثل `deposit`, `withdrawal`, `refund`.
- `description`: توضیح تراکنش.
- `created_at`: زمان ثبت.

### `notifications`

اعلان‌های کاربران را نگه می‌دارد.

فیلدهای مهم:

- `user_id`: کاربر گیرنده اعلان.
- `type`: نوع اعلان مثل booking_created، booking_confirmed، broadcast.
- `message`: متن اعلان.
- `is_read`: خوانده‌شده بودن.
- `created_at`: زمان ایجاد.

### `logs`

Audit log عملیات مهم سیستم است.

فیلدهای مهم:

- `user_id`: کاربر انجام‌دهنده عملیات؛ nullable است و در صورت حذف user با `SET NULL` حفظ می‌شود.
- `action`: نوع عملیات.
- `details`: جزئیات فارسی عملیات.
- `created_at`: زمان ثبت.

### `settings`

تنظیمات قابل تغییر سیستم را نگه می‌دارد.

فیلدهای مهم:

- `key`: کلید یکتا مثل `platform_name`, `support_phone`, `commission_percent`.
- `value`: مقدار تنظیم.
- `description`: توضیح تنظیم.
- `created_at`, `updated_at`: زمان ایجاد و بروزرسانی.

### `contact_messages`

پیام‌های فرم تماس عمومی سایت را نگه می‌دارد.

فیلدهای مهم:

- `name`: نام فرستنده.
- `email`: ایمیل.
- `phone`: تلفن اختیاری.
- `subject`: موضوع پیام.
- `message`: متن پیام.
- `created_at`: زمان ثبت.

### `favorites`

رابط علاقه‌مندی کاربر به مجموعه است.

فیلدهای مهم:

- `user_id`: کاربر.
- `vendor_id`: مجموعه.
- `created_at`: زمان افزودن.

روی ترکیب `user_id` و `vendor_id` unique constraint وجود دارد تا یک مجموعه برای یک کاربر دوبار favorite نشود.

## توضیح فایل‌های backend

### فایل‌های ریشه backend

| فایل | توضیح |
|---|---|
| `.dockerignore` | فایل‌های غیرضروری مثل `.venv`, cacheها، logs و uploads را از build Docker حذف می‌کند. |
| `.env.example` | نمونه متغیرهای محیطی برای PostgreSQL، Redis، JWT، pool دیتابیس، payment، SMS، Sentry و logging. |
| `Dockerfile` | ایمیج production backend را با Python 3.12 می‌سازد، dependencyها را نصب می‌کند و uvicorn را اجرا می‌کند. |
| `alembic.ini` | تنظیمات Alembic شامل مسیر migrationها و logging. |
| `pyproject.toml` | metadata پروژه، تنظیمات pytest، ruff و mypy. |
| `requirements.txt` | dependencyهای runtime و ابزارهای توسعه backend. |

### `app`

| فایل | توضیح |
|---|---|
| `app/__init__.py` | پکیج اصلی app و محل version پروژه. |
| `app/main.py` | ساخت FastAPI app، middlewareها، exception handlerها، static uploads، routerها، health/metrics و taskهای پس‌زمینه مثل expire کردن رزروهای pending. |

### `app/api`

| فایل | توضیح |
|---|---|
| `app/api/__init__.py` | پکیج API. |
| `app/api/deps.py` | dependencyهای مشترک API برای خواندن JWT، دریافت کاربر فعلی، auth اختیاری، و بررسی نقش manager/admin. |
| `app/api/v1/__init__.py` | پکیج routeهای نسخه v1. |
| `app/api/v1/auth.py` | endpointهای ثبت‌نام، ورود، refresh token، پروفایل و avatar. |
| `app/api/v1/vendors.py` | endpointهای لیست/جزئیات/ایجاد/ویرایش/حذف مجموعه و مدیریت تصاویر مجموعه. |
| `app/api/v1/time_slots.py` | endpointهای لیست، ساخت، تولید گروهی، ویرایش، حذف و جزئیات سانس. |
| `app/api/v1/bookings.py` | endpointهای رزرو کاربر، رزروهای completed، رزروهای admin، ساخت رزرو، پرداخت و لغو. |
| `app/api/v1/dashboard.py` | endpointهای آمار عمومی، آمار admin، آمار manager، نمودارها و آمار کاربر. |
| `app/api/v1/reviews.py` | endpointهای نظرها شامل recent، my، create، report، respond و delete. |
| `app/api/v1/settings.py` | endpoint خواندن تنظیمات عمومی سیستم با key برای کاربران لاگین‌شده. |
| `app/api/v1/uploads.py` | آپلود موقت تصویر مجموعه و ذخیره `temp_id` در Redis. |
| `app/api/v1/users.py` | endpointهای مدیریت کاربران توسط admin. |
| `app/api/v1/payments.py` | endpointهای لیست پرداخت‌های کاربر و لیست پرداخت‌های admin. |
| `app/api/v1/wallet.py` | endpointهای موجودی، واریز، برداشت و تاریخچه کیف پول. |
| `app/api/v1/notifications.py` | endpointهای لیست اعلان‌ها، تعداد خوانده‌نشده، read و read-all. |
| `app/api/v1/penalties.py` | endpoint لیست جریمه‌های کاربر. |
| `app/api/v1/contact.py` | endpointهای ثبت پیام تماس عمومی و مدیریت پیام‌ها توسط admin. |
| `app/api/v1/favorites.py` | endpointهای لیست، بررسی، افزودن و حذف علاقه‌مندی‌ها. |
| `app/api/v1/manager.py` | endpointهای مخصوص manager برای رزروها و سانس‌های مجموعه‌های خودش. |
| `app/api/v1/admin.py` | endpointهای مدیریتی سیستم: broadcast، logs، تایید/رد مجموعه، حذف دائمی داده‌ها، تنظیمات و ساخت اولین admin. |

### `app/core`

| فایل | توضیح |
|---|---|
| `app/core/__init__.py` | پکیج core. |
| `app/core/config.py` | تعریف `Settings` و ساخت URLهای PostgreSQL و Redis از env. |
| `app/core/database.py` | ساخت async engine، session factory، base مدل‌ها و dependency `get_db`. |
| `app/core/date_utils.py` | parse کردن فیلترهای تاریخ به شروع/پایان روز. |
| `app/core/exceptions.py` | handlerهای خطای HTTP، validation، integrity، statement و خطای عمومی با پیام‌های فارسی. |
| `app/core/health.py` | probe دیتابیس و Redis و ساخت پاسخ health. |
| `app/core/logger.py` | تابع `log_action` برای ثبت audit log. |
| `app/core/logging_config.py` | تنظیم logging JSON/file و فیلتر کردن health check از logهای شلوغ. |
| `app/core/metrics.py` | middleware و metricهای Prometheus برای requestها، خطاها، latency و metricهای business. |
| `app/core/rate_limiter.py` | تنظیم SlowAPI limiter و response خطای rate limit. |
| `app/core/redis_client.py` | ساخت و بستن client مشترک Redis. |
| `app/core/security.py` | هش رمز عبور، verify، ساخت access/refresh token و decode کردن JWT. |
| `app/core/timezone.py` | helperهای زمان UTC و Iran و تبدیل بین آن‌ها. |
| `app/core/upload.py` | اعتبارسنجی نوع/حجم فایل، ذخیره امن فایل upload و حذف فایل. |

### `app/models`

| فایل | توضیح |
|---|---|
| `app/models/__init__.py` | import مدل‌ها برای Alembic و metadata. |
| `app/models/user.py` | مدل `User` و enum نقش‌ها. |
| `app/models/vendor.py` | مدل `Vendor` و enum نوع ورزش. |
| `app/models/vendor_image.py` | مدل تصاویر مرتب‌شده مجموعه. |
| `app/models/time_slot.py` | مدل سانس‌ها. |
| `app/models/booking.py` | مدل رزرو و enum وضعیت رزرو. |
| `app/models/payment.py` | مدل پرداخت و enum وضعیت پرداخت. |
| `app/models/review.py` | مدل نظر و پاسخ manager/admin. |
| `app/models/penalty.py` | مدل جریمه. |
| `app/models/wallet.py` | مدل کیف پول کاربر. |
| `app/models/wallet_transaction.py` | مدل تراکنش‌های کیف پول. |
| `app/models/notification.py` | مدل اعلان کاربر. |
| `app/models/log.py` | مدل audit log. |
| `app/models/setting.py` | مدل تنظیمات سیستم. |
| `app/models/contact.py` | مدل پیام تماس. |
| `app/models/favorite.py` | مدل علاقه‌مندی کاربر به مجموعه. |

### `app/repositories`

Repositoryها لایه دسترسی مستقیم به دیتابیس هستند و queryهای SQLAlchemy در این لایه متمرکز شده‌اند.

| فایل | توضیح |
|---|---|
| `app/repositories/__init__.py` | پکیج repositoryها. |
| `app/repositories/user_repo.py` | queryهای کاربران: دریافت با id/phone، ساخت، لیست، تغییر نقش، toggle active و شمارش. |
| `app/repositories/vendor_repo.py` | queryهای مجموعه‌ها: لیست با فیلترهای پیشرفته، فاصله مکانی، قیمت، sort، دریافت جزئیات، ساخت/ویرایش/حذف و حداقل قیمت سانس. |
| `app/repositories/time_slot_repo.py` | queryهای سانس‌ها: لیست بر اساس vendor/date، ساخت تکی و batch، بروزرسانی، حذف و بررسی زمان‌های موجود. |
| `app/repositories/booking_repo.py` | queryهای رزرو: لیست کاربر، لیست admin، رزروهای منقضی‌شده، رزروهای completed، آمار status، درآمد روز و رزروهای manager. |
| `app/repositories/payment_repo.py` | queryهای پرداخت: ساخت پرداخت، لیست کاربر، لیست admin، دریافت پرداخت یک booking یا چند booking. |
| `app/repositories/review_repo.py` | queryهای نظرها: لیست vendor/user/recent، دریافت با id یا booking، ساخت و حذف. |
| `app/repositories/penalty_repo.py` | ساخت و لیست جریمه‌های کاربر. |
| `app/repositories/wallet_repo.py` | ساخت یا دریافت wallet، افزایش/کاهش موجودی و لیست تراکنش‌ها. |
| `app/repositories/notification_repo.py` | لیست اعلان‌های کاربر، ایجاد اعلان تکی/همگانی، read/read-all و شمارش unread. |
| `app/repositories/log_repo.py` | ساخت، حذف، پاکسازی و لیست audit logها با فیلتر. |
| `app/repositories/favorite_repo.py` | افزودن/حذف علاقه‌مندی، لیست کاربر، شمارش و بررسی idهای favorite شده. |

### `app/services`

Serviceها منطق اصلی کسب‌وکار را نگه می‌دارند و بین endpointها، repositoryها، cache، notification، wallet و log هماهنگی ایجاد می‌کنند.

| فایل | توضیح |
|---|---|
| `app/services/__init__.py` | پکیج serviceها. |
| `app/services/auth_service.py` | منطق ثبت‌نام، ورود، refresh token و بروزرسانی پروفایل. |
| `app/services/vendor_service.py` | منطق لیست/جزئیات/ساخت/ویرایش/حذف مجموعه، پردازش temp uploadها، کنترل مالکیت و خروجی‌دهی تصاویر. |
| `app/services/time_slot_service.py` | منطق سانس‌ها، cache لیست سانس، تبدیل زمان ایران به UTC و تولید گروهی سانس‌ها. |
| `app/services/booking_service.py` | منطق رزرو، پرداخت، لغو، refund به wallet، جریمه، notification و ساخت خروجی جزئیات رزرو. |
| `app/services/payment_service.py` | درگاه پرداخت mock با موفقیت/شکست تصادفی، تاخیر شبیه‌سازی‌شده و خروجی تراکنش واقعی‌نما. |
| `app/services/review_service.py` | منطق نظرها، بررسی مجاز بودن نظر بر اساس booking و زمان پایان سانس، پاسخ manager/admin و محاسبه rating. |
| `app/services/dashboard_service.py` | محاسبه آمارها، درآمد، recap ماهانه، داده نمودارها و آمار user/manager/admin. |
| `app/services/user_service.py` | منطق مدیریت کاربران مثل تغییر نقش و فعال/غیرفعال کردن با محدودیت‌های ایمنی. |
| `app/services/favorite_service.py` | منطق علاقه‌مندی‌ها روی FavoriteRepo. |
| `app/services/cache_service.py` | helperهای Redis cache برای لیست سانس‌ها و لیست‌های پنل admin. |

### `app/schemas`

Schemaها مدل‌های Pydantic برای ورودی و خروجی endpointها هستند.

| فایل | توضیح |
|---|---|
| `app/schemas/__init__.py` | پکیج schemaها. |
| `app/schemas/auth.py` | schemaهای register، login، refresh، user response، avatar و token. |
| `app/schemas/vendor.py` | schemaهای ایجاد/ویرایش/خروجی مجموعه و تصویر مجموعه. |
| `app/schemas/time_slot.py` | schemaهای ساخت/ویرایش/خروجی/جزئیات سانس و تولید گروهی. |
| `app/schemas/booking.py` | schemaهای ساخت رزرو، خروجی رزرو، پرداخت رزرو و خروجی admin. |
| `app/schemas/payment.py` | schemaهای خروجی پرداخت و لیست پرداخت‌ها. |
| `app/schemas/review.py` | schemaهای ساخت نظر، لیست نظرها، پاسخ به نظر و جزئیات نظر. |
| `app/schemas/user.py` | schemaهای مدیریت کاربران، نقش‌ها، تغییر نقش و toggle active. |
| `app/schemas/wallet.py` | schemaهای wallet، تراکنش، balance، واریز و برداشت. |
| `app/schemas/notification.py` | schemaهای اعلان و لیست اعلان‌ها. |
| `app/schemas/penalty.py` | schemaهای جریمه و لیست جریمه‌ها. |
| `app/schemas/favorite.py` | schemaهای علاقه‌مندی و بررسی favorite status. |
| `app/schemas/manager.py` | schemaهای رزرو و سانس برای پنل manager. |
| `app/schemas/setting.py` | schemaهای خروجی و ویرایش تنظیمات. |
| `app/schemas/contact.py` | schemaهای پیام تماس. |
| `app/schemas/error.py` | schema استاندارد خطاها و خطاهای فیلدی. |

### `migrations`

| فایل | توضیح |
|---|---|
| `migrations/env.py` | تنظیم Alembic برای migration async با metadata مدل‌های SQLAlchemy. |
| `migrations/script.py.mako` | template تولید migration جدید Alembic. |
| `migrations/versions/0001_create_all_tables.py` | migration اولیه برای ساخت جدول‌های اصلی users، vendors، time_slots، payments، bookings، reviews، penalties، wallets، wallet_transactions و logs. |
| `migrations/versions/0002_add_review_response_and_notifications.py` | افزودن `response` به reviews و ساخت جدول notifications. |
| `migrations/versions/0003_migrate_sport_types.py` | مهاجرت از `sport_type` تکی به `sport_types` آرایه‌ای در vendors. |
| `migrations/versions/e0adc347178c_add_soft_delete_and_payment_fields.py` | افزودن contact_messages، favorites، فیلدهای پرداخت و soft deleteهای قدیمی. |
| `migrations/versions/0004_create_settings_table.py` | ساخت جدول settings. |
| `migrations/versions/0005_add_token_version.py` | افزودن `token_version` به users برای کنترل نشست. |
| `migrations/versions/0006_create_vendor_images.py` | ساخت جدول vendor_images. |
| `migrations/versions/0007_remove_soft_delete_columns.py` | حذف ستون‌های soft delete از users، vendors، reviews و bookings. |
| `migrations/versions/0008_add_avatar_url.py` | افزودن `avatar_url` به users. |

### `scripts`

| فایل | توضیح |
|---|---|
| `scripts/__init__.py` | پکیج scriptها. |
| `scripts/seed.py` | seed کردن داده نمونه شامل کاربران، مجموعه‌ها، سانس‌ها، رزروها، پرداخت‌ها و داده‌های کمکی برای توسعه. |
| `scripts/create_admin.py` | ساخت admin از طریق اسکریپت مستقل. |
| `scripts/migrate_logs_to_persian.py` | تبدیل/مهاجرت متن logهای موجود به فرمت فارسی. |

### `tests`

| فایل | توضیح |
|---|---|
| `tests/conftest.py` | fixtureهای تست شامل event loop، دیتابیس تست، AsyncClient، tokenهای user/manager/admin و helper header. |
| `tests/test_health.py` | تست import و عملکرد health check و endpoint `/health`. |
| `tests/test_auth.py` | تست register، login، refresh، me و update profile. |
| `tests/test_vendors.py` | تست لیست، جزئیات، ساخت، ویرایش و حذف مجموعه‌ها. |
| `tests/test_bookings.py` | تست ساخت رزرو، لیست رزرو، جزئیات، پرداخت و لغو رزرو. |

### فایل‌ها و پوشه‌های runtime/generated

این موارد بخشی از source اصلی backend نیستند، ولی در مسیر backend دیده می‌شوند:

- `.venv/**`: محیط مجازی محلی Python و فایل‌های اجرایی نصب‌شده.
- `__pycache__/**`: cache تولیدشده توسط Python.
- `uploads/avatars/.gitkeep` و `uploads/vendors/.gitkeep`: نگهدارنده پوشه‌های upload در git؛ فایل‌های واقعی upload در runtime اضافه می‌شوند.

## نکات رفتاری مهم

- رزرو pending اگر تا ۱۰ دقیقه پرداخت نشود، task پس‌زمینه در `app/main.py` آن را cancel می‌کند و سانس را آزاد می‌کند.
- لیست‌های پرتکرار مثل vendors، bookings، payments، users، notifications، logs، settings و contact messages در Redis cache می‌شوند.
- برای upload تصویر مجموعه ابتدا `/uploads/vendor-image` صدا زده می‌شود؛ سپس `temp_id`های برگشتی هنگام ایجاد vendor مصرف می‌شوند.
- زمان سانس‌ها هنگام ذخیره به UTC تبدیل می‌شود، اما ورودی ساخت/تولید سانس بر اساس زمان ایران در نظر گرفته شده است.
- پرداخت واقعی نیست؛ `PaymentService` یک gateway mock است که موفقیت، شکست، timeout، موجودی ناکافی و fraud را شبیه‌سازی می‌کند.
