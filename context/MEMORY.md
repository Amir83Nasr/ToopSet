# Project Overview — ToopSet (توپ‌سِت)

**Generated:** 2026-06-20 — Snapshot from `/review` skill code scan

---

## Project Identity

- **Name:** ToopSet (توپ‌سِت) — Online sports court booking platform for Qom, Iran
- **Version:** 0.4.0
- **Stack:** Next.js 16 (Turbopack) + FastAPI + PostgreSQL 17 + Redis 7 + Docker Compose
- **Branch:** `main` (all changes committed)
- **Maps:** Neshan Maps SDK via `@neshan-maps-platform/leaflet` — Qom-bounded
- **Working tree:** Clean (no uncommitted changes)

## TODO Status

- **In Progress:** (empty)
- **Done:** Frontend Component Tests (47 Vitest tests with shared mocks)
- **Backlog (13 items):**
  - Booking Confirmation Animation + Share (canvas-confetti installed)
  - Manager Revenue & Booking Analytics (recharts installed)
  - Advanced OTP UX (framer-motion installed)
  - Monthly Booking Calendar View
  - Review Enhancements (Photos + Helpful Votes)
  - Court Photo Gallery Management
  - Wallet Top-Up UX
  - Performance & SEO (next/bundle-analyzer installed)
  - Real-time Notifications (WebSocket)
  - E2E Tests with Playwright
  - Real Payment Gateway (mock currently)
  - Real SMS Provider (mock currently)
  - (also listed: Manager Dashboard Schedule Grid, Bulk Slot Generation)

## Documentation Coverage

All 7 context docs present: architect, backend, frontend, ui, commands, config, commit. MEMORY.md refreshed.

## Actual Code Counts vs Doc Claims

| Layer | Doc Claims | Actual | Notes |
| --- | --- | --- | --- |
| Backend routers | 18 | 16 | off by 2 |
| Services | 9 | 10 | missing user_service.py |
| Repositories | 10 | 11 | off by 1 |
| Core modules | 12 | 13 | missing logging_config.py |
| Schemas | ~15 | 14 + 1 error | ~15 becomes exact 15 |
| DB models | 15 | 15 | exact match |
| Alembic migrations | 8 | 9 | missing 1 version |
| Court components | 9 | 10 | missing location-picker.tsx |
| UI components | 40+ | 36 | off by ~4 |
| Frontend hooks | 4 | 4 | exact match |
| Frontend lib files | — | 7 | error-context.tsx & toast.ts undocumented |
| Tests (backend) | — | 4 | auth, bookings, courts, health |
| Tests (frontend) | — | 8 | 47 Vitest tests |

## Architecture Snapshot

### Backend (Python 3.12 + FastAPI + SQLAlchemy async)

- **api/v1/:** 16 routers — admin, auth, bookings, contact, courts, dashboard, favorites, notifications, payments, penalties, reviews, settings, time_slots, uploads, users, wallet
- **api/deps.py:** 4 auth deps — optional, required, manager, admin
- **core/:** 13 modules — config, database, security (JWT), redis, timezone, upload, exceptions, metrics, logging, logging_config, rate_limiter, health, date_utils
- **models/:** 15 ORM models — User, Court, CourtImage, TimeSlot, Booking, Payment, Wallet, WalletTransaction, Review, Penalty, Favorite, Notification, ContactMessage, Setting, Log
- **services/:** 10 services — auth, booking, cache, court, dashboard, favorite, payment, review, time_slot, user
- **repositories/:** 11 repos — booking, court, favorite, log, notification, payment, penalty, review, time_slot, user, wallet
- **schemas/:** 14 Pydantic v2 schemas + 1 error schema
- **migrations/:** 9 Alembic versions
- **tests/:** 4 test files (auth, bookings, courts, health)

### Frontend (Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui)

- **App pages:** Landing, auth (login/register), courts (list + detail by [id]), booking, dashboard (admin/manager/user/ shared), contact, about, privacy, terms
- **Dashboard sub-routes (11):** admin, bookings, contact, courts, manager, notifications, payments, reports, settings, user, users
- **Components (64+):** 36 shadcn/ui primitives, 3 auth, 10 courts, 2 map, 3 public, 1 theme, 8 dashboard (schedule, sidebar, nav, header, today-preview)
- **Hooks:** use-auth, use-geolocation, use-mobile, use-pagination-limit
- **Lib:** api, cookies, error-context, neshan-map, toast, utils, validations
- **Types:** api, auth, lucide-react declarations, neshan-maps-platform declarations
- **Tests:** 8 test files (47 tests) — auth-guard, login-form, register-form, court-booking, court-shared, site-header, hero-section, favorite-button

### Key Features Present in Code

- RTL + Persian (IranYekanX font, Persian digits, Jalali dates via @daypicker/persian)
- Dark mode (next-themes + CSS vars)
- Optimistic concurrency for booking (TimeSlot.version)
- JWT auth with token version (single-device enforcement)
- Mock SMS (console print)
- Mock payment (success/fraud/timeout)
- 10-minute payment window with background cleanup
- Cancellation penalties: <2h block, 2-24h 50%, 24h+ free refund
- Maps: Neshan SDK, Qom-bounded, watermark removal via MutationObserver
- Rate limiting on auth endpoints (3/min register, 5/min login)

## Documented Dependencies Already Installed (for backlog items)

- `canvas-confetti` — for booking confirmation animation
- `recharts` — for revenue analytics charts
- `framer-motion` — for advanced OTP UX transitions
- `@next/bundle-analyzer` — for performance optimization

## Observations

1. **Pre-launch**: Payment and SMS are both mocked — real gateways need setup
2. **Doc drift**: Several count discrepancies (routers -2, services +1, repos +1, core +1, migrations +1, courts +1) — docs need syncing
3. **Lib/ undocumented**: `error-context.tsx` and `toast.ts` exist in `lib/` but aren't described in `frontend.md`
4. **Migrations exist but path differs**: Migrations live at `backend/migrations/` not `backend/app/migrations/` as described in `backend.md`
5. **Good test coverage**: 47 frontend tests + 4 backend test files
6. **All commits synced**: Working tree is clean (no uncommitted changes vs prior MEMORY.md which listed 7 modified files)
7. **Recent commits focus**: Map integration, Neshan migration, dashboard features, test suite
