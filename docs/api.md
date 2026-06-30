# مستند API و امنیت ToopSet

این سند بر اساس routerهای `backend/app/api/v1` و سرویس‌های `backend/app/services` نوشته شده است. همه endpointهای نسخه فعلی زیر prefix کلی `/api/v1` mount شده‌اند.

## احراز هویت و OAuth

پیاده‌سازی فعلی OAuth2 کامل نیست. سیستم از `HTTPBearer` در FastAPI و JWTهای access/refresh استفاده می‌کند. یعنی کلاینت باید header زیر را بفرستد:

```http
Authorization: Bearer <access_token>
```

سطوح dependency:

| dependency | کاربرد |
| --- | --- |
| `get_current_user_optional` | کاربر اختیاری؛ اگر token معتبر نبود `None` برمی‌گرداند |
| `get_current_user` | کاربر لاگین‌کرده لازم است |
| `get_current_manager` | نقش `manager` یا `admin` لازم است |
| `get_current_admin` | فقط نقش `admin` لازم است |

JWTها با HS256 ساخته می‌شوند و claimهای `sub`, `role`, `ver`, `iat`, `nbf`, `jti`, `iss`, `aud`, `exp`, `type` دارند. در decode فعلی، `aud` و `iss` verify نمی‌شوند و validation دستی برای exp/iat/nbf انجام می‌شود. Refresh tokenها در دیتابیس به صورت SHA-256 hash ذخیره می‌شوند و rotation/replay detection دارند.

## امنیت عمومی

- Rate limiting با `slowapi` و Redis/in-memory fallback انجام می‌شود.
- middlewareهای امنیتی headerهایی مثل HSTS، CSP، X-Frame-Options، X-Content-Type-Options، Permissions-Policy و Referrer-Policy اضافه می‌کنند.
- uploadها محدودیت حجم ۵MB، extension validation و magic-byte/SVG sanitization در `app.core.upload` دارند.
- لاگ‌های امنیتی و عملیاتی در جدول `logs` ثبت می‌شوند.
- CORS در production نباید `*` باشد؛ validation محیط این مورد را reject می‌کند، مگر با dev defaults.

## ارزیابی امنیتی کوتاه

| بخش | وضعیت | توضیح |
| --- | --- | --- |
| OAuth | ناقص از نظر استاندارد OAuth2 | Bearer JWT وجود دارد، ولی flow استاندارد OAuth2/OIDC، scopes، authorization server و introspection وجود ندارد |
| JWT access token | قابل قبول | type claim، exp، token_version و key rotation با `SECRET_KEY_PREVIOUS` دارد |
| Refresh token | خوب | hash storage، rotation، revoke، replay detection و session_id دارد |
| RBAC | قابل قبول | user/manager/admin از طریق dependencyها enforce می‌شود |
| Upload | نسبتاً خوب | محدودیت حجم، extension و sanitization وجود دارد |
| پرداخت | mock | برای production نیازمند درگاه واقعی، callback verification و idempotency است |
| کارت بانکی | متوسط | encrypt/mask/fingerprint دارد، اما کلید از `SECRET_KEY` مشتق می‌شود و provider فعلاً mock است |

## Auth API

Base: `/api/v1/auth`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `POST /otp/send` | public, rate `3/min` | ارسال کد ۶ رقمی OTP؛ در mock مقدار `dev_code` برمی‌گردد |
| `POST /otp/verify` | public, rate `10/min` | تایید OTP؛ اگر کاربر جدید باشد با `full_name` می‌سازد و token pair می‌دهد |
| `POST /register` | public, rate `3/min` | ثبت‌نام با phone/password/full_name و صدور token pair |
| `POST /login` | public, rate `5/min` | بررسی رمز bcrypt، افزایش `token_version` و صدور token pair |
| `POST /refresh` | public, rate `10/min` | rotation refresh token؛ token قدیمی revoke و token جدید ذخیره می‌شود |
| `GET /me` | user | اطلاعات کاربر فعلی |
| `PATCH /profile` | user | تغییر نام و در صورت ارسال رمز فعلی، تغییر رمز |
| `POST /avatar` | user | آپلود avatar و حذف avatar قبلی |
| `DELETE /avatar` | user | حذف avatar |
| `GET /sessions` | user | لیست sessionهای فعال |
| `DELETE /sessions/{session_id}` | user | revoke یک session |
| `DELETE /sessions` | user | logout همه sessionها و افزایش `token_version` |
| `POST /logout` | user | logout session جاری؛ اگر refresh token در Authorization باشد همان session revoke می‌شود، وگرنه همه sessionها revoke می‌شوند |

منطق سرویس‌ها: `AuthService` مسئول ثبت‌نام، login، refresh rotation، logout و update profile است. `OtpService` کد را با TTL پنج دقیقه در Redis ذخیره می‌کند، ارسال هر شماره را ۳ بار در ۱۰ دقیقه محدود می‌کند و بعد از ۵ خطای تایید در ۱۵ دقیقه lockout می‌دهد.

## Vendors API

Base: `/api/v1/vendors`. مسیرهای legacy زیر `/api/v1/courts` هم وجود دارند ولی در OpenAPI مخفی هستند.

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /vendors` | public/optional user | لیست مجموعه‌ها با cursor, search, sport type, active, date, price, distance و sort |
| `GET /vendors/{vendor_id}` | public/optional user | جزئیات مجموعه |
| `GET /vendors/{vendor_id}/reviews` | public | نظرات مجموعه |
| `POST /vendors` | manager/admin dependency، ولی سرویس فقط manager را می‌پذیرد | ساخت مجموعه جدید با وضعیت `is_active=false` تا تایید ادمین |
| `PATCH /vendors/{vendor_id}` | manager/admin | ویرایش مجموعه؛ مدیر فقط مجموعه خودش را ویرایش می‌کند و نمی‌تواند `is_active` را تغییر دهد |
| `DELETE /vendors/{vendor_id}` | manager/admin | حذف مجموعه و فایل‌های تصاویر |
| `POST /vendors/{vendor_id}/images` | manager/admin | افزودن URL تصویر و محاسبه order بعدی |
| `DELETE /vendors/{vendor_id}/images/{image_id}` | manager/admin | حذف تصویر و فایل |
| `PUT /vendors/{vendor_id}/images/reorder` | manager/admin | تغییر ترتیب تصاویر |

منطق سرویس: کاربر عمومی فقط مجموعه‌های فعال را می‌بیند. manager فقط مجموعه‌های خودش را می‌بیند. ساخت مجموعه با temp uploadهای Redis یا URL مستقیم تصویر کار می‌کند. بعد از ساخت، تایید ادمین لازم است.

## Time Slots API

Base: `/api/v1/vendors/{vendor_id}/slots`. مسیر legacy `/api/v1/courts/{vendor_id}/slots` مخفی است. جزئیات تک‌سانس زیر `/api/v1/slots` است.

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /vendors/{vendor_id}/slots` | public/optional user | لیست سانس‌های مجموعه با cursor/date/skip/limit و Redis cache برای صفحه اول |
| `POST /vendors/{vendor_id}/slots` | manager/admin | ساخت سانس |
| `POST /vendors/{vendor_id}/slots/generate` | manager/admin | ساخت گروهی سانس‌ها بر اساس بازه تاریخ، روزهای هفته و template |
| `PATCH /vendors/{vendor_id}/slots/{slot_id}` | manager/admin | ویرایش سانس اگر رزرو نشده باشد |
| `DELETE /vendors/{vendor_id}/slots/{slot_id}` | manager/admin | حذف سانس اگر رزرو نشده باشد |
| `GET /slots/{slot_id}` | public/optional user | جزئیات سانس برای flow رزرو |

منطق سرویس: manager باید مالک مجموعه باشد یا admin باشد. تا قبل از تایید مجموعه، مدیریت سانس مجاز نیست. ورودی زمان ایران به UTC تبدیل می‌شود. سانس رزروشده قابل ویرایش یا حذف نیست. cache لیست سانس بعد از تغییرات invalidate می‌شود.

## Bookings API

Base: `/api/v1/bookings`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /bookings` | user | رزروهای کاربر با cursor/status |
| `GET /bookings/completed` | user | رزروهای قابل ثبت نظر |
| `GET /bookings/all` | admin | همه رزروها با search/status و cache کوتاه |
| `GET /bookings/{booking_id}` | user/admin owner check | جزئیات رزرو |
| `POST /bookings` | user | ساخت رزرو با `slot_id`, `version`, `with_ball`, `participants_count` |
| `POST /bookings/{booking_id}/pay` | user owner | پرداخت رزرو |
| `POST /bookings/{booking_id}/cancel` | user owner یا admin | لغو رزرو |

منطق اصلی:

- هنگام ساخت رزرو، slot با `for_update=True` خوانده می‌شود.
- مجموعه باید فعال باشد و سانس `closed` نباشد.
- اگر `with_ball=true` باشد، `ball_available` باید true باشد.
- `version` سانس باید با مقدار فرستاده‌شده برابر باشد؛ در غیر این صورت conflict برمی‌گردد.
- تعداد شرکت‌کنندگان نباید از ظرفیت مجموعه بیشتر باشد.
- رزرو در ابتدا `pending_payment` است و `expires_at` ده دقیقه بعد تنظیم می‌شود.
- پرداخت از `PaymentService` mock استفاده می‌کند و ممکن است خطای موجودی، timeout، fraud یا generic بدهد.
- پس از پرداخت موفق، payment ثبت و booking به `confirmed` و slot به `reserved` تغییر می‌کند.
- لغو رزرو confirmed نیازمند کارت بانکی verified است.
- اگر تا شروع سانس ۴۸ ساعت یا کمتر مانده باشد، رزرو به `pending_cancellation` می‌رود تا کاربر دیگری جایگزین شود.
- اگر بیشتر از ۴۸ ساعت مانده باشد، ۱۰٪ جریمه ثبت و ۹۰٪ مبلغ به کیف پول برمی‌گردد.

## Reviews API

Base: `/api/v1/reviews`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /reviews/recent` | optional user/public | آخرین نظرات |
| `GET /reviews/my` | user | نظرات کاربر |
| `POST /reviews` | user | ثبت نظر برای booking |
| `POST /reviews/{review_id}/report` | admin | علامت‌گذاری نظر به عنوان reported |
| `POST /reviews/{review_id}/respond` | manager/admin | پاسخ مدیر یا ادمین به نظر |
| `DELETE /reviews/{review_id}` | admin | حذف نظر |

منطق سرویس: نظر فقط برای رزرو `confirmed` خود کاربر و حداقل دو ساعت بعد از پایان سانس مجاز است. برای هر booking فقط یک review ثبت می‌شود. پس از ایجاد یا حذف نظر، `average_rating` مجموعه دوباره محاسبه می‌شود و reviewهای reported از میانگین کنار گذاشته می‌شوند.

## Favorites API

Base: `/api/v1/favorites`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /favorites` | user | لیست علاقه‌مندی‌ها |
| `GET /favorites/check?vendor_ids=1,2` | user | بررسی favorite بودن چند مجموعه |
| `POST /favorites/{vendor_id}` | user | افزودن علاقه‌مندی |
| `DELETE /favorites/{vendor_id}` | user | حذف علاقه‌مندی |

قید یکتای دیتابیس از duplicate جلوگیری می‌کند.

## Wallet API

Base: `/api/v1/wallet`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `POST /wallet/bank-cards/lookup` | user | استعلام مالک کارت و ذخیره کارت pending |
| `POST /wallet/bank-cards/{card_id}/confirm` | user owner | تایید کارت برای refund |
| `GET /wallet/balance` | user | موجودی کیف پول |
| `POST /wallet/deposit` | user | واریز mock/manual به کیف پول |
| `POST /wallet/withdraw` | user | برداشت از کیف پول با کنترل موجودی |
| `GET /wallet/transactions` | user | تاریخچه تراکنش‌ها |

منطق کارت بانکی: شماره کارت normalize می‌شود، باید ۱۶ رقم باشد، سپس با provider mock استعلام می‌شود. شماره کامل encrypt، نسخه mask شده برای نمایش و fingerprint برای uniqueness ذخیره می‌شود.

## Payments API

Base: `/api/v1/payments`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /payments/my` | user | پرداخت‌های کاربر با search/status |
| `GET /payments/all` | admin | همه پرداخت‌ها با cache و search/status |

این API فقط گزارش پرداخت می‌دهد؛ انجام پرداخت از مسیر `POST /bookings/{booking_id}/pay` انجام می‌شود.

## Notifications API

Base: `/api/v1/notifications`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /notifications` | user | لیست اعلان‌ها با unread/search/type |
| `GET /notifications/unread-count` | user | تعداد اعلان خوانده‌نشده |
| `POST /notifications/{notification_id}/read` | user owner check | خوانده‌شدن یک اعلان |
| `POST /notifications/read-all` | user | خوانده‌شدن همه اعلان‌ها |

نکته امنیتی: در `mark_read` ابتدا اعلان mark می‌شود و بعد owner check انجام می‌شود. چون session در خطا rollback می‌شود، اثر DB معمولاً rollback می‌شود، اما از نظر طراحی بهتر است owner check قبل از تغییر state انجام شود.

## Penalties API

Base: `/api/v1/penalties`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /penalties` | user | لیست جریمه‌های کاربر |

## Dashboard API

Base: `/api/v1/dashboard`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /dashboard/stats` | user | آمار کلی: مجموعه‌های فعال، رزرو امروز، درآمد امروز، کاربران، رزروهای اخیر و مجموعه‌های محبوب |
| `GET /dashboard/manager/revenue` | manager/admin | گزارش درآمد مدیر بر اساس بازه تاریخ |
| `GET /dashboard/admin-stats` | admin | آمار ادمین با فیلتر تاریخ |
| `GET /dashboard/manager-stats` | manager/admin | آمار مدیر |
| `GET /dashboard/admin/monthly-recap` | admin | خلاصه ماهانه |
| `GET /dashboard/admin/charts` | admin | داده نمودارهای ادمین |
| `GET /dashboard/user-stats` | user | آمار کاربر |

بیشتر پاسخ‌ها cache می‌شوند تا dashboard سبک بماند.

## Manager API

Base: `/api/v1/manager`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /manager/bookings` | manager/admin dependency | رزروهای مجموعه‌های مدیر با فیلتر status/vendor/date/search |
| `GET /manager/slots` | manager/admin dependency | سانس‌های مجموعه‌های مدیر با فیلتر vendor/reserved/date |

نکته: queryها بر اساس `Vendor.manager_id == current_user.id` فیلتر می‌شوند؛ بنابراین admin در این endpointها فقط داده‌هایی را می‌بیند که خودش manager آن‌هاست، نه همه سیستم.

## Users API

Base: `/api/v1/users`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /users` | admin | لیست کاربران با search/role/is_active |
| `GET /users/{user_id}` | admin | جزئیات کاربر |
| `PATCH /users/{user_id}/role` | admin | تغییر نقش کاربر |
| `PATCH /users/{user_id}/toggle-active` | admin | فعال/غیرفعال کردن کاربر |

منطق امنیتی: ادمین نمی‌تواند نقش خودش را تغییر دهد یا خودش را غیرفعال کند. آخرین ادمین هم قابل downgrade یا disable نیست.

## Settings API

Base: `/api/v1/settings`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /settings/public/hero-slides` | public | تصاویر صفحه login/register |
| `GET /settings/public/contact` | public | اطلاعات تماس عمومی |
| `GET /settings/public/text/{key}` | public | متن‌های public فقط برای `rules_text` و `privacy_text` |
| `GET /settings/{key}` | user | خواندن تنظیم با key |

## Contact API

Base: `/api/v1/contact`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `POST /contact` | public, rate `5/min` | ثبت پیام تماس |
| `GET /contact/admin` | admin | لیست پیام‌های تماس |
| `DELETE /contact/admin/{message_id}` | admin | حذف پیام تماس |

## Uploads API

Base: `/api/v1/uploads`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `POST /uploads/vendor-image` | manager/admin, rate `10/min` | آپلود تصویر مجموعه، ذخیره URL در Redis با TTL یک ساعت |
| `POST /uploads/court-image` | legacy hidden | alias قدیمی مسیر بالا |

پس از upload، خروجی شامل `temp_id` است. هنگام ساخت vendor، `temp_id`ها از Redis خوانده و به `vendor_images` منتقل می‌شوند.

## Admin API

Base: `/api/v1/admin`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `POST /admin/notifications/broadcast` | admin | ارسال اعلان همگانی به همه کاربران |
| `GET /admin/logs` | admin | مشاهده audit logs با فیلتر cursor/action/user/date |
| `DELETE /admin/logs/clear` | admin | پاکسازی همه لاگ‌ها |
| `DELETE /admin/logs/{log_id}` | admin | حذف یک لاگ |
| `GET /admin/pending-vendors` | admin | لیست مجموعه‌های در انتظار تایید |
| `POST /admin/vendors/{vendor_id}/approve` | admin | فعال‌سازی مجموعه |
| `POST /admin/vendors/{vendor_id}/reject` | admin | رد و حذف مجموعه در انتظار |
| `DELETE /admin/vendors/{vendor_id}` | admin | حذف دائمی مجموعه |
| `DELETE /admin/users/{user_id}` | admin | حذف کاربر فقط اگر وابستگی مهم نداشته باشد |
| `DELETE /admin/users/{user_id}/force` | admin | حذف اجباری کاربر و داده‌های وابسته |
| `DELETE /admin/reviews/{review_id}` | admin | حذف دائمی نظر |
| `GET /admin/settings` | admin | لیست تنظیمات |
| `PUT /admin/settings/{setting_id}` | admin | تغییر مقدار تنظیم |
| `POST /admin/settings/seed` | admin | ساخت تنظیمات پیش‌فرض |
| `POST /admin/hero-images/upload` | admin | آپلود تصویر hero در `frontend/public/uploads/hero` |
| `DELETE /admin/settings/{setting_id}/hero-images/{index}` | admin | حذف تصویر hero با index |
| `POST /admin/seed-admin` | public guarded by condition | ساخت اولین ادمین فقط وقتی هیچ admin وجود ندارد |
| `POST /admin/users/{user_id}/revoke-sessions` | admin | revoke همه sessionهای یک کاربر و افزایش token_version |

مسیرهای legacy مخفی: `/admin/pending-courts`, `/admin/courts/{id}/approve`, `/admin/courts/{id}/reject`, `/admin/courts/{id}`.

ریسک‌ها و نکات:

- `seed-admin` public است، اما فقط وقتی هیچ ادمینی وجود ندارد کار می‌کند. در production بهتر است بعد از bootstrap حذف یا پشت secret/internal network قرار گیرد.
- `force delete user` بسیار پرریسک است و داده‌ها را با raw SQL حذف می‌کند؛ audit log دارد ولی نیازمند policy عملیاتی است.
- upload hero مستقیم داخل `frontend/public/uploads/hero` می‌نویسد. در deploy containerized باید volume/permission آن روشن باشد.

## Endpointهای خارج از `/api/v1`

| متد و مسیر | دسترسی | کار |
| --- | --- | --- |
| `GET /` | public | redirect به `/docs` |
| `GET /health` | public | health check دیتابیس/Redis/سرویس |
| `GET /metrics` | public در کد فعلی | خروجی Prometheus |

نکته امنیتی: `/metrics` در production بهتر است پشت شبکه داخلی، reverse proxy allowlist یا auth قرار گیرد.
