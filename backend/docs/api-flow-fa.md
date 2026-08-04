# مستند فارسی APIها و جریان اجرای بک‌اند ToopSet

این سند منطق APIهای بک‌اند را از دید فنی توضیح می‌دهد: هر endpoint چه کسی را می‌پذیرد، چه داده‌ای می‌گیرد، چه اعتبارسنجی‌هایی انجام می‌دهد، چه رکوردهایی را می‌خواند یا تغییر می‌دهد، و در نهایت چه خروجی یا خطایی برمی‌گرداند.

مسیر پایه همه APIهای نسخه یک، مگر موارد سلامت سرویس، این است:

```text
/api/v1
```

## قواعد مشترک

- احراز هویت بیشتر endpointها با `Authorization: Bearer <access_token>` انجام می‌شود.
- refresh token در پاسخ login/register/OTP داخل cookie امن و HttpOnly با نام تنظیم‌شده در `settings.refresh_cookie_name` ذخیره می‌شود.
- پاسخ خطاها از error handler مرکزی عبور می‌کند و معمولا شامل `detail`، `error_code`، `timestamp`، `path` و `request_id` است.
- محدودیت‌های اعتبارسنجی Pydantic قبل از ورود به service اجرا می‌شوند؛ خطای ورودی نامعتبر `422` است.
- خطای دسترسی نداشتن معمولا `403`، نبودن رکورد `404`، احراز هویت نشدن `401` و تداخل داده `409` است.
- مسیرهای لیستی معمولا `skip` و `limit` دارند. بعضی مسیرها cursor هم دارند و `next_cursor` برمی‌گردانند.
- برای داده‌های شخصی کاربر، سرویس‌ها رکورد را با `current_user.id` محدود می‌کنند؛ مثال: رزروهای من، پرداخت‌های من، اعلان‌های من، جریمه‌های من، علاقه‌مندی‌های من، کیف پول و کارت بانکی.
- نقش‌ها:
  - `user`: کاربر عادی و رزروکننده.
  - `manager`: مدیر مجموعه و مالک vendor.
  - `admin`: مدیر سیستم.
- routeهای legacy مثل `/courts` برای سازگاری نگه داشته شده‌اند اما در Swagger نمایش داده نمی‌شوند.

## پردازش‌های پس‌زمینه

- هر ۶۰ ثانیه رزروهای `pending_payment` منقضی‌شده بررسی می‌شوند. اگر پنجره پرداخت تمام شده باشد، رزرو `expired` می‌شود و وضعیت slot دوباره آزاد یا به وضعیت قبلی جایگزینی برگردانده می‌شود.
- هر ۱۲۰ ثانیه metricهای تجاری برای مانیتورینگ refresh می‌شوند.

## Auth

### `POST /api/v1/auth/otp/send`

- دسترسی: عمومی، rate limited.
- ورودی مهم: `phone`.
- فرآیند:
  1. شماره موبایل normalize و با قاعده ۱۱ رقم و شروع با `09` اعتبارسنجی می‌شود.
  2. سرویس OTP برای شماره، کد یک‌بارمصرف می‌سازد و در Redis ذخیره می‌کند.
  3. اگر SMS provider روی mock باشد، کد در پاسخ با `dev_code` برمی‌گردد.
- خروجی: وضعیت ارسال OTP و در محیط mock کد تست.
- خطاهای مهم: شماره نامعتبر `422`، rate limit `429`.

### `POST /api/v1/auth/otp/verify`

- دسترسی: عمومی، rate limited.
- ورودی مهم: `phone`، `code`، `purpose`، و برای کاربر جدید `full_name`.
- فرآیند:
  1. شماره و کد با Redis چک می‌شود.
  2. اگر کاربر وجود نداشته باشد، در صورت داشتن نام کامل ساخته می‌شود.
  3. access token و refresh token ساخته می‌شود.
  4. refresh token در جدول نشست‌ها hash و ذخیره می‌شود.
  5. refresh token در cookie HttpOnly ثبت می‌شود.
  6. اگر هدف `password_reset` باشد، cookie کوتاه‌مدت `password_reset_token` هم ساخته می‌شود.
- خروجی: `access_token` و اطلاعات کاربر؛ refresh token در body برنمی‌گردد.
- خطاهای مهم: کد اشتباه/منقضی `400` یا `401`، شماره نامعتبر `422`.

### `POST /api/v1/auth/login/options`

- دسترسی: عمومی، rate limited.
- ورودی مهم: `phone`.
- فرآیند:
  1. شماره normalize می‌شود.
  2. کاربر با شماره جست‌وجو می‌شود.
  3. اگر کاربر وجود داشته باشد، داشتن رمز واقعی با `OTP_PLACEHOLDER_HASH` مقایسه می‌شود.
- خروجی: `is_new_user` و `has_password`.

### `POST /api/v1/auth/register`

- دسترسی: عمومی، rate limited.
- ورودی مهم: `phone`، `password`، `full_name`.
- فرآیند:
  1. شماره normalize و اعتبارسنجی می‌شود.
  2. وجود شماره در جدول کاربران بررسی می‌شود.
  3. رمز hash می‌شود و کاربر ساخته می‌شود.
  4. access/refresh token ساخته می‌شود.
  5. refresh token به صورت hash در جدول refresh tokenها ذخیره و در cookie گذاشته می‌شود.
  6. audit log ثبت‌نام نوشته می‌شود.
- خروجی: `access_token` و اطلاعات کاربر.
- خطاهای مهم: شماره تکراری `409`، شماره یا رمز نامعتبر `422`.

### `POST /api/v1/auth/login`

- دسترسی: عمومی، rate limited.
- ورودی مهم: `phone` و `password`.
- فرآیند:
  1. شماره normalize می‌شود.
  2. کاربر پیدا و رمز با hash ذخیره‌شده چک می‌شود.
  3. اگر حساب غیرفعال باشد، ورود رد می‌شود.
  4. `token_version` کاربر یک واحد زیاد می‌شود تا access tokenهای قبلی از اعتبار بیفتند.
  5. access/refresh token جدید ساخته و نشست جدید با اطلاعات device/IP/user-agent ذخیره می‌شود.
  6. refresh token در cookie HttpOnly ذخیره می‌شود.
- خروجی: `access_token` و اطلاعات کاربر.
- خطاهای مهم: اطلاعات ورود اشتباه `401`، حساب غیرفعال `403`.

### `POST /api/v1/auth/refresh`

- دسترسی: عمومی با refresh token معتبر.
- ورودی مهم: refresh token از body یا cookie.
- فرآیند:
  1. refresh token از body یا cookie خوانده می‌شود.
  2. JWT با type=`refresh` decode می‌شود.
  3. کاربر و `token_version` چک می‌شود.
  4. hash توکن در جدول refresh tokenها پیدا می‌شود.
  5. توکن قبلی revoke می‌شود و refresh token جدید با همان session id ساخته می‌شود.
  6. رکورد توکن جدید ذخیره و cookie جدید ست می‌شود.
  7. اگر توکن قبلا مصرف شده باشد، reuse مشکوک محسوب و نشست مربوطه revoke می‌شود.
  8. اگر توکن نامعتبر باشد، cookie خراب با `Max-Age=0` پاک می‌شود.
- خروجی: access token جدید.
- خطاهای مهم: توکن نامعتبر/منقضی/مصرف‌شده `401`.

### `GET /api/v1/auth/me`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: access token بررسی می‌شود، کاربر از DB خوانده می‌شود و profile فعلی برگردانده می‌شود.
- خروجی: id، نام، شماره، نقش، وضعیت فعال بودن، avatar و وضعیت داشتن رمز.

### `PATCH /api/v1/auth/profile`

- دسترسی: کاربر لاگین‌شده.
- ورودی مهم: نام، شماره، رمز فعلی، رمز جدید.
- فرآیند:
  1. فقط فیلدهای ارسال‌شده بررسی می‌شوند.
  2. تغییر شماره با normalize و unique بودن شماره کنترل می‌شود.
  3. تغییر رمز نیاز به رمز فعلی دارد، مگر اینکه password reset token معتبر در cookie باشد.
  4. رمز جدید hash می‌شود.
  5. در صورت تغییر رمز، reset cookie پاک می‌شود.
  6. audit log تغییرات ثبت می‌شود.
- خروجی: پروفایل به‌روزشده.

### `POST /api/v1/auth/avatar`

- دسترسی: کاربر لاگین‌شده.
- ورودی مهم: فایل تصویر.
- فرآیند:
  1. پسوند و حجم فایل کنترل می‌شود.
  2. فایل ذخیره می‌شود.
  3. avatar قبلی کاربر، اگر محلی باشد، حذف می‌شود.
  4. `avatar_url` کاربر آپدیت می‌شود.
- خروجی: URL تصویر.
- خطاهای مهم: نوع فایل غیرمجاز یا حجم زیاد `400`.

### `DELETE /api/v1/auth/avatar`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: فایل avatar فعلی حذف می‌شود، `avatar_url` null می‌شود و پاسخ بدون body برمی‌گردد.
- خروجی: `204`.

### `GET /api/v1/auth/sessions`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: refresh tokenهای فعال کاربر از جدول نشست‌ها خوانده و با device/IP/user-agent و آخرین فعالیت برگردانده می‌شوند.
- خروجی: لیست نشست‌های فعال.

### `DELETE /api/v1/auth/sessions/{session_id}`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: فقط نشست متعلق به همان user revoke می‌شود.
- خروجی: پیام خروج از نشست.
- خطاهای مهم: نشست ناموجود یا متعلق به کاربر دیگر `404`.

### `DELETE /api/v1/auth/sessions`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: همه refresh tokenهای کاربر revoke می‌شوند و cookie refresh پاک می‌شود.
- خروجی: پیام خروج از همه نشست‌ها.

### `POST /api/v1/auth/logout`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: refresh token فعلی از cookie خوانده می‌شود، session id آن revoke می‌شود، cookie پاک می‌شود و audit log ثبت می‌شود.
- خروجی: پیام خروج.

## Vendors

### `GET /api/v1/vendors`

- دسترسی: عمومی.
- ورودی مهم: `skip`، `limit`، جست‌وجو، نوع ورزش، وضعیت فعال، تاریخ، بازه قیمت، مختصات و sort.
- فرآیند:
  1. query filterها به repository داده می‌شوند.
  2. vendorهای فعال برای عموم برگردانده می‌شوند؛ دسترسی‌های manager/admin برای دیدن داده‌های بیشتر اعمال می‌شود.
  3. rating، تصاویر، ورزش‌ها، ظرفیت و اطلاعات موقعیت آماده می‌شود.
  4. در صورت وجود پارامترهای مکانی، فاصله محاسبه و sort می‌شود.
- خروجی: لیست صفحه‌بندی‌شده vendorها و total.

### `GET /api/v1/vendors/{vendor_id}`

- دسترسی: عمومی، با محدودیت برای vendor غیرفعال.
- فرآیند:
  1. vendor با روابط لازم خوانده می‌شود.
  2. اگر vendor غیرفعال باشد فقط owner manager یا admin می‌تواند ببیند.
  3. تصاویر، امکانات، نوع ورزش، آدرس، موقعیت، قیمت و rating آماده می‌شود.
- خروجی: جزئیات کامل vendor.
- خطاهای مهم: vendor ناموجود یا غیرفعال برای کاربر عادی `404`.

### `GET /api/v1/vendors/{vendor_id}/reviews`

- دسترسی: عمومی.
- ورودی مهم: `skip`، `limit`.
- فرآیند: reviewهای public همان vendor به صورت صفحه‌بندی‌شده خوانده می‌شود، total جداگانه محاسبه می‌شود و پاسخ ساخته می‌شود.
- خروجی: reviewها، total و pagination.

### `POST /api/v1/vendors`

- دسترسی: manager یا admin.
- ورودی مهم: نام، آدرس، مختصات، نوع ورزش، ظرفیت، قیمت، امکانات، تصاویر.
- فرآیند:
  1. نقش کاربر کنترل می‌شود.
  2. داده‌های vendor validate می‌شود.
  3. vendor با `manager_id=current_user.id` ساخته می‌شود.
  4. تصاویر مرتبط ثبت می‌شوند.
  5. vendor معمولا inactive می‌ماند تا admin approve کند.
  6. cache لیست vendorها invalidate می‌شود.
- خروجی: vendor ساخته‌شده.

### `PATCH /api/v1/vendors/{vendor_id}`

- دسترسی: مالک vendor یا admin.
- فرآیند:
  1. vendor پیدا می‌شود.
  2. مالکیت manager یا admin بودن بررسی می‌شود.
  3. فقط فیلدهای ارسال‌شده آپدیت می‌شوند.
  4. cacheهای مربوط به vendor invalidate می‌شود.
- خروجی: vendor به‌روزشده.

### `DELETE /api/v1/vendors/{vendor_id}`

- دسترسی: مالک vendor یا admin.
- فرآیند: مالکیت بررسی می‌شود، vendor حذف می‌شود، cache پاک می‌شود و پاسخ ۲۰۴ برمی‌گردد.
- خروجی: `204`.

### `POST /api/v1/vendors/{vendor_id}/images`

- دسترسی: مالک vendor یا admin.
- ورودی مهم: URL یا شناسه تصویر آپلودشده.
- فرآیند: مالکیت vendor بررسی می‌شود، تصویر به gallery اضافه می‌شود، ترتیب نمایش تنظیم و cache پاک می‌شود.
- خروجی: vendor یا تصویر به‌روزشده.

### `DELETE /api/v1/vendors/{vendor_id}/images/{image_id}`

- دسترسی: مالک vendor یا admin.
- فرآیند: تصویر باید متعلق به همان vendor باشد؛ رکورد تصویر و فایل محلی حذف می‌شود.
- خروجی: `204`.

### `PUT /api/v1/vendors/{vendor_id}/images/reorder`

- دسترسی: مالک vendor یا admin.
- ورودی مهم: آرایه id تصاویر به ترتیب جدید.
- فرآیند: همه idها باید متعلق به همان vendor باشند؛ order_indexها آپدیت می‌شوند.
- خروجی: `204`.

### legacy: `/api/v1/courts`

- معادل قدیمی `/api/v1/vendors` است و برای سازگاری فرانت/کلاینت‌های قدیمی نگه داشته شده است.

## Time Slots

### `GET /api/v1/vendors/{vendor_id}/slots`

- دسترسی: عمومی.
- ورودی مهم: تاریخ، بازه تاریخ، وضعیت، صفحه‌بندی.
- فرآیند:
  1. vendor بررسی می‌شود.
  2. برای کاربر عمومی فقط سانس‌های قابل رزرو، آینده و داخل پنجره نمایش عمومی برگردانده می‌شود.
  3. manager مالک یا admin می‌تواند برنامه کامل‌تری را ببیند.
  4. وضعیت‌های رزرو/غیرفعال/گذشته در پاسخ مشخص می‌شود.
- خروجی: لیست سانس‌ها و total.

### `POST /api/v1/vendors/{vendor_id}/slots`

- دسترسی: manager مالک vendor یا admin.
- ورودی مهم: start/end time، قیمت، جنسیت، ظرفیت، تنظیم توپ.
- فرآیند:
  1. مالکیت vendor چک می‌شود.
  2. زمان شروع و پایان و عدم تداخل کنترل می‌شود.
  3. slot ساخته و cacheهای مربوط به vendor پاک می‌شود.
- خروجی: slot ساخته‌شده.

### `POST /api/v1/vendors/{vendor_id}/slots/generate`

- دسترسی: manager مالک vendor یا admin.
- ورودی مهم: بازه تاریخ، ساعت شروع/پایان، روزهای هفته، قیمت و تنظیمات تکرار.
- فرآیند:
  1. مالکیت vendor بررسی می‌شود.
  2. برای هر تاریخ/روز مجاز slot candidate ساخته می‌شود.
  3. تداخل‌ها حذف یا خطا می‌شوند.
  4. slotهای معتبر bulk insert می‌شوند.
- خروجی: تعداد یا لیست slotهای ساخته‌شده.

### `PATCH /api/v1/vendors/{vendor_id}/slots/{slot_id}`

- دسترسی: manager مالک vendor یا admin.
- فرآیند:
  1. slot با id خوانده می‌شود.
  2. کنترل می‌شود که `slot.vendor_id` با `vendor_id` مسیر یکی باشد.
  3. مالکیت vendor بررسی می‌شود.
  4. فیلدهای مجاز مثل زمان، قیمت، وضعیت و جنسیت آپدیت می‌شوند.
- خروجی: slot به‌روزشده.

### `GET /api/v1/vendors/{vendor_id}/slots/weekly-schedule-template`

- دسترسی: manager مالک vendor یا admin.
- فرآیند: آخرین نسخه مستقل برنامه هفتگی خوانده می‌شود. فقط اگر هنوز نسخه‌ای وجود نداشته
  باشد، نزدیک‌ترین هفته کامل آینده برای مقداردهی اولیه استفاده می‌شود.
- خروجی: منبع الگو، شناسه نسخه، بازه اعمال و آیتم‌های هفتگی.

### `POST /api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule`

- دسترسی: manager مالک vendor یا admin.
- فرآیند: تداخل رزروها به‌صورت preflight بررسی و سپس Slotهای آزاد به‌شکل تراکنشی
  ایجاد، ویرایش یا حذف می‌شوند. در پایان نسخه مستقل الگو نیز در همان transaction ذخیره می‌شود.
- خروجی: تعداد تغییرها، سانس‌های رزروشده حفظ‌شده و conflictهای غیرمسدودکننده.

### `GET /api/v1/slots/{slot_id}`

- دسترسی: عمومی.
- فرآیند: slot همراه vendor خوانده می‌شود؛ وضعیت رزرو، قیمت، زمان، جنسیت، توپ و اطلاعات vendor در response قرار می‌گیرد.
- خروجی: جزئیات slot.

### legacy: `/api/v1/courts/{vendor_id}/slots`

- معادل قدیمی `/api/v1/vendors/{vendor_id}/slots` است.

## Bookings

### `GET /api/v1/bookings`

- دسترسی: کاربر لاگین‌شده.
- ورودی مهم: `cursor`، `skip`، `limit`، `status`.
- فرآیند:
  1. user از access token گرفته می‌شود.
  2. repository فقط رزروهایی را می‌خواند که `booking.user_id == current_user.id`.
  3. status filter اعمال می‌شود.
  4. slot و vendor برای نمایش لیست آماده می‌شود.
  5. اگر تعداد نتیجه برابر limit باشد، `next_cursor` ساخته می‌شود.
- خروجی: رزروهای همان کاربر، total و cursor.

### `GET /api/v1/bookings/completed`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: فقط رزروهای تکمیل‌شده یا تاریخچه قابل نمایش همان کاربر خوانده می‌شود؛ برای review/history استفاده می‌شود.
- خروجی: لیست رزروهای تکمیل‌شده.

### `GET /api/v1/bookings/all`

- دسترسی: admin.
- ورودی مهم: pagination، status، search.
- فرآیند: همه رزروها با فیلترهای مدیریتی خوانده می‌شوند، پرداخت و اطلاعات slot/vendor/user آماده می‌شود و cache header تنظیم می‌شود.
- خروجی: لیست مدیریتی رزروها.

### `GET /api/v1/bookings/{booking_id}`

- دسترسی: مالک رزرو یا admin.
- فرآیند:
  1. booking خوانده می‌شود.
  2. اگر `booking.user_id` با کاربر فعلی یکی نباشد و کاربر admin نباشد، دسترسی رد می‌شود.
  3. slot، vendor، payment و آخرین refund مرتبط خوانده می‌شود.
- خروجی: جزئیات کامل رزرو.

### `POST /api/v1/bookings`

- دسترسی: کاربر لاگین‌شده.
- ورودی مهم: `slot_id`، نسخه سانس و انتخاب توپ.
- فرآیند:
  1. slot با lock مناسب خوانده می‌شود.
  2. آینده بودن slot، آزاد بودن، فعال بودن vendor و پنجره رزرو عمومی کنترل می‌شود.
  3. قیمت نهایی از قیمت slot و هزینه توپ محاسبه می‌شود.
  4. برای سانس عادی، booking با status=`pending_payment` و زمان انقضای پرداخت ساخته می‌شود.
  5. اگر رزرو قبلی `pending_cancellation` باشد، به‌جای booking یک `booking_hold` ده‌دقیقه‌ای ساخته می‌شود؛ مالک سانس همچنان رزرو قبلی است.
  6. در حالت Hold، `replacement_request` به `held` و slot به `reserving` می‌رود تا خریدار دیگری هم‌زمان وارد پرداخت نشود.
  7. notification و log مرتبط ثبت می‌شود.
- خروجی: رزرو pending با `checkout_type=booking` یا Hold با `checkout_type=replacement_hold`.
- خطاهای مهم: slot پر یا نامعتبر `409`، slot ناموجود `404`.

### `POST /api/v1/bookings/{booking_id}/pay`

- دسترسی: مالک رزرو.
- فرآیند:
  1. booking باید متعلق به کاربر فعلی و در وضعیت `pending_payment` باشد.
  2. مهلت پرداخت چک می‌شود.
  3. پرداخت از سرویس Payment شبیه‌سازی/اجرا می‌شود.
  4. رکورد payment ساخته می‌شود.
  5. booking `confirmed` و slot `reserved` می‌شود.
  6. cacheهای رزرو و پرداخت admin پاک می‌شود.
- خروجی: جزئیات رزرو تأییدشده همراه payment.
- خطاهای مهم: موجودی ناکافی، timeout gateway، fraud، رزرو منقضی.

### `GET /api/v1/bookings/replacement-holds/{hold_id}`

- دسترسی: مالک Hold یا admin.
- خروجی: قیمت snapshotشده، مهلت پرداخت، سانس و وضعیت Hold.

### `POST /api/v1/bookings/replacement-holds/{hold_id}/pay`

- دسترسی: مالک Hold.
- فرآیند:
  1. Hold به‌شکل idempotent قفل و به `processing` می‌رود و تراکنش قبل از تماس درگاه commit می‌شود.
  2. در پرداخت موفق، رزرو قبلی ابتدا `transferred` می‌شود و سپس رزرو جدید مستقیماً `confirmed` ساخته می‌شود.
  3. payment رزرو جدید، refund و penalty رزرو قبلی و انتقال مالکیت slot در یک تراکنش ثبت می‌شوند.
  4. تکرار درخواست پرداخت، همان رزرو قطعی را برمی‌گرداند و payment/refund تکراری نمی‌سازد.
- خروجی: رزرو جدید تأییدشده.

### `DELETE /api/v1/bookings/replacement-holds/{hold_id}`

- دسترسی: مالک Hold یا admin.
- فرآیند: Hold فعال لغو، درخواست جایگزینی دوباره `open` و slot دوباره `pending_cancellation` می‌شود؛ رزرو قبلی تغییر نمی‌کند.

### `GET /api/v1/bookings/{booking_id}/cancellation-terms`

- دسترسی: مالک رزرو یا admin.
- فرآیند:
  1. مالکیت رزرو چک می‌شود.
  2. وضعیت رزرو بررسی می‌شود.
  3. اگر slot شروع شده باشد، لغو رد می‌شود.
  4. اگر رزرو پرداخت‌نشده باشد، لغو بدون نیاز به کارت مجاز است.
  5. برای رزرو تأییدشده، داشتن کارت بانکی verified در پاسخ مشخص می‌شود.
  6. اگر بیش از ۴۸ ساعت مانده باشد، refund با کسر ۱۰٪ محاسبه می‌شود.
  7. اگر ۴۸ ساعت یا کمتر مانده باشد، حالت انتظار جایگزین برگردانده می‌شود.
- خروجی: امکان لغو، mode، مبلغ جریمه، مبلغ برگشت، نیاز به کارت و قوانین.

### `POST /api/v1/bookings/{booking_id}/cancel`

- دسترسی: مالک رزرو.
- ورودی مهم: علت لغو، و در صورت نیاز شماره کارت.
- فرآیند:
  1. booking با lock خوانده و مالکیت بررسی می‌شود.
  2. cancellation terms دوباره محاسبه می‌شود.
  3. برای رزرو پرداخت‌نشده، booking cancelled و slot آزاد می‌شود.
  4. برای رزرو تأییدشده بیش از ۴۸ ساعت، کارت بانکی verified الزام می‌شود؛ اگر شماره کارت داده شده باشد همان لحظه lookup و confirm می‌شود.
  5. refund و penalty ساخته می‌شود.
  6. wallet/refund/settlement status طبق سیاست مالی به‌روزرسانی می‌شود.
  7. notification و log ثبت می‌شود.
  8. برای لغو نزدیک به زمان سانس، رزرو به `pending_cancellation` می‌رود و یک `replacement_request` با جریمه، refund و deadline snapshotشده ساخته می‌شود.
  9. اگر تا شروع سانس جایگزین قطعی پیدا نشود، request منقضی، رزرو اولیه دوباره `confirmed` و slot دوباره `reserved` می‌شود؛ refund و penalty ساخته نمی‌شوند.
- خروجی: رزرو به‌روزشده با وضعیت لغو/انتظار جایگزین و اطلاعات refund.

## Dashboard

### `GET /api/v1/dashboard/stats`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: آمار عمومی متناسب با نقش کاربر از DashboardService خوانده می‌شود.
- خروجی: شمارنده‌ها و وضعیت کلی dashboard.

### `GET /api/v1/dashboard/user-stats`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: آمار شخصی کاربر مثل رزروها، پرداخت‌ها، reviewها، penaltyها و wallet محاسبه می‌شود.
- خروجی: آمار dashboard کاربر.

### `GET /api/v1/dashboard/manager-stats`

- دسترسی: manager یا admin.
- فرآیند: vendorهای manager و رزرو/slot/revenue مربوط به همان vendorها محاسبه می‌شود.
- خروجی: آمار پنل manager.

### `GET /api/v1/dashboard/manager/revenue`

- دسترسی: manager یا admin.
- ورودی مهم: بازه تاریخ.
- فرآیند: درآمد رزروهای vendorهای manager در بازه زمانی محاسبه می‌شود.
- خروجی: گزارش درآمد.

### `GET /api/v1/dashboard/admin-stats`

- دسترسی: admin.
- ورودی مهم: بازه تاریخ.
- فرآیند: آمار کل سیستم مثل کاربران، vendorها، رزروها، پرداخت‌ها و درآمد محاسبه می‌شود.
- خروجی: آمار مدیریتی.

### `GET /api/v1/dashboard/admin/monthly-recap`

- دسترسی: admin.
- فرآیند: داده‌های خلاصه ماهانه برای dashboard admin جمع‌آوری می‌شود.
- خروجی: recap ماهانه.

### `GET /api/v1/dashboard/admin/charts`

- دسترسی: admin.
- فرآیند: datasetهای نمودارها ساخته و برای کاهش فشار خواندن cache می‌شود.
- خروجی: داده نمودارهای admin.

## Reviews

### `GET /api/v1/reviews/recent`

- دسترسی: عمومی.
- ورودی مهم: `limit`.
- فرآیند: آخرین reviewهای عمومی با سقف limit خوانده می‌شوند.
- خروجی: لیست reviewهای جدید.

### `GET /api/v1/reviews/my`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: فقط reviewهایی خوانده می‌شود که `review.user_id == current_user.id`.
- خروجی: reviewهای کاربر.

### `POST /api/v1/reviews`

- دسترسی: کاربر لاگین‌شده.
- ورودی مهم: `booking_id`، rating، متن review.
- فرآیند:
  1. booking باید متعلق به کاربر باشد.
  2. booking باید وضعیت/زمان مناسب review داشته باشد.
  3. duplicate review برای همان booking رد می‌شود.
  4. rating validate می‌شود.
  5. review ساخته و rating vendor به‌روزرسانی یا برای محاسبه بعدی آماده می‌شود.
- خروجی: review ساخته‌شده.

### `POST /api/v1/reviews/{review_id}/report`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: review خوانده می‌شود و گزارش moderation برای آن ثبت یا شمارنده report به‌روزرسانی می‌شود.
- خروجی: پیام موفقیت.

### `POST /api/v1/reviews/{review_id}/respond`

- دسترسی: manager مالک vendor review یا admin.
- فرآیند: review خوانده می‌شود، مالکیت vendor کنترل می‌شود و پاسخ manager روی review ثبت/آپدیت می‌شود.
- خروجی: review به‌روزشده.

### `DELETE /api/v1/reviews/{review_id}`

- دسترسی: نویسنده review، manager مجاز یا admin طبق policy سرویس.
- فرآیند: review پیدا می‌شود، مجوز حذف بررسی می‌شود، رکورد حذف و cache/rating مرتبط پاک می‌شود.
- خروجی: `204`.

## Settings

### `GET /api/v1/settings/public/hero-slides`

- دسترسی: عمومی.
- فرآیند: setting با key مربوط به اسلایدهای صفحه ورود خوانده می‌شود؛ اگر مقدار نبود، آرایه خالی برمی‌گردد.
- خروجی: لیست hero slideها.

### `GET /api/v1/settings/public/contact`

- دسترسی: عمومی.
- فرآیند: settingهای تماس پشتیبانی مثل تلفن، ایمیل و messenger خوانده می‌شود.
- خروجی: اطلاعات تماس عمومی.

### `GET /api/v1/settings/public/text/{key}`

- دسترسی: عمومی.
- فرآیند: فقط keyهای مجاز مثل `rules_text` و `privacy_text` بدون auth خوانده می‌شوند.
- خروجی: متن setting.
- خطاهای مهم: key غیرمجاز `404` یا `403`.

### `GET /api/v1/settings/{key}`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: setting با key موردنظر خوانده می‌شود.
- خروجی: setting.
- خطاهای مهم: key ناموجود `404`.

## Uploads

### `POST /api/v1/uploads/vendor-image`

- دسترسی: manager یا admin.
- ورودی مهم: فایل تصویر.
- فرآیند:
  1. extension و حجم فایل بررسی می‌شود.
  2. فایل به عنوان upload موقت vendor ذخیره می‌شود.
  3. temp id و URL فایل برگردانده می‌شود تا بعدا در ساخت/ویرایش vendor استفاده شود.
- خروجی: `temp_id` و `url`.

### legacy: `POST /api/v1/uploads/court-image`

- معادل قدیمی upload تصویر vendor است.

## Users

### `GET /api/v1/users`

- دسترسی: admin.
- ورودی مهم: pagination، search، role، active.
- فرآیند: کاربران با فیلترها خوانده می‌شوند، cache header تنظیم می‌شود و خروجی مدیریتی ساخته می‌شود.
- خروجی: لیست کاربران و total.

### `GET /api/v1/users/{user_id}`

- دسترسی: admin.
- فرآیند: کاربر با جزئیات مدیریتی خوانده می‌شود.
- خروجی: جزئیات کاربر.

### `PATCH /api/v1/users/{user_id}/role`

- دسترسی: admin.
- ورودی مهم: role جدید.
- فرآیند: role validate می‌شود، کاربر آپدیت می‌شود، token/session اثرپذیر می‌شود و audit log ثبت می‌شود.
- خروجی: کاربر به‌روزشده.

### `PATCH /api/v1/users/{user_id}/toggle-active`

- دسترسی: admin.
- فرآیند: وضعیت `is_active` کاربر برعکس می‌شود؛ حساب غیرفعال دیگر نمی‌تواند فعالیت عادی داشته باشد.
- خروجی: کاربر به‌روزشده.

## Payments

### `GET /api/v1/payments/my`

- دسترسی: کاربر لاگین‌شده.
- ورودی مهم: pagination و status.
- فرآیند: فقط paymentهایی خوانده می‌شود که به رزروهای همان user وصل هستند؛ booking/vendor/slot context اضافه می‌شود.
- خروجی: لیست پرداخت‌های کاربر.

### `GET /api/v1/payments/all`

- دسترسی: admin.
- فرآیند: همه paymentها با فیلتر و pagination خوانده می‌شوند، cache header تنظیم می‌شود.
- خروجی: لیست مدیریتی پرداخت‌ها.

## Refundهای کاربر

### `GET /api/v1/refunds/my`

- دسترسی: کاربر لاگین‌شده.
- ورودی مهم: pagination، status و جست‌وجوی نام مجموعه.
- فرآیند: فقط refundهایی خوانده می‌شوند که `user_id` آن‌ها برابر کاربر جاری است.
- خروجی: مبلغ پرداختی، جریمه، مبلغ بازگشتی، وضعیت، کارت مقصد ۴+۴ mask‌شده، تاریخ‌های درخواست/تأیید/واریز و کد رهگیری.

## Wallet و کارت بانکی

### `POST /api/v1/wallet/bank-cards/lookup`

- دسترسی: کاربر لاگین‌شده.
- ورودی مهم: `card_number`.
- فرآیند:
  1. شماره کارت normalize می‌شود و باید ۱۶ رقم باشد.
  2. provider استعلام مالک کارت صدا زده می‌شود.
  3. شماره کارت encrypt، masked و fingerprint می‌شود.
  4. چون هر کاربر فقط یک کارت دارد، اگر کارت قبلی وجود داشته باشد همان رکورد آپدیت و به `pending_confirmation` برمی‌گردد.
  5. اگر کارت قبلی نباشد، رکورد جدید ساخته می‌شود.
  6. audit log استعلام کارت نوشته می‌شود.
- خروجی: کارت در وضعیت pending همراه شماره masked و نام دارنده.

### `GET /api/v1/wallet/bank-cards/verified`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: کارت verified همان user خوانده می‌شود؛ اگر وجود نداشته باشد null برمی‌گردد.
- خروجی: کارت verified یا null.

### `POST /api/v1/wallet/bank-cards/{card_id}/confirm`

- دسترسی: مالک کارت.
- فرآیند:
  1. کارت با id خوانده می‌شود.
  2. باید `card.user_id == current_user.id` باشد.
  3. کارت باید در وضعیت `pending_confirmation` باشد.
  4. وضعیت به `verified` تغییر می‌کند و `verified_at` ثبت می‌شود.
  5. audit log تأیید کارت نوشته می‌شود.
- خروجی: کارت verified.

### `GET /api/v1/wallet/balance`

- دسترسی: فقط development/bootstrap با gateway mock.
- فرآیند: wallet کاربر خوانده می‌شود؛ اگر وجود نداشته باشد lazily ساخته می‌شود.
- خروجی: موجودی wallet.

### `POST /api/v1/wallet/deposit`

- دسترسی: فقط development/bootstrap با gateway mock.
- ورودی مهم: amount و description اختیاری.
- فرآیند: amount باید مثبت باشد؛ balance افزایش می‌یابد و transaction از نوع deposit ثبت می‌شود.
- خروجی: موجودی جدید.

### `POST /api/v1/wallet/withdraw`

- دسترسی: فقط development/bootstrap با gateway mock.
- فرآیند: amount مثبت و موجودی کافی بررسی می‌شود؛ balance کم و transaction withdraw ثبت می‌شود.
- خروجی: موجودی جدید.

### `GET /api/v1/wallet/transactions`

- دسترسی: فقط development/bootstrap با gateway mock.
- ورودی مهم: `limit` و `offset`.
- فرآیند: wallet کاربر پیدا/ساخته می‌شود و transactionهای همان wallet خوانده می‌شوند.
- خروجی: لیست تراکنش‌ها.

## Notifications

### `GET /api/v1/notifications`

- دسترسی: کاربر لاگین‌شده.
- ورودی مهم: pagination، unread only، search، type.
- فرآیند: فقط اعلان‌های `current_user.id` خوانده می‌شود و filterها اعمال می‌شوند.
- خروجی: لیست اعلان‌ها و total.

### `GET /api/v1/notifications/unread-count`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: تعداد اعلان‌های خوانده‌نشده همان user محاسبه می‌شود.
- خروجی: count.

### `POST /api/v1/notifications/{notification_id}/read`

- دسترسی: مالک اعلان.
- فرآیند: اعلان فقط با شرط id و `user_id=current_user.id` به read تغییر می‌کند؛ اگر متعلق به کاربر نباشد ۴۰۴ برمی‌گردد.
- خروجی: اعلان به‌روزشده.

### `POST /api/v1/notifications/read-all`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: همه اعلان‌های unread همان user خوانده‌شده می‌شوند و cache اعلان‌ها پاک می‌شود.
- خروجی: تعداد یا پیام موفقیت.

## Penalties

### `GET /api/v1/penalties`

- دسترسی: کاربر لاگین‌شده.
- ورودی مهم: pagination.
- فرآیند: فقط penaltyهای `current_user.id` خوانده می‌شود؛ این رکوردها معمولا از لغو رزرو و سیاست جریمه ساخته می‌شوند.
- خروجی: لیست جریمه‌های کاربر.

## Contact

### `POST /api/v1/contact`

- دسترسی: عمومی، rate limited.
- ورودی مهم: نام، ایمیل، شماره، موضوع، پیام.
- فرآیند: داده validate می‌شود، پیام تماس در DB ذخیره می‌شود و cache پیام‌های admin invalidate می‌شود.
- خروجی: پیام موفقیت یا رکورد ساخته‌شده.

### `GET /api/v1/contact/admin`

- دسترسی: admin.
- فرآیند: پیام‌های تماس جدیدتر به قدیمی‌تر با pagination خوانده می‌شوند و cache header تنظیم می‌شود.
- خروجی: لیست پیام‌ها.

### `DELETE /api/v1/contact/admin/{message_id}`

- دسترسی: admin.
- فرآیند: پیام حذف می‌شود؛ اگر قبلا حذف شده باشد رفتار idempotent دارد و cache پاک می‌شود.
- خروجی: `204`.

## Favorites

### `GET /api/v1/favorites`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: vendorهای favorite شده توسط همان user با pagination خوانده می‌شود.
- خروجی: لیست favoriteها.

### `GET /api/v1/favorites/check`

- دسترسی: کاربر لاگین‌شده.
- ورودی مهم: `vendor_ids` یا legacy `court_ids`.
- فرآیند: برای idهای ارسال‌شده، favorite بودنشان برای `current_user.id` بررسی می‌شود.
- خروجی: map یا لیست وضعیت favorite.

### `POST /api/v1/favorites/{vendor_id}`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: وجود vendor بررسی می‌شود، اگر favorite قبلا وجود نداشته باشد ساخته می‌شود.
- خروجی: favorite ساخته‌شده.

### `DELETE /api/v1/favorites/{vendor_id}`

- دسترسی: کاربر لاگین‌شده.
- فرآیند: favorite همان user و vendor حذف می‌شود.
- خروجی: `204`.

## Manager

### `GET /api/v1/manager/bookings`

- دسترسی: manager یا admin.
- ورودی مهم: vendor، status، date range، search، pagination.
- فرآیند: فقط bookingهای vendorهایی خوانده می‌شوند که manager مالک آنهاست؛ admin می‌تواند گسترده‌تر ببیند.
- خروجی: لیست رزروهای پنل manager.

### `POST /api/v1/manager/bookings/manual`

- دسترسی: manager مالک vendor یا admin.
- ورودی مهم: slot و نام/شماره مشتری.
- فرآیند:
  1. slot و vendor خوانده می‌شوند.
  2. مالکیت manager بررسی می‌شود.
  3. آزاد بودن slot کنترل می‌شود.
  4. booking با source=`manager_manual` و بدون پرداخت آنلاین ساخته می‌شود.
  5. slot reserved می‌شود.
- خروجی: booking ساخته‌شده.

### `POST /api/v1/manager/bookings/recurring`

- دسترسی: manager مالک vendor یا admin.
- ورودی مهم: بازه تاریخ، روزهای هفته، ساعت، اطلاعات مشتری، `allow_partial`.
- فرآیند:
  1. slotهای مطابق تاریخ/روز/ساعت پیدا می‌شوند.
  2. مالکیت همه slotها کنترل می‌شود.
  3. تداخل‌ها بررسی می‌شود.
  4. اگر `allow_partial=false` باشد هر conflict کل عملیات را fail می‌کند.
  5. برای slotهای معتبر booking دستی تکرارشونده ساخته می‌شود.
- خروجی: نتیجه ساخت رزروهای دوره‌ای و موارد conflict.

### `POST /api/v1/manager/bookings/{booking_id}/cancel`

- دسترسی: manager مالک vendor booking یا admin.
- ورودی مهم: علت لغو، release slot.
- فرآیند:
  1. booking خوانده می‌شود.
  2. بررسی می‌شود booking مربوط به vendorهای manager باشد.
  3. وضعیت booking و slot طبق درخواست لغو می‌شود.
  4. اگر رزرو آنلاین/پرداخت‌شده باشد refund و هزینه سایت طبق FinanceService ساخته می‌شود.
  5. slot cancellation record برای بررسی admin ساخته می‌شود.
  6. notification/SMS review state ثبت می‌شود.
- خروجی: booking/لغو به‌روزشده.

### `GET /api/v1/manager/finance/summary`

- دسترسی: manager یا admin.
- ورودی مهم: vendor، date_from، date_to.
- فرآیند: درآمد آنلاین موفق، مبلغ تسویه‌شده، در انتظار تسویه، قابل تسویه و bookingهای هنوز قابل تسویه نبودن محاسبه می‌شود.
- خروجی: خلاصه مالی manager.

### `POST /api/v1/manager/settlements`

- دسترسی: manager مالک vendor.
- ورودی مهم: vendor، بازه تاریخ، note.
- فرآیند:
  1. مالکیت vendor بررسی می‌شود.
  2. bookingهای آنلاین، پرداخت‌شده، پایان‌یافته و `not_settled` پیدا می‌شوند.
  3. settlement request ساخته می‌شود.
  4. برای هر booking، settlement item ساخته و وضعیت booking به `settlement_requested` تغییر می‌کند.
- خروجی: درخواست تسویه.

### `GET /api/v1/manager/settlements`

- دسترسی: manager یا admin.
- فرآیند: درخواست‌های تسویه مربوط به manager فعلی خوانده می‌شوند؛ admin در مسیر admin همه را می‌بیند.
- خروجی: لیست settlementها.

### `GET /api/v1/manager/slots`

- دسترسی: manager یا admin.
- ورودی مهم: vendor، date range، reserved، pagination.
- فرآیند: slotهای vendorهای manager خوانده می‌شوند و اگر رزرو داشته باشند اطلاعات booking/customer نیز اضافه می‌شود.
- خروجی: لیست سانس‌های مدیریتی.

## Admin

### `POST /api/v1/admin/notifications/broadcast`

- دسترسی: admin.
- ورودی مهم: type و message.
- فرآیند: برای همه کاربران notification ساخته می‌شود، audit log ثبت و cache اعلان‌های admin پاک می‌شود.
- خروجی: `success` و تعداد کاربران دریافت‌کننده.

### `GET /api/v1/admin/logs`

- دسترسی: admin.
- ورودی مهم: cursor، skip، limit، action، user_id، date range.
- فرآیند: cache بررسی می‌شود؛ اگر miss بود LogRepo لاگ‌ها را می‌خواند، user name اضافه می‌شود و نتیجه cache می‌شود.
- خروجی: لاگ‌ها، total و next_cursor.

### `DELETE /api/v1/admin/logs/clear`

- دسترسی: admin.
- فرآیند:
  1. تلاش حذف در audit log ثبت می‌شود.
  2. اگر محیط development/bootstrap و `allow_audit_log_deletion` فعال نباشد، حذف رد می‌شود.
  3. در محیط مجاز همه logها پاک و cache invalid می‌شود.
- خروجی: `204`.

### `DELETE /api/v1/admin/logs/{log_id}`

- دسترسی: admin.
- فرآیند: مثل clear، ابتدا تلاش حذف ثبت می‌شود، guard محیطی چک می‌شود و سپس log موردنظر حذف می‌شود.
- خروجی: `204`.

### `GET /api/v1/admin/pending-vendors`

- دسترسی: admin.
- فرآیند: vendorهای inactive با manager و اطلاعات اصلی خوانده می‌شوند؛ cache HIT/MISS تنظیم می‌شود.
- خروجی: لیست vendorهای در انتظار تأیید.

### legacy: `GET /api/v1/admin/pending-courts`

- معادل قدیمی `/api/v1/admin/pending-vendors` است و فقط برای سازگاری نگه داشته شده است.

### `POST /api/v1/admin/vendors/{vendor_id}/approve`

- دسترسی: admin.
- فرآیند: vendor پیدا و فعال می‌شود، cacheهای vendor و pending پاک می‌شود و audit log ثبت می‌شود.
- خروجی: vendor فعال‌شده.

### legacy: `POST /api/v1/admin/courts/{vendor_id}/approve`

- معادل قدیمی approve کردن vendor است.

### `POST /api/v1/admin/vendors/{vendor_id}/reject`

- دسترسی: admin.
- فرآیند: vendor pending حذف می‌شود، فایل تصاویرش حذف می‌شود، cache پاک و audit log ثبت می‌شود.
- خروجی: پیام یا `204`.

### legacy: `POST /api/v1/admin/courts/{vendor_id}/reject`

- معادل قدیمی reject کردن vendor است.

### `DELETE /api/v1/admin/vendors/{vendor_id}`

- دسترسی: admin.
- فرآیند: vendor و فایل‌های gallery حذف می‌شوند؛ برای حذف نهایی venue از پلتفرم استفاده می‌شود.
- خروجی: `204`.

### legacy: `DELETE /api/v1/admin/courts/{vendor_id}`

- معادل قدیمی حذف دائمی vendor است.

### `DELETE /api/v1/admin/users/{user_id}`

- دسترسی: admin.
- فرآیند:
  1. کاربر پیدا می‌شود.
  2. وابستگی‌هایی مثل vendor، booking، review و penalty بررسی می‌شود.
  3. اگر وابستگی مهم وجود داشته باشد حذف رد می‌شود تا داده مالی/عملیاتی خراب نشود.
  4. در صورت امن بودن، کاربر حذف می‌شود.
- خروجی: `204`.

### `DELETE /api/v1/admin/users/{user_id}/force`

- دسترسی: admin.
- فرآیند: حذف اجباری کاربر با ترتیب امن FK انجام می‌شود؛ vendorها، slotها، bookingها، paymentها، penaltyها، reviewها، فایل‌ها و نشست‌ها پاک می‌شوند.
- خروجی: نتیجه حذف.

### `DELETE /api/v1/admin/reviews/{review_id}`

- دسترسی: admin.
- فرآیند: review بدون توجه به مالکیت عادی حذف می‌شود و cache/rating مربوطه پاک می‌شود.
- خروجی: `204`.

### `GET /api/v1/admin/settings`

- دسترسی: admin.
- فرآیند: همه settingها به ترتیب key خوانده می‌شوند؛ cache و `X-Cache` استفاده می‌شود.
- خروجی: لیست settingها.

### `PUT /api/v1/admin/settings/{setting_id}`

- دسترسی: admin.
- ورودی مهم: value جدید.
- فرآیند: setting پیدا می‌شود، مقدار قبلی و جدید در audit log ثبت می‌شود، cache settingها پاک می‌شود.
- خروجی: setting به‌روزشده.

### `POST /api/v1/admin/settings/seed`

- دسترسی: admin.
- فرآیند: default settingهای نبودنی مثل نام پلتفرم، تماس، قوانین، privacy، کمیسیون و hero slides ساخته می‌شوند.
- خروجی: تعداد یا پیام seed.

### `GET /api/v1/admin/refunds`

- دسترسی: admin.
- ورودی مهم: status، type، pagination.
- فرآیند: refundها با user/vendor/slot خوانده می‌شوند و مبالغ، وضعیت، جریمه و tracking code آماده می‌شود.
- خروجی: لیست refundها.

### `PATCH /api/v1/admin/refunds/{refund_id}`

- دسترسی: admin.
- ورودی مهم: status، admin_note، payment_tracking_code.
- فرآیند:
  1. refund پیدا می‌شود.
  2. status آپدیت می‌شود.
  3. اگر status approved یا paid شود timestamp مربوط ثبت می‌شود.
  4. tracking code و note ذخیره می‌شود.
  5. audit log ثبت می‌شود.
- خروجی: refund به‌روزشده.

### `GET /api/v1/admin/refunds/{refund_id}/destination`

- دسترسی: فقط admin.
- فرآیند: کارت مقصد snapshot‌شده Refund برای واریز دستی decrypt می‌شود، پاسخ با `Cache-Control: no-store` برمی‌گردد و مشاهده در audit log ثبت می‌شود.
- خروجی: شماره کامل فقط برای عملیات پرداخت دستی، شماره mask‌شده و نام دارنده. پاسخ عمومی Refund هرگز شماره کامل را برنمی‌گرداند.

### `GET /api/v1/admin/manager-cancellations`

- دسترسی: admin.
- فرآیند: لغوهایی که manager ایجاد کرده با customer، vendor، manager، علت، هزینه و وضعیت review پیامک/notification خوانده می‌شود.
- خروجی: لیست لغوهای manager.

### `GET /api/v1/admin/settlements`

- دسترسی: admin.
- فرآیند: همه settlement requestها با vendor و manager خوانده می‌شوند.
- خروجی: لیست تسویه‌ها.

### `PATCH /api/v1/admin/settlements/{settlement_id}`

- دسترسی: admin.
- ورودی مهم: status، approved_amount، admin_note، payment_tracking_code.
- فرآیند:
  1. settlement پیدا می‌شود.
  2. وضعیت جدید اعمال می‌شود.
  3. اگر approved شود، مبلغ تأییدشده ثبت و bookingها به `included_in_settlement` می‌روند.
  4. اگر paid شود، `paid_at` ثبت و bookingها `settled` می‌شوند.
  5. اگر rejected شود، bookingها دوباره `not_settled` می‌شوند.
  6. audit log ثبت می‌شود.
- خروجی: settlement به‌روزشده.

### `POST /api/v1/admin/hero-images/upload`

- دسترسی: admin.
- ورودی مهم: فایل تصویر.
- فرآیند:
  1. فایل از نظر نوع و محتوا validate می‌شود.
  2. فایل در `frontend/public/uploads/hero` ذخیره می‌شود.
  3. URL تصویر به setting `login_hero_slides` اضافه می‌شود.
  4. cache setting پاک می‌شود.
- خروجی: URL تصویر و setting به‌روزشده.

### `DELETE /api/v1/admin/settings/{setting_id}/hero-images/{index}`

- دسترسی: admin.
- فرآیند: setting خوانده می‌شود، URL با index مشخص از آرایه حذف می‌شود، فایل محلی متناظر در صورت وجود پاک می‌شود و setting ذخیره می‌شود.
- خروجی: setting به‌روزشده یا `204`.

### `POST /api/v1/admin/seed-admin`

- دسترسی: bootstrap فقط با header `X-Bootstrap-Secret`.
- فرآیند:
  1. bootstrap secret با مقدار تنظیمات به صورت امن مقایسه می‌شود.
  2. اگر admin قبلا وجود داشته باشد، endpoint غیرفعال محسوب می‌شود.
  3. شماره موبایل normalize، رمز hash و کاربر admin اولیه ساخته می‌شود.
- خروجی: admin ساخته‌شده.

### `POST /api/v1/admin/users/{user_id}/revoke-sessions`

- دسترسی: admin.
- فرآیند: همه refresh tokenهای کاربر هدف revoke می‌شود و `token_version` زیاد می‌شود تا access tokenهای قبلی هم روی درخواست‌های بعدی رد شوند.
- خروجی: پیام موفقیت.

## Health

### `GET /health`

- دسترسی: عمومی برای uptime probe.
- فرآیند: سلامت API و dependencyهای اصلی مثل database بررسی می‌شود.
- خروجی: وضعیت سلامت سرویس.
