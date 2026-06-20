# Frontend

**Stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui (radix-nova) + Neshan Maps

## Directory

```
frontend/
├── app/                  # App Router (RTL, Persian, dark-mode)
│   ├── layout.tsx        # Root: lang=fa, dir=rtl, ThemeProvider, IranYekanX
│   ├── providers.tsx     # Tooltip, Direction(RTL), ErrorContext, Toaster
│   ├── globals.css       # Tailwind v4, shadcn theme, IranYekanX (10 weights)
│   ├── page.tsx          # Landing: SiteHeader + HeroSection + SiteFooter
│   ├── (auth)/           # login + register
│   ├── courts/           # Listing (filters+map) + Detail (hero+gallery+booking+reviews)
│   ├── book/             # Booking page
│   ├── dashboard/        # Role-based: admin/manager/user
│   │   └── layout.tsx    # AuthGuard → SidebarProvider → AppSidebar → SiteHeader
│   └── contact, about, privacy, terms/
│
├── components/
│   ├── ui/               # 40+ shadcn primitives
│   ├── auth/             # AuthGuard, LoginForm, RegisterForm
│   ├── courts/           # 9 components: court-booking, court-hero, reviews, etc.
│   ├── map/              # courts-map (multi), court-location-map (single)
│   ├── dashboard/        # AppSidebar, SiteHeader, NavMain, schedule/ (grid, bulk-gen)
│   └── public/           # hero-section, site-header, site-footer
│
├── hooks/                # use-auth, use-geolocation, use-mobile, use-pagination-limit
├── lib/                  # api.ts, utils.ts, neshan-map.ts, cookies.ts, validations.ts
├── types/                # api.ts (ApiError), auth.ts (User, AuthResponse)
├── proxy.ts              # Next.js middleware (auth redirects)
└── vitest.config.ts      # jsdom, 60% coverage threshold
```

## API Client (`lib/api.ts`)

```typescript
import { api } from "@/lib/api";

// GET
const data = await api<{ courts: Court[]; total: number }>(
  "/api/v1/courts?limit=10",
);

// POST
const result = await api<BookingResponse>("/api/v1/bookings", {
  method: "POST",
  body: JSON.stringify({ slot_id: 123, participants_count: 5 }),
});
```

- Auto-attaches Bearer token from cookies
- 401 → auto-refresh once → retry; on failure → `auth:expired` event
- English errors translated to Persian via `enToFa` map
- 500+ captured to Sentry

## Map (`lib/neshan-map.ts`)

- Wraps `@neshan-maps-platform/leaflet`
- Qom-bounded: [34.45,50.65] to [34.85,51.1], center [34.64,50.88]
- Watermark removal via MutationObserver + polling (10s fallback)
- 5 sport icons with color-coded SVG markers
- Dynamic import with `ssr: false` (all map components)

## Persian Text

| Function                                | Usage               |
| --------------------------------------- | ------------------- |
| `toPersianDigits("0912")` → `"۰۹۱۲"`    | UI display          |
| `toEnglishDigits("۰۹۱۲")` → `"0912"`    | Parse input         |
| `toLocalDateStr(date)` → `"1403-01-15"` | Date formatting     |
| `todayStr()`                            | Today as YYYY-MM-DD |

## Dashboard Pages

| Route                | Role    | Content                                               |
| -------------------- | ------- | ----------------------------------------------------- |
| `/dashboard`         | any     | Redirects to role-specific                            |
| `/dashboard/user`    | user    | My bookings, wallet, favorites, settings              |
| `/dashboard/manager` | manager | Court management, schedule grid, bulk gen, reports    |
| `/dashboard/admin`   | admin   | All bookings, courts, users, payments, logs, settings |

To add a page:

1. Create under `app/dashboard/{role}/`
2. It inherits dashboard layout (AuthGuard + Sidebar + SiteHeader)
3. Add nav link in `nav-main.tsx` + sidebar item in `app-sidebar.tsx`

## UI Patterns

- RTL: `me-`/`ms-` instead of `mr-`/`ml-`
- Dark mode via next-themes + CSS vars (`.dark` class)
- IranYekanX font (100–1000 weight range)
- Persian numbers via `toPersianDigits()` for display
- Sonner toasts (top-left, RTL, richColors)
- Grid pattern overlay on backgrounds
- Map components dynamically imported (`ssr: false`)
