# بررسی کامل منطق کسب‌وکار پروژه

## محدوده بررسی

این بررسی روی Backend، قرارداد OpenAPI، Migrationهای Alembic، تست‌ها و مصرف API در
Frontend انجام شد. فایل‌های راهنمای ریشه و دو بخش پروژه، تمام اسناد متنی `docs` و
`backend/docs`، مدل‌ها، schemaها، repositoryها، serviceها، routeها، job انقضای رزرو،
seedها، تمام Migrationها و صفحه‌ها/کامپوننت‌های مرتبط Frontend خوانده شدند. فایل‌های
PDF موجود نیز از نظر عنوان و دامنه سند بررسی شدند؛ قانون اجرایی از متن جدیدتر، تست‌ها
و invariantهای پیاده‌شده استنتاج شد.

مبنای این گزارش وضعیت worktree موجود در تاریخ ۲۶ تیر ۱۴۰۵ است. worktree از ابتدا
تغییرات در حال توسعه، از جمله زمان‌بندی هفتگی و فرایند جایگزینی، داشت؛ این تغییرات
حذف یا بازنویسی نشدند و اصلاحات این بررسی روی همان وضعیت تکمیل شدند.

موارد بررسی‌شده شامل جریان‌های User، Vendor/Manager و Admin، کنترل دسترسی مستقیم API،
چرخه رزرو/پرداخت/لغو/جایگزینی/Refund/Settlement، هم‌زمانی، idempotency، زمان و timezone،
صفحه‌بندی، cache، آپلود فایل، OTP و session، OpenAPI، دیتابیس تازه و ارتقای دیتابیس
موجود است. در OpenAPI فعلی ۱۲۲ operation عمومی و چند alias قدیمی مخفی وجود دارد.

## معماری و جریان کلی سیستم

Backend یک برنامه FastAPI async است. routeها ورودی را با Pydantic اعتبارسنجی و نقش را
با dependencyها کنترل می‌کنند؛ serviceها قانون دامنه و transaction را هدایت می‌کنند؛
repositoryها query و row lock را در SQLAlchemy اجرا می‌کنند؛ PostgreSQL آخرین لایه
حفظ invariant و Redis محل OTP، rate limit، cache و مالکیت آپلود موقت است. Alembic
تاریخچه schema را نگه می‌دارد. Frontend یک برنامه Next.js است که از wrapper مرکزی
`lib/api.ts` استفاده می‌کند.

جریان اصلی رزرو این است:

```text
open slot -> pending_payment booking + reserving slot
          -> successful payment -> confirmed booking + reserved slot
          -> timeout/failure     -> expired/cancelled booking + open slot

confirmed booking -> cancellation before 48h -> cancelled + 10% penalty + 90% refund
                  -> cancellation inside 48h -> pending_cancellation
                  -> replacement hold paid   -> transferred old booking + confirmed new booking
```

قفل سطر slot/booking، advisory lock مخصوص schedule و unique/partial unique indexهای
دیتابیس با هم جلوی double booking، double payment و درخواست مالی تکراری را می‌گیرند.
کار خارجی واقعی هنوز وجود ندارد: gateway، SMS، lookup کارت و wallet فقط mock هستند؛
پس از این اصلاحات برنامه در محیط غیرتوسعه با provider ساختگی بالا نمی‌آید.

## نقش‌ها و سطح دسترسی‌ها

### User

- ثبت‌نام با رمز یا ورود/ثبت‌نام OTP، access token کوتاه‌عمر و refresh token چرخشی دارد.
- sessionهای فعال قابل مشاهده و ابطال‌اند؛ replay یک refresh token موجب ابطال خانواده
  session می‌شود. ورود جدید session قدیمی همان client را باطل می‌کند.
- پروفایل و avatar خود را مدیریت می‌کند؛ شماره تلفن تکراری با `409` رد می‌شود.
- vendor فعال و slot عمومی را می‌بیند، favorite می‌کند، رزرو و پرداخت می‌کند و فقط به
  رزرو، پرداخت، refund، penalty و notification خود دسترسی دارد.
- لغو رزرو پرداخت‌نشده بدون refund است. لغو رزرو قطعی بیش از ۴۸ ساعت مانده، refund
  نوددرصد و penalty ده‌درصد دارد. در ۴۸ ساعت پایانی رزرو منتظر جایگزین می‌شود.
- review فقط برای رزرو تکمیل‌شده و متعلق به همان کاربر، بعد از مهلت تعریف‌شده، یک‌بار
  ثبت می‌شود. کاربر عادی حق report/delete مدیریتی یا پاسخ vendor را ندارد.

### Vendor

نقش فنی این بازیگر در کد `manager` و موجودیت کسب‌وکار آن `Vendor` است.

- کاربر درخواست manager می‌دهد؛ Admin آن را با قفل و transition نهایی تأیید یا رد می‌کند.
- manager فقط vendor متعلق به `manager_id` خود را ایجاد/ویرایش/حذف می‌کند و تصاویر و
  slotهای همان vendor را مدیریت می‌کند؛ Admin می‌تواند مسیر نظارتی را اجرا کند.
- الگوی هفتگی از یک تاریخ آینده به‌صورت transaction واحد اعمال می‌شود. overlap، روز
  هفته، محدوده تاریخ، slot رزروشده و درخواست هم‌زمان کنترل می‌شوند.
- slot رزروشده حذف مستقیم نمی‌شود و فیلدهای حفاظتی آن با payload قابل جعل نیستند.
- manager رزرو دستی/دوره‌ای، فهرست رزرو، لغو با refund کامل برای پرداخت آنلاین، گزارش
  مالی و درخواست settlement دارد. داده vendor دیگر با owner check در service/repository
  قابل دسترسی نیست.
- مدل فعلی عضو/کارمند چندگانه برای Vendor ندارد؛ فقط یک `manager_id` مالک است. افزودن
  RBAC داخلی vendor یک قابلیت محصولی جدید است، نه نقص قابل اصلاح بدون تصمیم محصول.

### Admin

- Admin همه کاربران، vendorها، رزروها، پرداخت‌ها، refundها، settlementها، درخواست‌های
  manager، تنظیمات، پیام‌ها و logهای audit را می‌بیند یا مدیریت می‌کند.
- ایجاد Admin اولیه فقط با حالت development/bootstrap صریح، secret و advisory lock
  مجاز است. در production قابل حدس یا باز نیست.
- حذف‌های مخرب، تغییر نقش، فعال/غیرفعال‌سازی، تأیید/رد، refund/settlement و پاک‌سازی
  log کنترل نقش و audit دارند. آخرین Admin با lock قابل حذف یا تنزل نیست.
- داده حساس کارت به‌صورت mask شده در API و جزئیات audit بازنویسی‌شده ثبت می‌شود؛
  پارامترهای SQL در exception log مخفی شده‌اند.

## فهرست APIهای بررسی‌شده

راهنمای وضعیت: «تأیید» یعنی قرارداد، نقش، schema و مسیر service/repository بررسی شد؛
«اصلاح و تست» یعنی در همین بررسی نقص قطعی آن مسیر یا زیرساخت مشترکش اصلاح و regression
test اجرا شد. خطاهای validation معمولاً `422`، عدم احراز `401`، منع نقش/مالکیت `403`،
منبع ناموجود `404` و تعارض state/idempotency `409` است؛ پاسخ خطا schema مشترک دارد.

| Method | Path | Role | هدف | وضعیت بررسی | مشکل یا توضیح |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/otp/send` | Public | ارسال OTP | اصلاح و تست | مصرف اتمیک، قفل تلاش و rate limit |
| POST | `/api/v1/auth/otp/verify` | Public | ورود/ثبت‌نام OTP | اصلاح و تست | replay و session قدیمی مهار شد |
| POST | `/api/v1/auth/login/options` | Public | روش‌های ورود | تأیید | افشای حداقلی وضعیت حساب |
| POST | `/api/v1/auth/register` | Public | ثبت‌نام | اصلاح و تست | uniqueness شماره و session |
| POST | `/api/v1/auth/login` | Public | ورود رمزی | اصلاح و تست | session rotation و audit شکست |
| POST | `/api/v1/auth/refresh` | Cookie | چرخش token | اصلاح و تست | row lock و reuse detection |
| GET | `/api/v1/auth/me` | Authenticated | هویت جاری | تأیید | خروجی فاقد secret |
| PATCH | `/api/v1/auth/profile` | Authenticated | ویرایش پروفایل | اصلاح و تست | شماره تکراری اکنون 409 |
| POST/DELETE | `/api/v1/auth/avatar` | Authenticated | مدیریت avatar | اصلاح و تست | validation فایل؛ شکاف file/DB در ریسک‌ها |
| GET/DELETE | `/api/v1/auth/sessions` | Authenticated | فهرست/ابطال همه sessionها | اصلاح و تست | session جاری درست تشخیص داده می‌شود |
| DELETE | `/api/v1/auth/sessions/{session_id}` | Owner | ابطال یک session | تأیید | owner-scoped |
| POST | `/api/v1/auth/logout` | Authenticated | خروج session جاری | اصلاح و تست | refresh جاری باطل می‌شود |
| GET | `/api/v1/vendors` | Public/Optional auth | جست‌وجوی vendor | اصلاح و تست | distance/filter pagination و cache نقش‌دار |
| POST | `/api/v1/vendors` | Manager/Admin | ساخت vendor | اصلاح و تست | مالکیت و temp image claim |
| GET | `/api/v1/vendors/{vendor_id}` | Public/Owner/Admin | جزئیات vendor | اصلاح و تست | vendor غیرفعال فقط privileged |
| PATCH/DELETE | `/api/v1/vendors/{vendor_id}` | Owner/Admin | ویرایش/حذف vendor | اصلاح و تست | IDOR، تاریخچه رزرو و cascade |
| GET | `/api/v1/vendors/{vendor_id}/reviews` | Public | reviewهای vendor | تأیید | cursor محدود |
| POST | `/api/v1/vendors/{vendor_id}/images` | Owner/Admin | اتصال تصویر | اصلاح و تست | temp ID مالک‌دار و path معتبر |
| DELETE | `/api/v1/vendors/{vendor_id}/images/{image_id}` | Owner/Admin | حذف تصویر | اصلاح و تست | traversal و مالکیت |
| PUT | `/api/v1/vendors/{vendor_id}/images/reorder` | Owner/Admin | ترتیب تصاویر | اصلاح و تست | ID نامعتبر رد می‌شود |
| GET | `/api/v1/vendors/{vendor_id}/slots` | Public/Owner/Admin | فهرست سانس | اصلاح و تست | timezone ایران و cursor مرکب |
| POST | `/api/v1/vendors/{vendor_id}/slots` | Owner/Admin | ساخت سانس | اصلاح و تست | overlap و lock schedule |
| POST | `/api/v1/vendors/{vendor_id}/slots/generate` | Owner/Admin | تولید گروهی سانس | اصلاح و تست | حداکثر ۱۸۶ روز و transaction |
| GET | `/api/v1/vendors/{vendor_id}/slots/weekly-schedule-template` | Owner/Admin | آخرین الگو | اصلاح و تست | مالکیت و version |
| POST | `/api/v1/vendors/{vendor_id}/slots/apply-weekly-schedule` | Owner/Admin | اعمال هفتگی | اصلاح و تست | اتمیک، serialize، حفظ رزروشده‌ها |
| PATCH | `/api/v1/vendors/{vendor_id}/slots/{slot_id}` | Owner/Admin | ویرایش سانس | اصلاح و تست | جعل status/رزرو و overlap مسدود |
| GET | `/api/v1/slots/{slot_id}` | Public/Optional auth | جزئیات سانس | تأیید | visibility vendor رعایت می‌شود |
| GET | `/api/v1/bookings` | User | رزروهای من | اصلاح و تست | cursor و دسته‌بندی وضعیت |
| POST | `/api/v1/bookings` | User | ایجاد رزرو/hold جایگزین | اصلاح و تست | row lock و double booking |
| GET | `/api/v1/bookings/completed` | User | رزرو قابل review | تأیید | owner-scoped |
| GET | `/api/v1/bookings/all` | Admin | همه رزروها | اصلاح و تست | صفحه‌بندی descending صحیح |
| GET/DELETE | `/api/v1/bookings/replacement-holds/{hold_id}` | Owner | مشاهده/لغو hold | اصلاح و تست | state و owner lock |
| POST | `/api/v1/bookings/replacement-holds/{hold_id}/pay` | Owner | پرداخت جایگزین | اصلاح و تست | انتقال اتمیک و refund یکتا |
| GET | `/api/v1/bookings/{booking_id}` | Owner/Admin | جزئیات رزرو | تأیید | IDOR کنترل شد |
| POST | `/api/v1/bookings/{booking_id}/pay` | Owner | پرداخت رزرو | اصلاح و تست | payment موفق تکراری ناممکن |
| POST | `/api/v1/bookings/{booking_id}/cancel` | Owner | لغو رزرو | اصلاح و تست | ۴۸h/۱۰٪، Decimal و state lock |
| GET | `/api/v1/bookings/{booking_id}/cancellation-terms` | Owner | پیش‌نمایش لغو | اصلاح و تست | با اجرای واقعی هم‌قانون شد |
| GET | `/api/v1/dashboard/stats` | Authenticated | آمار عمومی نقش | اصلاح و تست | AsyncSession هم‌زمان حذف شد |
| GET | `/api/v1/dashboard/manager/revenue` | Manager/Admin | درآمد vendor | اصلاح و تست | scope و تاریخ معتبر |
| GET | `/api/v1/dashboard/admin-stats` | Admin | آمار Admin | اصلاح و تست | datetime آگاه از timezone |
| GET | `/api/v1/dashboard/manager-stats` | Manager/Admin | آمار manager | اصلاح و تست | vendor scope صحیح |
| GET | `/api/v1/dashboard/admin/monthly-recap` | Admin | جمع‌بندی ماهانه | تأیید | ماه میلادی؛ سؤال محصولی باقی است |
| GET | `/api/v1/dashboard/admin/charts` | Admin | نمودارها | اصلاح و تست | queryهای یک session ترتیبی شد |
| GET | `/api/v1/dashboard/user-stats` | Authenticated | آمار کاربر | اصلاح و تست | owner scope و timezone |
| GET | `/api/v1/reviews/recent` | Public/Optional auth | reviewهای اخیر | اصلاح و تست | گزارش‌شده‌ها پنهان |
| GET | `/api/v1/reviews/my` | User | reviewهای من | تأیید | cursor محدود |
| POST | `/api/v1/reviews` | User | ثبت review | اصلاح و تست | booking lock و rating اتمیک |
| POST | `/api/v1/reviews/{review_id}/report` | Admin | علامت گزارش | اصلاح و تست | نقش واقعی Admin؛ rating بازحساب شد |
| POST | `/api/v1/reviews/{review_id}/respond` | Vendor owner/Admin | پاسخ vendor | تأیید | IDOR vendor کنترل شد |
| DELETE | `/api/v1/reviews/{review_id}` | Admin | حذف review | اصلاح و تست | rating بعد از حذف بازحساب شد |
| GET | `/api/v1/settings/public/hero-slides` | Public | تصاویر hero | تأیید | فقط کلید عمومی |
| GET | `/api/v1/settings/public/contact` | Public | اطلاعات تماس | تأیید | allowlist خروجی |
| GET | `/api/v1/settings/public/text/{key}` | Public | متن قواعد/حریم خصوصی | تأیید | allowlist کلید |
| GET | `/api/v1/settings/{key}` | Authenticated | خواندن setting | تأیید | حساسیت کلیدها نیازمند توسعه آینده |
| POST | `/api/v1/uploads/vendor-image` | Manager/Admin | آپلود موقت | اصلاح و تست | MIME/size/مالکیت و جلوگیری از claim دیگران |
| GET | `/api/v1/users` | Admin | فهرست کاربران | اصلاح و تست | cursor و داده حساس |
| GET | `/api/v1/users/{user_id}` | Admin | جزئیات کاربر | تأیید | Admin-only |
| PATCH | `/api/v1/users/{user_id}/role` | Admin | تغییر نقش | اصلاح و تست | حفاظت آخرین Admin |
| PATCH | `/api/v1/users/{user_id}/toggle-active` | Admin | فعال‌سازی حساب | اصلاح و تست | قفل و ابطال session |
| GET | `/api/v1/payments/my` | User | پرداخت‌های من | تأیید | owner scope |
| GET | `/api/v1/payments/all` | Admin | همه پرداخت‌ها | اصلاح و تست | cursor درست و mask اطلاعات |
| GET | `/api/v1/refunds/my` | User | تاریخچه بازگشت وجه خود | اصلاح و تست | owner scope، کارت ۴+۴، تاریخ و کد رهگیری |
| POST | `/api/v1/wallet/bank-cards/lookup` | User | استعلام کارت | اصلاح و تست | فقط development/mock؛ production fail closed |
| GET | `/api/v1/wallet/bank-cards/verified` | User | کارت تأییدشده | تأیید | شماره mask شده |
| POST | `/api/v1/wallet/bank-cards/{card_id}/confirm` | Owner | تأیید کارت | تأیید | owner-scoped |
| GET | `/api/v1/wallet/balance` | User | موجودی | اصلاح و تست | mock مشخص |
| POST | `/api/v1/wallet/deposit` | User | واریز mock | اصلاح و تست | در non-dev اکنون 404 |
| POST | `/api/v1/wallet/withdraw` | User | برداشت mock | اصلاح و تست | Decimal/موجودی و non-dev guard |
| GET | `/api/v1/wallet/transactions` | User | تاریخچه wallet | اصلاح و تست | bounds صفحه‌بندی |
| GET | `/api/v1/notifications` | Authenticated | اعلان‌ها | اصلاح و تست | query ترتیبی و owner scope |
| GET | `/api/v1/notifications/unread-count` | Authenticated | تعداد خوانده‌نشده | تأیید | owner scope |
| POST | `/api/v1/notifications/{notification_id}/read` | Owner | خواندن اعلان | تأیید | IDOR کنترل شد |
| POST | `/api/v1/notifications/read-all` | Authenticated | خواندن همه | تأیید | فقط اعلان‌های همان user |
| GET | `/api/v1/penalties` | User | جریمه‌های من | اصلاح و تست | یک penalty برای هر booking |
| POST | `/api/v1/contact` | Public | پیام تماس | اصلاح و تست | طول/email/rate limit |
| GET | `/api/v1/contact/admin` | Admin | پیام‌ها | تأیید | Admin-only |
| DELETE | `/api/v1/contact/admin/{message_id}` | Admin | حذف پیام | تأیید | Admin-only |
| GET | `/api/v1/favorites` | User | علاقه‌مندی‌ها | اصلاح و تست | vendor غیرقابل مشاهده حذف شد |
| GET | `/api/v1/favorites/check` | User | بررسی گروهی favorite | اصلاح و تست | تعداد ID محدود |
| POST/DELETE | `/api/v1/favorites/{vendor_id}` | User | افزودن/حذف favorite | اصلاح و تست | vendor فعال/قابل مشاهده و idempotent |
| GET | `/api/v1/manager/bookings` | Manager/Admin | رزروهای vendor | اصلاح و تست | scope مالکیت و cursor |
| POST | `/api/v1/manager/bookings/manual` | Manager/Admin | رزرو دستی | اصلاح و تست | همان lock رزرو آنلاین |
| POST | `/api/v1/manager/bookings/recurring` | Manager/Admin | رزرو دوره‌ای | اصلاح و تست | تاریخ/schema و rollback اتمیک |
| POST | `/api/v1/manager/bookings/{booking_id}/cancel` | Owner manager/Admin | لغو مدیریتی | اصلاح و تست | refund کامل، settlement exclusion، audit |
| GET | `/api/v1/manager/finance/summary` | Manager/Admin | خلاصه مالی | اصلاح و تست | vendor/date scope |
| GET/POST | `/api/v1/manager/settlements` | Manager/Admin | فهرست/درخواست تسویه | اصلاح و تست | bookingهای eligible و درخواست یکتا |
| GET | `/api/v1/manager/slots` | Manager/Admin | همه سانس‌های manager | اصلاح و تست | count و page صحیح |
| POST | `/api/v1/manager-requests` | User | درخواست manager | اصلاح و تست | pending یکتا در DB |
| GET | `/api/v1/manager-requests/my` | User | درخواست خود | تأیید | owner scope |
| GET | `/api/v1/admin/manager-requests` | Admin | همه درخواست‌ها | تأیید | Admin-only |
| PATCH | `/api/v1/admin/manager-requests/{request_id}` | Admin | تصمیم درخواست | اصلاح و تست | row lock، terminal/idempotent |
| POST | `/api/v1/admin/notifications/broadcast` | Admin | اعلان همگانی | تأیید | audit و batch delivery |
| GET | `/api/v1/admin/logs` | Admin | audit log | اصلاح و تست | pagination و redaction |
| DELETE | `/api/v1/admin/logs/clear` | Admin + feature flag | پاک‌سازی log | اصلاح و تست | پیش‌فرض غیرمجاز و audit |
| DELETE | `/api/v1/admin/logs/{log_id}` | Admin + feature flag | حذف log | تأیید | کنترل صریح محیط |
| GET | `/api/v1/admin/pending-vendors` | Admin | vendorهای معلق | تأیید | Admin-only |
| POST | `/api/v1/admin/vendors/{vendor_id}/approve` | Admin | تأیید vendor | اصلاح و تست | state lock/audit |
| POST | `/api/v1/admin/vendors/{vendor_id}/reject` | Admin | رد vendor | اصلاح و تست | فقط pending/inactive |
| DELETE | `/api/v1/admin/vendors/{vendor_id}` | Admin | حذف دائم vendor | اصلاح و تست | تاریخچه/وابستگی‌ها کنترل شد |
| DELETE | `/api/v1/admin/users/{user_id}` | Admin | حذف امن user | اصلاح و تست | وابستگی و آخرین Admin |
| DELETE | `/api/v1/admin/users/{user_id}/force` | Admin | حذف اجباری | اصلاح و تست | transaction و audit |
| DELETE | `/api/v1/admin/reviews/{review_id}` | Admin | حذف review alias | اصلاح و تست | rating بازحساب شد |
| GET | `/api/v1/admin/settings` | Admin | تنظیمات | تأیید | Admin-only |
| PUT | `/api/v1/admin/settings/{setting_id}` | Admin | تغییر setting | اصلاح و تست | commit قبل از حذف فایل |
| POST | `/api/v1/admin/settings/seed` | Admin | seed تنظیمات | اصلاح و تست | قواعد ۴۸h/۱۰٪ هم‌تراز شد |
| GET | `/api/v1/admin/refunds` | Admin | فهرست refund | اصلاح و تست | vendor/date scope و pagination |
| PATCH | `/api/v1/admin/refunds/{refund_id}` | Admin | تصمیم/پرداخت refund | اصلاح و تست | transition قفل‌شده و idempotent |
| GET | `/api/v1/admin/refunds/{refund_id}/destination` | Admin | مقصد واریز دستی | اصلاح و تست | نمایش کامل audit‌شده و no-store |
| GET | `/api/v1/admin/manager-cancellations` | Admin | لغوهای manager | تأیید | audit trail عملیاتی |
| GET | `/api/v1/admin/settlements` | Admin | همه تسویه‌ها | تأیید | Admin-only |
| PATCH | `/api/v1/admin/settlements/{settlement_id}` | Admin | تصمیم/پرداخت تسویه | اصلاح و تست | transition، سقف مبلغ و paid tracking |
| POST | `/api/v1/admin/hero-images/upload` | Admin | آپلود hero | اصلاح و تست | cleanup فایل در شکست DB |
| DELETE | `/api/v1/admin/settings/{setting_id}/hero-images/{index}` | Admin | حذف hero | اصلاح و تست | index منفی/traversal رد شد |
| POST | `/api/v1/admin/seed-admin` | Bootstrap only | Admin اولیه | اصلاح و تست | secret، محیط صریح و advisory lock |
| POST | `/api/v1/admin/users/{user_id}/revoke-sessions` | Admin | ابطال session user | تأیید | audit و owner target |
| GET | `/health` | Public | سلامت برنامه | تأیید | اتصال DB/Redis |

aliasهای قدیمی `/api/v1/courts...`، `/api/v1/uploads/court-image` و مسیرهای Admin با
`courts` برای backward compatibility در schema مخفی‌اند، ولی همان handler و کنترل‌های
مسیرهای `vendors` را اجرا می‌کنند. ریشه `/` و `/metrics` نیز عمداً خارج OpenAPI هستند.
Frontend مسیرهای اصلی vendor را مصرف می‌کند؛ نام routeهای صفحه‌ای `courts` صرفاً URL
نمایشی قدیمی است. فراخوانی مستقیم حذف slot که Backend پشتیبانی نمی‌کند از Frontend حذف
و ویرایش هفتگی جایگزین شد. لغو Admin نیز به endpoint manager-compatible صحیح متصل شد.

## جریان‌های اصلی کسب‌وکار

1. **احراز هویت:** OTP در Redis با Lua به‌صورت compare-and-delete اتمیک مصرف می‌شود؛
   refresh token hash‌شده و چرخشی است؛ token منقضی/بازتولیدشده قابل replay نیست.
2. **مشاهده و رزرو:** فقط vendor فعال عمومی است. قیمت slot و توپ در booking snapshot
   می‌شود. slot و invariant فعال در transaction قفل و در DB نیز enforce می‌شوند.
3. **پرداخت:** provider یک نتیجه می‌دهد؛ موفقیت، Payment/Booking/TimeSlot را در یک
   transaction هماهنگ می‌کند. unique index مانع بیش از یک payment موفق است.
4. **لغو زودهنگام:** کارت تأییدشده، تأیید شروط، refund ۹۰٪، penalty ۱۰٪ و خروج از
   settlement در یک transaction ثبت می‌شوند.
5. **لغو نزدیک:** booking و slot به pending cancellation می‌روند. نفر دوم hold مستقل
   می‌گیرد؛ پرداخت موفق hold رزرو جدید را قطعی، رزرو قدیم را transferred و refund را
   دقیقاً یک‌بار ایجاد می‌کند.
6. **مدیریت schedule:** اعمال هفتگی یک version ثبت می‌کند، همه تغییرات آینده را ابتدا
   validate و سپس اتمیک اعمال می‌کند؛ slot دارای رزرو حفظ می‌شود.
7. **لغو Vendor:** برای پرداخت آنلاین refund کامل با `site_bears_penalty` ساخته و booking
   از تسویه خارج می‌شود؛ رزرو دستی refund بانکی ندارد.
8. **مالی Admin:** refund و settlement فقط از transitionهای مجاز عبور می‌کنند. تکرار
   همان تصمیم نتیجه تکراری نمی‌سازد و تغییر terminal متعارض `409` است.

## State Machineها و Transitionها

| موجودیت | وضعیت/Transition مجاز | Transition ممنوع یا حفاظت |
|---|---|---|
| Booking | `pending_payment -> confirmed/expired/cancelled`; `confirmed -> cancelled/pending_cancellation`; `pending_cancellation -> transferred/confirmed`; رزرو manager نیز `confirmed -> cancelled` | پرداخت غیر pending، لغو terminal، مالک دیگر و دو booking فعال رد می‌شود |
| TimeSlot | `open -> reserving -> reserved`; `reserved -> pending_cancellation`; hold موقت `pending_cancellation <-> reserving`; آزادسازی به `open` یا لغو manager به `blocked` | ویرایش مخرب booked slot، overlap و status جعلی رد می‌شود |
| Payment | attempt به `success` یا `failed`؛ موفقیت terminal است | payment موفق دوم با service و partial unique index مسدود است |
| Refund | `pending -> approved/rejected`; `approved -> paid` | `rejected/paid` terminal؛ یک نوع refund برای booking یکتا است |
| Penalty | هنگام لغو واجد شرایط ساخته و immutable تلقی می‌شود | بیش از یک penalty برای booking با constraint `0027` ممنوع است |
| Cancellation | event لغو manager به‌همراه Booking/Slot/Refund ثبت می‌شود | event و state مالی در یک transaction هستند |
| ReplacementRequest | `open -> held -> completed`; `held -> open` در لغو/شکست؛ `open/held -> expired` | فقط یک درخواست باز برای booking و فقط یک hold فعال مجاز است |
| BookingHold | `active -> processing -> paid`; `active -> cancelled/expired`; `processing -> failed` | owner/expiry کنترل می‌شود؛ وضعیت نامطمئن provider نیازمند reconciliation است |
| VendorRequest | `pending -> approved/rejected` | تصمیم متعارض terminal و pending دوم رد می‌شود |
| WeeklySchedule | version جدید پس از apply موفق؛ همه itemها با همان version | apply هم‌زمان serialize؛ شکست هر item کل transaction را rollback می‌کند |
| Review | create پس از booking معتبر؛ report/unreport و delete موجب بازحساب rating؛ respond توسط owner/Admin | review تکراری، پاسخ vendor دیگر، report/delete غیرAdmin رد می‌شود |

job انقضا از `FOR UPDATE SKIP LOCKED` استفاده می‌کند، پیش از آزادسازی مالکیت slot را
می‌سنجد و نتیجه state را قبل از پاسخ خطا commit می‌کند. زمان‌های ذخیره‌شده UTC و مرز روز
کاربر بر اساس `Asia/Tehran` است. ورودی schedule محلی به UTC تبدیل می‌شود.

## مشکلات شناسایی‌شده

### ۱. امکان اجرای production با provider ساختگی

- **شدت:** Critical
- **رفتار قبلی:** تنظیمات ناشناخته یا mock می‌توانستند در محیط production به رفتار
  ساختگی پرداخت/SMS/کارت/wallet منجر شوند.
- **علت اصلی:** validation محیط و provider fail-open بود.
- **اثر مشکل:** ثبت وضعیت مالی موفق بدون دریافت پول واقعی یا افشای OTP mock.
- **راه‌حل اعمال‌شده:** allowlist provider، تشخیص صریح development/bootstrap، رد cookie
  ناامن و mock/ناشناخته در non-development، و بستن writeهای wallet mock.
- **فایل‌های تغییرکرده:** `core/config.py`، `main.py`، `payment_service.py`،
  `sms_provider.py`، `bank_card_service.py`، `api/v1/wallet.py`.
- **تست‌های اضافه‌شده:** تست‌های security/config و wallet.

### ۲. ناسازگاری فرایند جایگزینی با unique index و وضعیت slot

- **شدت:** Critical
- **رفتار قبلی:** ساخت booking دوم با active-index ممکن نبود و state مورد انتظار پرداخت
  با state ایجاد replacement تعارض داشت.
- **علت اصلی:** تلاش برای مدل‌کردن hold پرداخت در همان جدول booking.
- **اثر مشکل:** جریان اصلی لغو نزدیک عملاً شکست می‌خورد.
- **راه‌حل اعمال‌شده:** `ReplacementRequest` و `BookingHold` مستقل، transition اتمیک،
  قفل سطر، انقضا و idempotency مالی.
- **فایل‌های تغییرکرده:** مدل/repository/service جایگزینی، `booking_service.py`، schema و
  route booking، Migrationهای `0024` و `0025`.
- **تست‌های اضافه‌شده:** `test_reservation_critical_flows.py`.

### ۳. race در انقضای رزرو و rollback شدن state خطا

- **شدت:** High
- **رفتار قبلی:** workerها می‌توانستند یک batch را هم‌زمان بردارند و تغییر expired پیش
  از exception rollback شود.
- **علت اصلی:** نبود `SKIP LOCKED`/بررسی مالکیت و مرز commit نامناسب.
- **اثر مشکل:** slot گیرکرده یا آزادسازی رزرو جدید.
- **راه‌حل اعمال‌شده:** lock/ownership شرطی، commit outcome پیش از خطای HTTP و پردازش
  idempotent job.
- **فایل‌های تغییرکرده:** `main.py`، `booking_service.py`، `booking_repo.py`.
- **تست‌های اضافه‌شده:** سناریوهای timeout و رقابت در تست جریان بحرانی.

### ۴. duplicate مالی و transition مدیریتی غیرقفل‌شده

- **شدت:** High
- **رفتار قبلی:** درخواست هم‌زمان امکان Payment موفق، manager request، settlement یا
  refund تکراری/متعارض داشت.
- **علت اصلی:** اتکا به check برنامه بدون constraint و row lock.
- **اثر مشکل:** بدهی و گزارش مالی تکراری.
- **راه‌حل اعمال‌شده:** partial unique indexها، transaction lock، terminal state و
  idempotent same-decision؛ penalty نیز برای هر booking یکتا شد.
- **فایل‌های تغییرکرده:** مدل‌ها و repository/serviceهای payment/finance/penalty/request،
  Migrationهای `0025` و `0027`.
- **تست‌های اضافه‌شده:** تست‌های پرداخت، finance، business hardening و constraint.

### ۵. replay در OTP و refresh token

- **شدت:** High
- **رفتار قبلی:** verify هم‌زمان OTP و refresh هم‌زمان می‌توانستند قبل از delete/revoke
  هر دو موفق شوند.
- **علت اصلی:** عملیات read-then-delete و rotation بدون lock.
- **اثر مشکل:** صدور چند session از یک credential یک‌بارمصرف.
- **راه‌حل اعمال‌شده:** Lua اتمیک OTP، شمارنده تلاش، `SELECT FOR UPDATE` روی refresh و
  ابطال خانواده در reuse.
- **فایل‌های تغییرکرده:** `otp_service.py`، `auth_service.py`، `refresh_token_repo.py`،
  route auth.
- **تست‌های اضافه‌شده:** `test_otp.py`، `test_auth.py`، `test_sessions.py`.

### ۶. IDOR و مالکیت ناقص فایل‌های Vendor

- **شدت:** High
- **رفتار قبلی:** URL یا temp upload می‌توانست بدون اتصال قابل‌اعتماد به uploader/vendor
  claim شود؛ حذف path نیز در برابر traversal سخت‌گیری کافی نداشت.
- **علت اصلی:** temp metadata فاقد owner/scope و اعتماد به path خام.
- **اثر مشکل:** اتصال/حذف تصویر متعلق به کاربر دیگر.
- **راه‌حل اعمال‌شده:** temp ID مالک‌دار در Redis، allowlist path، resolve ایمن، reorder
  کامل و wiring `temp_ids` در Frontend.
- **فایل‌های تغییرکرده:** upload route/core/temp service، vendor service/schema و صفحات
  Frontend.
- **تست‌های اضافه‌شده:** `test_uploads.py`.

### ۷. overlap، timezone و ویرایش slot رزروشده

- **شدت:** High
- **رفتار قبلی:** فیلتر روز با مرز UTC، cursor ناقص و apply/create هم‌زمان امکان overlap
  یا ترتیب ناپایدار داشت؛ payload می‌توانست وضعیت حفاظتی را تغییر دهد.
- **علت اصلی:** نبود lock مشترک schedule و تبدیل زمان یکپارچه.
- **اثر مشکل:** سانس هم‌پوشان، نمایش در روز اشتباه یا آسیب به رزرو موجود.
- **راه‌حل اعمال‌شده:** advisory lock namespace، validation ترکیبی، UTC/Tehran conversion،
  cursor `(start_time,id)` و schema محدود؛ بازه تولید به ۱۸۶ روز محدود شد.
- **فایل‌های تغییرکرده:** date/pagination، time slot schema/repo/service/routes، weekly
  schedule model/repo/service و Frontend editor.
- **تست‌های اضافه‌شده:** `test_time_slots.py` و `test_weekly_schedule_apply.py`.

### ۸. drift بین مدل runtime و Migration

- **شدت:** High
- **رفتار قبلی:** nullability و `ondelete` چند FK با مدل متفاوت بود و ManagerRequest در
  metadata کامل import نشده بود؛ نام FK در نصب تازه و ارتقای قدیمی نیز یکسان نبود.
- **علت اصلی:** تغییر مدل بدون Migration هم‌تراز و دو branch تاریخچه.
- **اثر مشکل:** رفتار cascade متفاوت، autogenerate دائماً dirty و ارتقای شکننده.
- **راه‌حل اعمال‌شده:** merge revision، backfill امن timestamp، FK discovery بر اساس
  table/column و هم‌ترازی constraint/indexها در Migration جدید.
- **فایل‌های تغییرکرده:** مدل‌ها، `models/__init__.py` و Migrationهای `0023` و `0026`.
- **تست‌های اضافه‌شده:** fresh upgrade، clone upgrade، downgrade/re-upgrade و
  `alembic check` واقعی.

### ۹. query هم‌زمان روی یک AsyncSession در Dashboard

- **شدت:** Medium
- **رفتار قبلی:** چند coroutine با `gather` روی یک session اجرا می‌شدند.
- **علت اصلی:** parallelization در لایه service بدون session مستقل.
- **اثر مشکل:** خطای concurrent operation و نتیجه ناپایدار تحت بار.
- **راه‌حل اعمال‌شده:** اجرای ترتیبی queryهای همان session و اصلاح مرز روز ایران.
- **فایل‌های تغییرکرده:** `dashboard_service.py` و repositoryهای مرتبط.
- **تست‌های اضافه‌شده:** مجموعه `test_dashboard.py`.

### ۱۰. cursor، count، distance و cache نامعتبر

- **شدت:** Medium
- **رفتار قبلی:** برخی cursorهای descending رکورد را جا می‌انداختند؛ distance filter
  بعد از paginate اعمال و پاسخ privileged در cache عمومی قابل reuse بود.
- **علت اصلی:** cursor تک‌فیلدی و cache key بدون visibility context.
- **اثر مشکل:** صفحه ناقص یا مشاهده metadata نامتناسب با نقش.
- **راه‌حل اعمال‌شده:** cursor مرکب/جهت درست، filter پیش از page، total واقعی و cache
  نقش‌دار/invalidation.
- **فایل‌های تغییرکرده:** pagination، repositoryهای booking/payment/vendor/log و
  vendor/cache services.
- **تست‌های اضافه‌شده:** تست‌های vendor، admin، favorites و full regressions.

### ۱۱. race در Review/Rating و مجوز مبهم report/delete

- **شدت:** Medium
- **رفتار قبلی:** create/report/delete می‌توانستند rating denormalized را ناسازگار کنند
  و سند قدیمی delete توسط نویسنده را القا می‌کرد.
- **علت اصلی:** بازحساب بدون lock و اختلاف سند/کد.
- **اثر مشکل:** امتیاز اشتباه و انتظار دسترسی نادرست.
- **راه‌حل اعمال‌شده:** lock، بازحساب در تمام mutationها، پنهان‌سازی reported و تثبیت
  report/delete به Admin؛ response فقط owner manager/Admin.
- **فایل‌های تغییرکرده:** review service/repository، admin route و اسناد.
- **تست‌های اضافه‌شده:** `test_reviews.py`.

### ۱۲. افشای PII در log و exception دیتابیس

- **شدت:** Medium
- **رفتار قبلی:** جزئیات audit یا متن IntegrityError می‌توانست شماره کامل تلفن/کارت و
  پارامتر query را ثبت کند.
- **علت اصلی:** logging خام detail/exception.
- **اثر مشکل:** ماندگاری داده حساس در log مدیریتی.
- **راه‌حل اعمال‌شده:** redaction مرکزی، `hide_parameters=True` و پیام خطای عمومی.
- **فایل‌های تغییرکرده:** `core/logger.py`، `core/database.py`، `core/exceptions.py`.
- **تست‌های اضافه‌شده:** تست‌های security/admin.

### ۱۳. ناسازگاری Frontend با قرارداد جدید schedule و cancellation

- **شدت:** Medium
- **رفتار قبلی:** UI delete مستقیم slot ناموجود را صدا می‌زد، فیلد توپ را per-slot فرض
  می‌کرد و Admin لغو را از endpoint user فراخوانی می‌کرد.
- **علت اصلی:** تغییر دامنه Backend بدون هم‌زمان‌سازی client.
- **اثر مشکل:** 405/403 و payload ناسازگار.
- **راه‌حل اعمال‌شده:** editor هفتگی، حذف field/operation قدیمی، endpoint لغو manager و
  ارسال temp IDs.
- **فایل‌های تغییرکرده:** صفحات booking/admin/vendor، کامپوننت‌های schedule،
  `lib/api.ts` و validationهای Frontend.
- **تست‌های اضافه‌شده:** typecheck، Vitest و production build.

## تغییرات انجام‌شده

- **رزرو و پرداخت:** invariant یک رزرو فعال در سه لایه service، row lock و DB تثبیت شد.
  قبل از تغییر، رقابت یا timeout می‌توانست state متناقض بسازد؛ بعد از تغییر، بازنده
  `409` می‌گیرد و rollback تمام موجودیت‌های مرتبط را با هم حفظ می‌کند.
- **لغو و جایگزینی:** مسیر ناقص booking دوم به hold مستقل تبدیل شد. User اکنون می‌تواند
  جایگزینی را کامل یا لغو کند؛ Vendor/Admin اثر مالی قابل پیگیری می‌بینند.
- **مالی:** تمام درصدها با `Decimal` محاسبه می‌شوند، scope گزارش refund/settlement اصلاح
  و duplicateها در DB بسته شدند. API سازگار مانده و فقط conflictهای واقعی شفاف شده‌اند.
- **احراز هویت:** OTP و refresh از عملیات read-then-write به مصرف/rotation اتمیک تغییر
  کردند. رفتار عادی client ثابت و replay رد می‌شود.
- **Vendor و schedule:** توپ از slot به تنظیم vendor منتقل و apply هفتگی جایگزین delete
  منفرد شد. رزروهای موجود حفظ، تغییرات جدید versioned و Frontend هم‌قرارداد شد.
- **دسترسی و فایل:** تمام mutationهای vendor با owner/Admin scope و temp upload با owner
  واقعی پیوند خورد. pathهای خارج upload root دیگر حذف یا claim نمی‌شوند.
- **Admin:** آخرین Admin، bootstrap، حذف‌های مخرب و transitionهای مالی قفل و audit شدند.
- **پایداری query:** صفحه‌بندی، cache visibility، timezone و استفاده از AsyncSession
  اصلاح شد؛ پاسخ APIهای قبلی backward compatible است.
- **اسناد/OpenAPI:** auth اختیاری endpointهای عمومی، جریان لغو ۴۸h/۱۰٪، schedule هفتگی،
  replacement و schema دیتابیس هم‌تراز شدند. aliasهای legacy نگه داشته شدند.

## Migrationهای اضافه یا اصلاح‌شده

| Revision | هدف | ایمنی ارتقا/برگشت |
|---|---|---|
| `0021_manager_requests` | جدول درخواست manager | branch موجود حفظ شد؛ metadata اصلاح شد |
| `0021` | انتقال تنظیمات توپ از slot به vendor | داده موجود backfill می‌شود |
| `0022` | versionهای schedule هفتگی | FK و indexهای لازم |
| `0023` | merge دو head فوق | merge بدون تغییر destructive |
| `0024` | ReplacementRequest و BookingHold | مدل hold مستقل و FKهای چرخه جایگزینی |
| `0025` | idempotency پرداخت/Refund/Settlement/Request | قبل از constraint، داده تکراری legacy بررسی می‌شود |
| `0026` | هم‌ترازی nullability و FK `ondelete` | timestamp null backfill؛ نام FK به‌صورت introspection پیدا می‌شود |
| `0027` | یکتایی penalty هر booking | در وجود duplicate عمداً fail-fast می‌کند تا داده مالی حدسی حذف نشود |
| `0028` | snapshot کارت مقصد Refund | ستون‌ها nullable؛ Refundهای باز دارای کارت verified به‌صورت امن backfill می‌شوند |

هیچ Migration اعمال‌شده‌ای بازنویسی destructive نشد. تنها اصلاح `0021` مربوط به import
و قابلیت اجرای همان branch توسعه‌ای موجود بود. دیتابیس اصلی دست‌کاری نشد و همچنان روی
revision `0022` است؛ برای استقرار باید backup گرفته و تا `0028` ارتقا یابد.

## تست‌های اجراشده و نتیجه آن‌ها

| کنترل | نتیجه |
|---|---|
| Backend کامل: `PYTHONPATH=. .venv/bin/pytest` | **321 passed**، 33 warning، 187.96s |
| Backend lint: `ruff check .` | موفق، بدون خطا |
| Backend format: `ruff format --check .` | پس از format رسمی ۱۹ فایل، موفق |
| Backend typecheck: `mypy app` | موفق، 121 فایل |
| Frontend tests: `npm test` | **7 suite / 42 test passed** |
| Frontend typecheck | موفق |
| Frontend Prettier check | موفق |
| Frontend ESLint | موفق با ۰ error و ۲ warning React Compiler/RHF |
| Frontend production build | موفق؛ Next.js 16.2.6، ۴۶ route |
| Alembic heads | یک head: `0028` |
| Migration روی DB تازه | `base -> 0028` موفق |
| Alembic model diff | `No new upgrade operations detected` |
| ارتقای clone دیتابیس فعلی | `0022 -> 0028` موفق |
| برگشت/ارتقای آخرین Migration | `0028 -> 0027 -> 0028` موفق |
| whitespace/unintended marker | `git diff --check` موفق |

در میانه بررسی یک اجرای کامل Backend پس از حذف queryهای concurrent، به علت جاافتادن
`await` در Dashboard و fixtureهای قدیمی favorite، ۱۴ شکست داشت؛ علت‌ها اصلاح و اجرای
نهایی کامل موفق شد. اجرای اولیه Frontend نیز به علت dependency نصب‌نشده `vaul/serwist`
و نبود `matchMedia` در jsdom شکست خورد؛ dependencyهای تعریف‌شده نصب و mock محیط تست
اضافه شد. نتیجه شکست‌خورده به‌عنوان موفق گزارش نشده است.

`npm audit` با lock موقت npm، ۷ آسیب‌پذیری moderate در dependencyهای production (از
زنجیره OpenTelemetry/PostCSS/Next) گزارش کرد؛ پروژه lock اصلی `pnpm-lock.yaml` دارد و
pnpm در محیط نصب نبود، بنابراین lock جدید npm نگه داشته نشد و upgrade اجباری/شکننده
اعمال نشد.

## مشکلاتی که اصلاح نشدند

- gateway واقعی پرداخت، callback امضاشده، reconciliation، timeout policy و idempotency
  key سمت PSP وجود ندارد. اصلاح حدسی ممکن نبود؛ production اکنون به‌جای mock fail می‌شود.
- provider واقعی SMS و استعلام/واریز بانکی وجود ندارد. نیازمند قرارداد سرویس بیرونی است.
- hold در وضعیت `processing` پس از timeout نامطمئن provider به endpoint reconciliation
  نیاز دارد؛ با mock قابل تعیین قطعی نیست.
- تنظیم‌های Admin با نام `commission_percent` و `cancel_window_hours` در runtime منبع
  محاسبه نیستند. فعال‌کردن آن‌ها بدون تصمیم محصول می‌تواند قرارداد مالی ۴۸h/۱۰٪ را
  ناگهانی تغییر دهد؛ فعلاً به‌عنوان تنظیم نمایشی/آتی ثبت شدند.
- مدل اعضا/سطوح داخلی Vendor وجود ندارد؛ تنها manager مالک پشتیبانی می‌شود.
- ماه گزارش Admin میلادی است. اینکه محصول ماه شمسی می‌خواهد از اسناد قابل استنتاج نیست.
- `TimeSlot.version` افزایش می‌یابد ولی optimistic compare در شرط UPDATE ندارد؛ حفاظت
  واقعی فعلی row/advisory lock است. تغییر قرارداد به If-Match تصمیم API می‌خواهد.
- پاک‌کردن/ذخیره فایل و Redis با transaction PostgreSQL اتمیک توزیع‌شده نیست؛ در crash
  مرزی امکان فایل orphan یا temp token مصرف‌شده وجود دارد و cleanup دوره‌ای لازم است.

## تناقض‌های مستندات و کد

- اسناد/seed قدیمی لغو را «۲۴ ساعت و ۲۰٪» می‌گفتند، ولی جریان جدید replacement، متن
  لغو جدید، UI و تست‌های دامنه «۴۸ ساعت و ۱۰٪» را نشان می‌دادند. قانون جدیدتر انتخاب و
  seed، preview، اجرا و اسناد هم‌تراز شد.
- سند قدیمی جریان بحرانی می‌گفت replacement و expiration هنوز ناقص‌اند. آن سند گزارش
  پیش از اصلاح بود و اکنون با اعلان وضعیت تاریخی به این گزارش ارجاع داده شده است.
- بعضی صفحات/نام‌ها هنوز از واژه `court` استفاده می‌کنند، اما مدل/API اصلی `vendor` است.
  aliasها برای backward compatibility حفظ و از OpenAPI عمومی مخفی شدند.
- مستندات قدیمی CRUD مستقیم slot را القا می‌کردند، ولی قرارداد فعلی حذف مستقیم را عمداً
  ندارد و schedule هفتگی اتمیک است. Frontend با قرارداد فعلی هم‌راستا شد.
- یک سند قدیمی delete/report review را برای نقش گسترده‌تری قابل برداشت می‌کرد؛ رفتار
  واقعی و انتخاب امن‌تر پروژه Admin-only است و مستند شد.

## ریسک‌های باقی‌مانده

- نبود provider مالی/SMS واقعی و reconciliation، مانع قطعی production است.
- encryption کارت از secret عمومی JWT مشتق شده و rotation آن برنامه مهاجرت کلید ندارد؛
  پیش از اتصال بانک باید کلید encryption/HMAC مستقل و versioned شود.
- فراخوانی gateway در مسیر رزرو عادی ممکن است lock دیتابیس را تا پایان I/O نگه دارد؛
  طراحی production باید intent/outbox/callback داشته باشد.
- dependency audit Frontend باید با pnpm و نسخه‌های سازگار رفع شود.
- سرویس cleanup برای فایل orphan، upload temp و state مالی processing لازم است.
- OpenAPI نقش‌ها را به شکل OAuth scope ماشین‌خوان نشان نمی‌دهد؛ نقش‌ها در dependency و
  این سند مشخص‌اند، اما contract خودکار client می‌تواند بهتر شود.
- warningهای dependency در Python 3.14 و دو warning React Compiler مانع اجرا نیستند،
  ولی باید در ارتقای کتابخانه‌ها پاک شوند.
- serviceهای Dashboard پس از اصلاح برای ایمنی ترتیبی‌اند؛ برای performance می‌توان query
  تجمیعی یا sessionهای مستقل کنترل‌شده طراحی کرد.

## پیشنهادهای بعدی

1. اتصال PSP واقعی با payment intent، callback امضاشده، outbox و reconciliation job.
2. افزودن SMS provider واقعی، secret مستقل کارت و برنامه rotation کلید.
3. طراحی repair console برای Payment/Refund/Holdهای نامطمئن و ثبت audit دوطرفه.
4. تصمیم محصول درباره تنظیم پویا لغو/commission، ماه شمسی و RBAC اعضای Vendor.
5. اجرای `pnpm audit` در CI و ارتقای کنترل‌شده Next/PostCSS/OpenTelemetry.
6. افزودن تست مرورگر E2E برای رزرو، پرداخت، لغو و replacement در برابر Backend واقعی.
7. افزودن cleanup دوره‌ای و metric/alert برای stateهای قدیمی و فایل‌های orphan.

## وضعیت نهایی

منطق داخلی پروژه نسبت به وضعیت اولیه به‌طور معناداری ایمن‌تر و سازگار شده است: جریان‌های
اصلی User/Vendor/Admin، کنترل مالکیت، transactionها، raceهای رزرو و token، transitionهای
مالی، schedule هفتگی، Migration و قرارداد Frontend تست شده‌اند. کل suite فعلی سبز است.

با این حال پروژه **هنوز آماده Production نیست**، زیرا دریافت/بازپرداخت پول، SMS، کارت
بانکی و reconciliation واقعی پیاده نشده و dependencyهای Frontend نیز audit باز دارند.
برای محیط development/staging و ادامه یکپارچه‌سازی آماده است؛ guardهای جدید از اجرای
تصادفی mockها در production جلوگیری می‌کنند.
