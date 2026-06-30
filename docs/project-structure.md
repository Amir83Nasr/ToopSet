# مستند ساختار پروژه ToopSet

این سند نقش پوشه‌ها و فایل‌های اصلی پروژه را توضیح می‌دهد. فایل‌های build cache مثل `__pycache__`, `.pytest_cache`, خروجی coverage و assetهای تکراری مثل فونت‌ها و تصاویر، گروهی مستند شده‌اند.

## نمای کلی معماری

```text
frontend/  Next.js 16 + React 19 + TypeScript
backend/   FastAPI + SQLAlchemy async + Alembic
docs/      مستندات، دیاگرام‌ها، proposalها و assetهای طراحی
monitoring/ Prometheus/Grafana/SLO
context/   یادداشت‌های معماری و راهنمای توسعه
```

جریان backend:

```text
api/v1 route -> service -> repository -> SQLAlchemy model -> PostgreSQL
                         -> Redis برای cache/rate-limit/session/OTP
```

## ریشه پروژه

| فایل | کاربرد |
| --- | --- |
| `README.md` | معرفی پروژه، stack، quick start و قابلیت‌ها |
| `Makefile` | دستورهای توسعه، تست، migration و اجرا |
| `compose.yml` | سرویس‌های توسعه مثل PostgreSQL و Redis |
| `compose.prod.yml` | compose تولیدی با backend و healthcheck/monitoring |
| `.env.example` | نمونه env مشترک |
| `VERSION` | نسخه پروژه |
| `LICENSE` | مجوز پروژه |
| `TODO.md` | کارهای باقی‌مانده |
| `CLAUDE.md` | context/راهنمای ابزارهای agent قبلی |

## Backend

### فایل‌های سطح `backend`

| فایل | کاربرد |
| --- | --- |
| `backend/requirements.txt` | dependencyهای Python |
| `backend/pyproject.toml` | تنظیمات tooling Python |
| `backend/Dockerfile` | image تولیدی backend |
| `backend/alembic.ini` | تنظیم Alembic |
| `backend/.env.example` | نمونه env backend |
| `backend/coverage.xml` | خروجی coverage تست‌ها |

### `backend/app/main.py`

نقطه ورود FastAPI. کارهای اصلی:

- ساخت app با metadata و tagهای OpenAPI
- ثبت middlewareهای CORS، correlation id، profiler، security headers، Prometheus و rate limit
- ثبت exception handlerهای سراسری
- mount کردن `/uploads`
- include کردن همه routerهای `/api/v1`
- اجرای background taskهای refresh metrics و cancel expired pending bookings
- routeهای `/`, `/health`, `/metrics`

### `backend/app/api`

| فایل | کاربرد |
| --- | --- |
| `api/deps.py` | dependencyهای احراز هویت و RBAC: user optional، user، manager، admin |
| `api/v1/auth.py` | ثبت‌نام، login، OTP، refresh، profile، avatar و session management |
| `api/v1/vendors.py` | لیست/جزئیات/ساخت/ویرایش/حذف مجموعه و مدیریت تصاویر |
| `api/v1/time_slots.py` | CRUD و تولید گروهی سانس‌ها و جزئیات slot |
| `api/v1/bookings.py` | رزرو، پرداخت، لغو، لیست کاربر و لیست ادمین |
| `api/v1/reviews.py` | ثبت، پاسخ، گزارش، حذف و لیست نظرات |
| `api/v1/favorites.py` | علاقه‌مندی‌های کاربر |
| `api/v1/wallet.py` | کیف پول، تراکنش‌ها و کارت بانکی |
| `api/v1/payments.py` | گزارش پرداخت‌های کاربر و ادمین |
| `api/v1/notifications.py` | لیست اعلان‌ها، unread count و read/read-all |
| `api/v1/penalties.py` | لیست جریمه‌های کاربر |
| `api/v1/dashboard.py` | آمار کاربر، مدیر و ادمین |
| `api/v1/manager.py` | رزروها و سانس‌های مجموعه‌های مدیر |
| `api/v1/users.py` | مدیریت کاربران توسط ادمین |
| `api/v1/settings.py` | خواندن public/authenticated تنظیمات |
| `api/v1/contact.py` | فرم تماس و مدیریت پیام‌ها |
| `api/v1/uploads.py` | آپلود تصویر مجموعه با temp id |
| `api/v1/admin.py` | عملیات ادمین: logs، settings، تایید vendor، حذف دائمی، hero images و revoke sessions |

### `backend/app/core`

| فایل | کاربرد |
| --- | --- |
| `config.py` | خواندن env و validation تنظیمات حساس production |
| `database.py` | engine asyncpg، session factory، Base و slow query instrumentation |
| `security.py` | bcrypt، ساخت/decode JWT، refresh/access token و hash token |
| `card_security.py` | normalize/mask/fingerprint/encrypt شماره کارت |
| `rate_limiter.py` | تنظیم SlowAPI و handler خطای rate limit |
| `redis_client.py` | اتصال Redis و fallback/cleanup |
| `upload.py` | ذخیره، حذف، اعتبارسنجی و sanitization فایل upload |
| `exceptions.py` | exception handlerها و security headers middleware |
| `logger.py` | ثبت action در جدول logs |
| `logging_config.py` | تنظیم structured logging |
| `correlation_id.py` | middleware برای `X-Request-ID` |
| `metrics.py` | Prometheus metrics و business gauges |
| `profiler.py` | profiler درخواست و DB/Redis timing |
| `telemetry.py` | OpenTelemetry instrumentation |
| `health.py` | health check سرویس‌ها |
| `pagination.py` | cursor encode/decode |
| `timezone.py` | helperهای زمان UTC/ایران |
| `date_utils.py` | parse فیلترهای تاریخ |

### `backend/app/models`

| فایل | جدول/کاربرد |
| --- | --- |
| `user.py` | `users` و enum نقش‌ها |
| `refresh_token.py` | `refresh_tokens` برای session/rotation |
| `vendor.py` | `vendors` و enum رشته‌های ورزشی |
| `vendor_image.py` | `vendor_images` |
| `time_slot.py` | `time_slots` و enum وضعیت/جنسیت |
| `booking.py` | `bookings` و enum وضعیت رزرو |
| `payment.py` | `payments` و enum وضعیت پرداخت |
| `wallet.py` | `wallets` |
| `wallet_transaction.py` | `wallet_transactions` |
| `bank_card.py` | `bank_cards` |
| `review.py` | `reviews` |
| `favorite.py` | `favorites` |
| `penalty.py` | `penalties` |
| `notification.py` | `notifications` |
| `contact.py` | `contact_messages` |
| `log.py` | `logs` |
| `setting.py` | `settings` |
| `__init__.py` | import/export مدل‌ها برای Alembic/SQLAlchemy |

### `backend/app/repositories`

Repositoryها queryهای SQLAlchemy را از service جدا می‌کنند.

| فایل | کاربرد |
| --- | --- |
| `user_repo.py` | CRUD کاربر، جست‌وجو، role، active |
| `refresh_token_repo.py` | ذخیره/revoke/list refresh token |
| `vendor_repo.py` | query مجموعه‌ها با فیلتر، قیمت، فاصله، تصاویر |
| `time_slot_repo.py` | query و CRUD سانس‌ها، قفل row و batch create |
| `booking_repo.py` | query رزروها، active booking، expired pending و گزارش‌ها |
| `payment_repo.py` | query پرداخت‌ها برای user/admin |
| `wallet_repo.py` | get/create wallet، تغییر موجودی و تراکنش |
| `bank_card_repo.py` | upsert و خواندن کارت‌های بانکی |
| `review_repo.py` | query و CRUD review |
| `favorite_repo.py` | favorite add/remove/check |
| `notification_repo.py` | ساخت اعلان، unread، mark read، broadcast |
| `penalty_repo.py` | ثبت و لیست جریمه‌ها |
| `log_repo.py` | لیست، حذف و پاکسازی logs |

### `backend/app/services`

Serviceها منطق business را نگه می‌دارند.

| فایل | کاربرد |
| --- | --- |
| `auth_service.py` | register/login/refresh/logout/profile/session و audit security |
| `otp_service.py` | OTP با Redis TTL، send limit و fail lockout |
| `vendor_service.py` | visibility، ownership، ساخت/ویرایش مجموعه و تصاویر |
| `time_slot_service.py` | ساخت/ویرایش/حذف/تولید سانس، تبدیل timezone و cache |
| `booking_service.py` | رزرو، پرداخت mock، لغو، refund، جریمه و notification |
| `payment_service.py` | درگاه mock با خطاهای شبیه‌سازی‌شده |
| `wallet_service` | فایل جدا ندارد؛ منطق کیف پول در repo/API و booking استفاده شده است |
| `bank_card_service.py` | استعلام mock کارت، encrypt/mask/fingerprint و تایید کارت |
| `review_service.py` | ثبت/پاسخ/گزارش/حذف review و محاسبه rating |
| `favorite_service.py` | مدیریت علاقه‌مندی‌ها |
| `dashboard_service.py` | آمار dashboard با queryهای aggregated |
| `user_service.py` | مدیریت نقش/وضعیت کاربر با محافظت آخرین ادمین |
| `cache_service.py` | cache عمومی، cache لیست ادمین و cache سانس‌ها |
| `sms_provider.py` | provider ارسال پیامک، فعلاً mock/قابل جایگزینی |
| `upload_temp_service.py` | کمک برای uploadهای موقت |
| `__init__.py` | package marker |

### `backend/app/schemas`

Pydantic schemaها قرارداد request/response هستند.

| فایل | کاربرد |
| --- | --- |
| `auth.py` | request/responseهای login/register/OTP/profile/avatar/token |
| `session.py` | responseهای session و logout |
| `user.py` | نمایش و مدیریت کاربران |
| `vendor.py` | ساخت/ویرایش/لیست/جزئیات مجموعه و تصویر |
| `time_slot.py` | ساخت/ویرایش/لیست/جزئیات/generate سانس |
| `booking.py` | ساخت، لیست و جزئیات رزرو |
| `payment.py` | responseهای پرداخت |
| `wallet.py` | موجودی، deposit/withdraw و تراکنش |
| `bank_card.py` | استعلام و نمایش کارت بانکی |
| `review.py` | ساخت، لیست، جزئیات و پاسخ review |
| `favorite.py` | favorite response و check |
| `notification.py` | notification list/response |
| `penalty.py` | penalty list/response |
| `manager.py` | responseهای manager bookings/slots |
| `setting.py` | تنظیمات admin |
| `contact.py` | فرم تماس |
| `error.py` | schema خطا |
| `__init__.py` | package marker |

### Migration و scripts backend

| فایل/پوشه | کاربرد |
| --- | --- |
| `backend/migrations/env.py` | اتصال Alembic به metadata و database URL |
| `backend/migrations/script.py.mako` | قالب migration جدید |
| `backend/migrations/versions/*.py` | تاریخچه schema، از create all tables تا rename courts to vendors |
| `backend/scripts/seed.py` | seed داده‌های نمونه |
| `backend/scripts/create_admin.py` | ساخت ادمین از CLI |
| `backend/scripts/run_migrations.sh` | اجرای migration در محیط container |
| `backend/scripts/migrate_logs_to_persian.py` | تبدیل/اصلاح متن لاگ‌ها به فارسی |

### Tests backend

`backend/tests` تست‌های pytest برای auth، OTP، users، vendors، time slots، bookings، payments، wallet، reviews، favorites، dashboard، admin، uploads، security، health، contact، settings، manager، penalties، notifications و hardening منطق رزرو/لغو دارد. `conftest.py` fixtureهای تست را فراهم می‌کند.

## Frontend

### فایل‌های سطح `frontend`

| فایل | کاربرد |
| --- | --- |
| `frontend/package.json` | dependencyها و scripts Next/Vitest/ESLint |
| `frontend/package-lock.json` | lockfile npm |
| `frontend/next.config.mjs` | تنظیم Next.js |
| `frontend/tsconfig.json` | تنظیم TypeScript |
| `frontend/eslint.config.mjs` | تنظیم ESLint |
| `frontend/postcss.config.mjs` | تنظیم PostCSS/Tailwind |
| `frontend/vitest.config.ts` | تنظیم تست frontend |
| `frontend/Dockerfile` | image frontend |
| `frontend/proxy.ts` | proxy/middleware لایه Next |
| `frontend/components.json` | تنظیم shadcn/ui |
| `frontend/sentry.client.config.ts` | Sentry سمت کلاینت |
| `frontend/sentry.server.config.ts` | Sentry سمت سرور |
| `frontend/.env.example` | نمونه env frontend |

### `frontend/app`

Next.js App Router. هر `page.tsx` یک route است.

| فایل | route/کاربرد |
| --- | --- |
| `layout.tsx` | layout ریشه، فونت/RTL/providers |
| `providers.tsx` | providerهای theme/auth/error/toast |
| `globals.css` | استایل global، Tailwind و فونت‌ها |
| `page.tsx` | صفحه اصلی |
| `error.tsx` | error boundary route-level |
| `not-found.tsx` | صفحه 404 |
| `about/page.tsx` | درباره ما |
| `contact/page.tsx` | فرم تماس |
| `privacy/page.tsx` | حریم خصوصی |
| `terms/page.tsx` | قوانین |
| `(auth)/layout.tsx` | layout صفحات ورود |
| `(auth)/login/page.tsx` | ورود با رمز |
| `(auth)/register/page.tsx` | ثبت‌نام |
| `(auth)/otp/page.tsx` | ورود/ثبت‌نام OTP |
| `vendors/page.tsx` | لیست عمومی مجموعه‌ها |
| `vendors/[id]/page.tsx` | جزئیات عمومی مجموعه |
| `courts/page.tsx` | route legacy برای لیست مجموعه‌ها |
| `courts/[id]/page.tsx` | route legacy جزئیات |
| `book/page.tsx` | flow رزرو |
| `book/payment/page.tsx` | پرداخت رزرو |
| `dashboard/layout.tsx` | layout داشبورد با sidebar/header |
| `dashboard/page.tsx` | داشبورد عمومی/redirect بر اساس نقش |
| `dashboard/user/page.tsx` | داشبورد کاربر |
| `dashboard/bookings/page.tsx` | رزروهای کاربر |
| `dashboard/payments/page.tsx` | پرداخت‌های کاربر |
| `dashboard/notifications/page.tsx` | اعلان‌های کاربر |
| `dashboard/settings/page.tsx` | تنظیمات پروفایل/حساب |
| `dashboard/contact/page.tsx` | مدیریت/نمایش تماس در داشبورد |
| `dashboard/reports/page.tsx` | گزارش‌ها |
| `dashboard/users/page.tsx` | لیست کاربران برای ادمین |
| `dashboard/users/[id]/page.tsx` | جزئیات کاربر |
| `dashboard/vendors/page.tsx` | مدیریت مجموعه‌های نسخه جدید |
| `dashboard/vendors/create/page.tsx` | ساخت مجموعه |
| `dashboard/vendors/[id]/page.tsx` | ویرایش مجموعه |
| `dashboard/vendors/schedule/page.tsx` | برنامه سانس‌های مجموعه |
| `dashboard/courts/*` | routeهای legacy متناظر با vendors |
| `dashboard/manager/page.tsx` | داشبورد مدیر |
| `dashboard/manager/bookings/page.tsx` | رزروهای مجموعه‌های مدیر |
| `dashboard/manager/schedule/page.tsx` | برنامه مدیر |
| `dashboard/manager/slots/page.tsx` | مدیریت سانس‌های مدیر |
| `dashboard/admin/page.tsx` | داشبورد ادمین |
| `dashboard/admin/vendors/page.tsx` | تایید/مدیریت مجموعه‌ها |
| `dashboard/admin/courts/page.tsx` | route legacy ادمین |
| `dashboard/admin/bookings/page.tsx` | همه رزروها |
| `dashboard/admin/payments/page.tsx` | همه پرداخت‌ها |
| `dashboard/admin/logs/page.tsx` | audit logs |
| `dashboard/admin/settings/page.tsx` | تنظیمات سیستم |

### `frontend/components`

| پوشه/فایل | کاربرد |
| --- | --- |
| `components/ui/*` | primitiveهای UI مثل button, dialog, table, tabs, calendar, sidebar |
| `components/auth/*` | فرم‌های login/register/OTP، auth guard و hero slides |
| `components/public/*` | header/footer/hero و محتوای متنی public |
| `components/vendors/*` | detail page مجموعه، booking widget، reviews، gallery، location picker و upload |
| `components/bookings/*` | جدول، فیلتر، empty/skeleton و dialog لغو رزرو |
| `components/dashboard/*` | sidebar، navigation، header و schedule UI |
| `components/dashboard/schedule/*` | weekly grid، day column، slot card، bulk generator و quick slot form |
| `components/admin/*` | editor تنظیمات list و hero images |
| `components/notifications/*` | جدول، فیلتر، empty/skeleton و dialog ارسال همگانی |
| `components/map/*` | نقشه Neshan برای یک مجموعه و لیست مجموعه‌ها |
| `components/theme-provider.tsx` | theme provider |

### `frontend/lib`, `hooks`, `types`

| فایل | کاربرد |
| --- | --- |
| `lib/api.ts` | client اصلی API و wrapper درخواست‌ها |
| `lib/validations.ts` | schemaهای validation سمت frontend |
| `lib/neshan-map.ts` | wrapper نقشه نشان/Leaflet |
| `lib/cookies.ts` | helper cookie |
| `lib/constants.tsx` | ثابت‌های UI/domain |
| `lib/error-context.tsx` | context خطا |
| `lib/toast.ts` | helper toast |
| `lib/utils.ts` | utilityهای عمومی مثل class merge |
| `hooks/use-auth.ts` | state و عملیات auth |
| `hooks/use-mobile.ts` | تشخیص viewport موبایل |
| `hooks/use-geolocation.ts` | موقعیت کاربر |
| `hooks/use-pagination-limit.ts` | limit صفحه‌بندی |
| `types/api.ts` | typeهای API |
| `types/auth.ts` | typeهای auth |
| `types/lucide-react.d.ts` | declaration برای lucide |
| `types/neshan-maps-platform__leaflet.d.ts` | declaration نقشه نشان |

### Tests frontend

`frontend/tests` تست‌های Vitest/Testing Library برای auth guard، login/register، hero، header، vendor booking/shared و mockهای Next/Sonner/Framer/Theme/API دارد.

### Assets frontend

| مسیر | کاربرد |
| --- | --- |
| `frontend/public/fonts/iran-yekan-x/*` | فونت‌های IranYekanX |
| `frontend/public/icons/*` | favicon/profile/vector |
| `frontend/public/images/*` | تصاویر public صفحات و بخش‌های محتوا |
| `frontend/public/uploads/hero/*` | تصاویر hero قابل مدیریت از admin |
| `frontend/tmp/*` | فایل‌های موقت توسعه |

## Docs و context

| مسیر | کاربرد |
| --- | --- |
| `docs/database.md` | همین مستند دیتابیس |
| `docs/api.md` | مستند API و امنیت |
| `docs/project-structure.md` | همین مستند ساختار پروژه |
| `docs/diagrams/*` | ERD و DFD در قالب PDF/drawio |
| `docs/proposals/*` | proposal پروژه |
| `docs/scenarios/*` | سناریوهای technical/promotional |
| `docs/images/*` | screenshotهای مستندات |
| `docs/icons/*` | assetهای برند و mock |
| `context/architect.md` | خلاصه معماری |
| `context/frontend.md` | context frontend |
| `context/ui.md` | راهنمای UI |
| `context/commands.md` | دستورها |
| `context/config.md` | تنظیمات و استانداردها |
| `context/commit.md` | قواعد commit |
| `context/MEMORY.md` | حافظه/یادداشت پروژه |

## Monitoring و scripts

| مسیر | کاربرد |
| --- | --- |
| `monitoring/slo.yml` | اهداف SLO |
| `monitoring/alerts/prometheus_alerts.yml` | alert ruleهای Prometheus |
| `monitoring/grafana/dashboard.json` | dashboard Grafana |
| `scripts/check_version.py` | بررسی نسخه |
| `scripts/ascii_logo.py` | تولید/نمایش لوگوی ASCII |

## فایل‌هایی که نباید مبنای توسعه باشند

- `__pycache__`, `.pytest_cache`, `coverage.xml` خروجی اجرای ابزارها هستند.
- فایل‌های legacy با نام `courts` در frontend/API برای compatibility باقی مانده‌اند، اما مدل اصلی فعلی `vendors` است.
- مسیرهای `frontend/tmp` و تصاویر mock برای تولید نهایی نباید به عنوان منبع پایدار business logic فرض شوند.
