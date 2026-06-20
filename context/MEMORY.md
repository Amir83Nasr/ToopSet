# Project Overview — ToopSet (توپ‌سِت)

**Generated:** 2026-06-20 — Snapshot from `docs read`

---

## Project Identity

- **Name:** ToopSet (توپ‌سِت) — Online sports court booking platform for Qom, Iran
- **Version:** 0.4.0
- **Stack:** Next.js 16 (Turbopack) + FastAPI + PostgreSQL 17 + Redis 7 + Docker Compose
- **Branch:** `main` (ahead of `origin/main` by 11 commits)
- **Maps:** Neshan Maps SDK via `@neshan-maps-platform/leaflet` — Qom-bounded

## TODO Status

- **Backlog:** Real SMS provider (OTP production blocker), Frontend component tests
- **In Progress:** (empty)
- **Done:** (empty)

## Documentation Coverage

All 7 context docs present: architect, backend, frontend, ui, commands, config, commit. MEMORY.md (this file) was empty — freshly written now.

## Discrepancies Found (docs vs actual code)

| Doc Claim                                            | Actual                                       | Status            |
| ---------------------------------------------------- | -------------------------------------------- | ----------------- |
| 18 api/v1 routers                                    | 16 router files                              | Off by 2          |
| 9 services                                           | 10 (`user_service.py` exists but not listed) | Missing service   |
| 9 courts components                                  | 10 (`location-picker.tsx` exists)            | Missing component |
| Frontend lib/ has `error-context.tsx` and `toast.ts` | Not mentioned in frontend.md                 | Missing entries   |

## Architecture Snapshot

### Backend (Python 3.12 + FastAPI + SQLAlchemy async)

- **api/v1/:** 16 routers — admin, auth, bookings, contact, courts, dashboard, favorites, notifications, payments, penalties, reviews, settings, time_slots, uploads, users, wallet
- **api/deps.py:** 4 auth deps — optional, required, manager, admin
- **core/:** 12 modules — config, database, security (JWT), redis, timezone, upload, exceptions, metrics, logging, rate-limiter, health, date_utils
- **models/:** 15 SQLAlchemy ORM models — User, Court, CourtImage, TimeSlot, Booking, Payment, Wallet, WalletTransaction, Review, Penalty, Favorite, Notification, ContactMessage, Setting, Log
- **services/:** 10 services — auth, booking, cache, court, dashboard, favorite, payment, review, time_slot, user
- **repositories/:** 11 repos — booking, court, favorite, log, notification, payment, penalty, review, time_slot, user, wallet
- **schemas/:** 15 Pydantic v2 schemas

### Frontend (Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui)

- **App pages:** Landing, auth (login/register), courts (list + detail by [id]), booking, dashboard (user/manager/admin splits), contact, about, privacy, terms
- **Dashboard sub-routes:** admin (bookings, courts, payments, logs, settings), manager (schedule), user, plus shared: settings, payments, contact, bookings, notifications, reports, users, courts (create/[id]/edit)
- **Components:** 36 shadcn/ui primitives, 3 auth, 10 courts, 2 map, 3 public, 3 dashboard
- **Hooks:** use-auth, use-geolocation, use-mobile, use-pagination-limit
- **Lib:** api (HTTP client), cookies, error-context, neshan-map, toast, utils, validations
- **Types:** api, auth, lucide-react declarations, neshan-maps-platform declarations
- **Maps:** Wraps `@neshan-maps-platform/leaflet`, Qom-bounded, watermark removal via MutationObserver

### Key Features

- RTL + Persian (IranYekanX font, Persian digits, Jalali dates via @daypicker/persian)
- Dark mode (next-themes + CSS vars)
- Optimistic concurrency for booking (TimeSlot.version)
- JWT auth with token version (single-device enforcement)
- Mock SMS (console) + Mock payment (success/fraud/timeout)
- 10-minute payment window with background cleanup
- Cancellation penalties: <2h block, 2-24h 50%, 24h+ free refund

## Git State

- 11 commits ahead of origin/main
- Uncommitted changes: 7 modified files (.gitignore, README.md deleted, some frontend files)
- Untracked: .claude/, CLAUDE.md, TODO.md, VERSION, context/
- Recent work: map watermark fix, map integration in filter, multi-select sport filter, Neshan SDK migration, seed data refinements, dashboard schedule management features

## Key Observations

1. The project is pre-launch — SMS and payment gateways are mocked
2. Good documentation coverage but minor count discrepancies (outdated by ~2 files)
3. Recent commits focus on map integration and dashboard schedule management
4. `frontend/app/about/page.tsx`, `globals.css`, and both map components have unstaged changes
5. The `context/` directory and CLAUDE.md are newly created and not yet committed
