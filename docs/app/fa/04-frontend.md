# بخش ۳ — نمای کلی فرانت‌اند

## معماری

- **فریم‌ورک:** Next.js ۱۶.۲.۶ (App Router فقط — بدون دایرکتوری `pages/`)
- **React:** ۱۹.۲.۴ با TypeScript ۵.۹ (`strict: true`)
- **خروجی بیلد:** `output: "standalone"` (سازگار با Docker)
- **رندرینگ:** عمدتاً رندر سمت کلاینت (`"use client"` در بیشتر صفحات). دریافت داده از طریق هوک‌های کلاینت و wrapper `api()` انجام می‌شود، نه از طریق RSC یا Server Actions.
- **طرح اصلی:** `<html lang="fa" dir="rtl">` — فقط فارسی، بدون فریم‌ورک i18n

## ساختار مسیرها

```
app/
├── (auth)/                         # گروه مسیرهای احراز هویت
│   ├── login/page.tsx
│   ├── register/page.tsx (هدایت به login)
│   └── otp/page.tsx
├── page.tsx                        # صفحه فرود (hero، ویژگی‌ها)
├── about/, contact/, privacy/, terms/  # صفحات ایستا
├── vendors/                        # فهرست مجموعه‌های ورزشی
│   └── [id]/page.tsx              # جزئیات مجموعه + تقویم سانس
├── book/                           # جریان رزرو
│   └── payment/page.tsx           # مرحله پرداخت
├── dashboard/                      # ناحیه احراز هویت شده (AuthGuard)
│   ├── admin/                     # داشبورد ادمین
│   │   ├── bookings/, logs/, payments/, settings/
│   │   ├── vendors/, refunds/, settlements/
│   │   └── manager-cancellations/
│   ├── manager/                   # داشبورد مدیر مجموعه
│   │   ├── bookings/, schedule/, slots/
│   ├── vendors/                   # CRUD مجموعه (مدیر)
│   │   ├── [id]/, create/
│   ├── bookings/, notifications/, settings/  # بخش‌های مشترک
│   └── layout.tsx                 # کپسوله‌سازی AuthGuard + سایدبار
├── error.tsx                       # مرز خطای سراسری
└── not-found.tsx                   # صفحه ۴۰۴
```

## سازماندهی کامپوننت‌ها

```
components/
├── ui/           # ~۳۵ کامپوننت ابتدایی shadcn/ui (button, card, dialog, table, calendar, ...)
├── auth/         # AuthGuard, login-form, otp-form, hero slides
├── dashboard/    # سایدبار، ناوبری، site-header, schedule/
├── public/       # هدر/فوتر عمومی، بخش hero
├── bookings/     # جدول رزروها، دیالوگ لغو، فیلترها
├── vendors/      # کامپوننت‌های جزئیات مجموعه (hero, gallery, reviews, booking)
├── map/          # ادغام Neshan Maps (vendor-location-map, vendors-map)
├── admin/        # کامپوننت‌های مختص ادمین
└── notifications/ # فهرست/مدیریت اعلان‌ها
```

## مدیریت State

**بدون کتابخانه state خارجی** (بدون Redux، Zustand، TanStack Query یا SWR).

- **هوک‌های سفارشی + `useState`/`useEffect`:** `hooks/use-auth.ts` الگوی استاندارد است — در mount با `/api/v1/auth/me` تماس می‌گیرد، `user`، `login`، `register`، `logout` را ارائه می‌دهد
- **React Context:** فقط برای بنرهای خطا (`lib/error-context.tsx`) و ارائه‌دهندگان تماس/جهت
- **سیگنال‌دهی بین تب‌ها:** `window.dispatchEvent(new CustomEvent("auth:expired"))` به لایه API اجازه می‌دهد وقتی نشست منقضی می‌شود، `useAuth` را مطلع کند
- **فرم‌ها:** `react-hook-form` + `@hookform/resolvers` + `zod` (اسکیماها در `lib/validations.ts`)

## ارتباط با API (`lib/api.ts`)

wrapper مرکزی fetch — نقطه واحد حقیقت برای تمام تماس‌های بک‌اند:

```typescript
api<T>(path: string, options?: RequestInit): Promise<T>
```

**رفتارهای کلیدی:**
۱. توکن دسترسی را از کوکی می‌خواند، هدر `Authorization: Bearer <token>` را اضافه می‌کند
۲. در ۴۰۱ ← `tryRefreshToken()` را صدا می‌زند که POST به `/api/v1/auth/refresh` می‌زند
۳. درخواست‌های همزمان refresh با `isRefreshing` + `refreshPromise` در سطح ماژول dedup می‌شوند
۴. توکن دسترسی جدید را در کوکی ذخیره می‌کند، درخواست اصلی را یک بار تکرار می‌کند
۵. اگر refresh شکست بخورد ← توکن‌ها را پاک می‌کند، رویداد `auth:expired` را dispatch می‌کند
۶. پیام‌های خطا از انگلیسی به فارسی از طریق یک lookup ایستا ترجمه می‌شوند
۷. خطاهای 5xx به Sentry گزارش می‌شوند

**ذخیره توکن:**
- توکن دسترسی: کوکی ساده (`access_token`، SameSite=Lax، ۷ روز)
- توکن refresh: کوکی httpOnly که توسط بک‌اند تنظیم می‌شود (قابل خواندن از JS نیست)

## محافظت از مسیر (دو لایه)

۱. **میان‌افزار Edge** (`proxy.ts`): وجود کوکی `access_token` را بررسی می‌کند (نه اعتبار). کاربران احراز هویت نشده را از `/dashboard/*` ← `/login` هدایت می‌کند
۲. **AuthGuard سمت کلاینت** (`components/auth/auth-guard.tsx`): `dashboard/layout.tsx` را کپسوله می‌کند. `useAuth()` را صدا می‌زند ← اعتبار واقعی توکن را از طریق `/auth/me` تأیید می‌کند ← در صورت نامعتبر بودن به `/login` هدایت می‌کند

هیچ RBAC سطح مسیر در میدلور وجود ندارد — بررسی نقش در هر صفحه انجام می‌شود و توسط API بک‌اند اعمال می‌شود.

## طراحی سیستم

- **shadcn/ui** با استایل `radix-nova`، `rtl: true`، کتابخانه‌های آیکون: `@hugeicons/react` (اصلی) + `lucide-react` (ثانویه)
- **Tailwind v4** با تم مبتنی بر متغیر CSS در `app/globals.css`
- **حالت تاریک:** `next-themes` با انیمیشن view-transition
- **ابزار فارسی/RTL:**
  - `toPersianDigits()` / `toEnglishDigits()` در `lib/utils.ts`
  - `@daypicker/persian` برای تقویم شمسی
  - `components/ui/persian-input.tsx` برای ورودی‌های آگاه از ارقام
  - فونت IranYekanX (۱۰ وزن)
  - `DirectionProvider` از Radix برای RTL در popper/dropdown

## ابزارها (`lib/`)

| فایل | کاربرد |
|---|---|
| `api.ts` | wrapper fetch، تازه‌سازی توکن، helpers آپلود |
| `cookies.ts` | get/set/remove کوکی |
| `utils.ts` | `cn()`، `toPersianDigits`، `toEnglishDigits`، `getInitials`، helpers تاریخ |
| `constants.tsx` | نگاشت وضعیت/رنگ برای badgeها |
| `error-context.tsx` | کانتکست/ارائه‌دهنده بنر خطای سراسری |
| `validations.ts` | اسکیماهای Zod مشترک با react-hook-form |
| `neshan-map.ts` | فکتوری نقشه، حذف واترمارک، fallback CartoDB، سازنده‌های marker |

## تست

- **اجراکننده:** Vitest ۴ + jsdom + Testing Library
- **آستانه پوشش:** ۶۰٪ (lines/functions/branches/statements)
- **فایل‌های تست:** `auth-guard`, `login-form`, `register-form`, `hero-section`, `site-header`, `vendor-booking`, `vendor-shared` (~۴۷ تست)
- **استراتژی mock:** mockهای جامع برای `next/navigation`, `next/image`, `framer-motion`, `useAuth`, toast, ماژول API — تست‌های کامپوننت در ایزولاسیون کامل اجرا می‌شوند
- **بدون تست E2E** (فایل پیکربندی Playwright/Cypress یافت نشد)
