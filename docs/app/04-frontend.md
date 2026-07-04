# Part 3 — Frontend Overview

## Architecture

- **Framework:** Next.js 16.2.6 (App Router only — no `pages/` directory)
- **React:** 19.2.4 with TypeScript 5.9 (`strict: true`)
- **Build output:** `output: "standalone"` (Docker-friendly)
- **Rendering:** Predominantly client-side rendered (`"use client"` on most pages). Data fetching happens in client hooks via the `api()` wrapper, not via RSC or Server Actions.
- **Root layout:** `<html lang="fa" dir="rtl">` — Persian-only, no i18n framework

## Routing Structure

```
app/
├── (auth)/                         # Auth route group
│   ├── login/page.tsx
│   ├── register/page.tsx (redirects to login)
│   └── otp/page.tsx
├── page.tsx                        # Landing page (hero, features)
├── about/, contact/, privacy/, terms/  # Static pages
├── vendors/                        # Public venue listing
│   └── [id]/page.tsx              # Venue detail + slot calendar
├── book/                           # Booking flow
│   └── payment/page.tsx           # Payment step
├── dashboard/                      # Authenticated area (AuthGuard)
│   ├── admin/                     # Admin sub-dashboard
│   │   ├── bookings/, logs/, payments/, settings/
│   │   ├── vendors/, refunds/, settlements/
│   │   └── manager-cancellations/
│   ├── manager/                   # Manager sub-dashboard
│   │   ├── bookings/, schedule/, slots/
│   ├── vendors/                   # Vendor CRUD (manager)
│   │   ├── [id]/, create/
│   ├── bookings/, notifications/, settings/  # Shared sections
│   └── layout.tsx                 # Wraps AuthGuard + sidebar
├── error.tsx                       # Global error boundary
└── not-found.tsx                   # 404 page
```

## Component Organization

```
components/
├── ui/           # ~35 shadcn/ui primitives (button, card, dialog, table, calendar, etc.)
├── auth/         # AuthGuard, login-form, otp-form, hero slides
├── dashboard/    # Sidebar, nav, site-header, schedule/
├── public/       # Public site header/footer, hero section
├── bookings/     # Booking table, cancel dialog, filters
├── vendors/      # Vendor detail components (hero, gallery, reviews, booking)
├── map/          # Neshan Maps integration (vendor-location-map, vendors-map)
├── admin/        # Admin-specific components
└── notifications/ # Notification list/management
```

## State Management

**No external state library** (no Redux, Zustand, TanStack Query, or SWR).

- **Custom hooks + `useState`/`useEffect`:** `hooks/use-auth.ts` is the canonical pattern — calls `/api/v1/auth/me` on mount, exposes `user`, `login`, `register`, `logout`
- **React Context:** Only for error banners (`lib/error-context.tsx`) and theme/direction providers
- **Cross-tab signaling:** `window.dispatchEvent(new CustomEvent("auth:expired"))` lets the API layer notify `useAuth` when a session expires
- **Forms:** `react-hook-form` + `@hookform/resolvers` + `zod` (schemas in `lib/validations.ts`)

## API Communication (`lib/api.ts`)

Central fetch wrapper — single point of truth for all backend calls:

```typescript
api<T>(path: string, options?: RequestInit): Promise<T>
```

**Key behaviors:**
1. Reads access token from cookie, attaches `Authorization: Bearer <token>`
2. On 401 → calls `tryRefreshToken()` which POSTs `/api/v1/auth/refresh`
3. Single in-flight refresh deduplicated via module-level `isRefreshing` + `refreshPromise`
4. Stores new access token in cookie, retries original request once
5. If refresh fails → clears tokens, dispatches `auth:expired` event
6. Error messages translated from English to Persian via static lookup
7. 5xx errors reported to Sentry

**Token storage:**
- Access token: plain cookie (`access_token`, SameSite=Lax, 7-day)
- Refresh token: httpOnly cookie set by backend (not readable from JS)

## Route Protection (Two-Layer)

1. **Edge middleware** (`proxy.ts`): Checks `access_token` cookie presence (not validity). Redirects unauthenticated users away from `/dashboard/*` → `/login`
2. **Client-side AuthGuard** (`components/auth/auth-guard.tsx`): Wraps `dashboard/layout.tsx`. Calls `useAuth()` → verifies real token validity via `/auth/me` → redirects to `/login` if invalid

No route-level RBAC middleware — role checks happen per-page and are enforced by the backend API.

## Design System

- **shadcn/ui** with `radix-nova` style, `rtl: true`, icon libraries: `@hugeicons/react` (primary) + `lucide-react` (secondary)
- **Tailwind v4** with CSS-variable-based theme in `app/globals.css`
- **Dark mode:** `next-themes` with view-transition animation
- **Persian/RTL tooling:**
  - `toPersianDigits()` / `toEnglishDigits()` in `lib/utils.ts`
  - `@daypicker/persian` for Jalali calendar
  - `components/ui/persian-input.tsx` for digit-aware inputs
  - IranYekanX font (10 weights)
  - `DirectionProvider` from Radix for popper/dropdown RTL

## Utilities (`lib/`)

| File | Purpose |
|---|---|
| `api.ts` | Fetch wrapper, token refresh, upload helpers |
| `cookies.ts` | Cookie get/set/remove |
| `utils.ts` | `cn()`, `toPersianDigits`, `toEnglishDigits`, `getInitials`, date helpers |
| `constants.tsx` | Status label/color maps for badges |
| `error-context.tsx` | Global error banner Context/Provider |
| `validations.ts` | Zod schemas shared with react-hook-form |
| `neshan-map.ts` | Map factory, watermark removal, CartoDB fallback, marker builders |

## Testing

- **Runner:** Vitest 4 + jsdom + Testing Library
- **Coverage threshold:** 60% (lines/functions/branches/statements)
- **Test files:** `auth-guard`, `login-form`, `register-form`, `hero-section`, `site-header`, `vendor-booking`, `vendor-shared` (~47 tests total)
- **Mock strategy:** Comprehensive mocks for `next/navigation`, `next/image`, `framer-motion`, `useAuth`, toast, API module — component tests run in full isolation
- **No E2E tests** (no Playwright/Cypress config found)
