# ToopSet Project Guide

## Current Status

> **Active tasks are tracked in [`TODO.md`](TODO.md) — always check before starting work.**
>
> Sections below are reference. Read `TODO.md` first to see what's in progress, next up, and backlogged.

## Overview

ToopSet is a Persian sports venue booking platform. Users can search for sports courts (football, basketball, tennis, etc.), book available time slots, pay through a wallet system, leave reviews, and manage their profile. Managers can register and manage their own courts. Admins oversee the entire system — approving courts, managing users, viewing logs, and configuring platform settings.

**Version**: 0.3.1 — See VERSION file.
**License**: Proprietary — All rights reserved. See [LICENSE](../LICENSE) for details.

---

## Tech Stack

### Backend

| Layer | Technology |
| ------- | ----------- |
| Language | Python 3.12+ |
| Framework | FastAPI |
| ORM | SQLAlchemy 2.0 (async) |
| Database | PostgreSQL |
| Auth | JWT (access + refresh) via `python-jose` |
| Validation | Pydantic v2 |
| Migrations | Alembic |
| Caching | Redis |
| Monitoring | Sentry + Prometheus |
| Server | Uvicorn (dev) / Gunicorn + Uvicorn (prod) |

### Frontend

| Layer | Technology |
| ------- | ----------- |
| Language | TypeScript (strict) |
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui + Radix UI primitives |
| Icons | Lucide React + Hugeicons |
| Forms | react-hook-form + @hookform/resolvers (zod) |
| Date | react-day-picker (Jalali/Shamsi calendar) |
| HTTP | Fetch-based custom `api()` helper |
| Auth | JWT stored in localStorage, auto-refresh |
| Toast | Custom `lib/toast.ts` |
| Monitoring | @sentry/nextjs |

---

## Project Structure

```
/backend
  /app
    /api
      /v1/            — Route handlers (16 routers, one per domain)
      /deps.py         — Auth dependencies (get_current_user, get_current_admin, etc.)
    /core/
      /config.py      — Pydantic Settings (DB, Redis, JWT, Sentry)
      /database.py    — AsyncSession factory, get_db dependency
      /upload.py      — File upload helpers
      /security.py    — Password hashing, JWT create/decode
      /exceptions.py  — Custom exception handlers
      /health.py      — Health check endpoint logic
      /logging_config.py
      /logger.py      — log_action helper
      /metrics.py     — Prometheus middleware + business gauges
      /redis_client.py
      /date_utils.py  — Jalali date parsing helpers
      /rate_limiter.py — slowapi-based Redis-backed rate limiter (auth endpoints)
      /timezone.py    — Iran timezone (Asia/Tehran) helpers for UTC conversion
    /models/          — SQLAlchemy ORM models
    /repositories/    — DB query layer (one repo per model)
    /schemas/         — Pydantic request/response models
    /services/        — Business logic layer
    /main.py          — FastAPI app creation, middleware, router registration
  /migrations/        — Alembic migration versions
  /uploads/           — Uploaded files (avatars/, courts/)
  /scripts/seed.py    — Database seeder

/frontend
  /app/               — Next.js App Router pages
    /(auth)/          — login, register pages
    /dashboard/       — Dashboard pages (role-based routing)
    /courts/          — Public court browsing pages
    /components/
      /auth/          — LoginForm, RegisterForm
      /courts/        — Court-related components (booking, gallery, reviews, etc.)
      /dashboard/     — AppSidebar, SiteHeader, nav-main
        /schedule/     — SlotCard, DayColumn, WeeklyGrid, MobileDayView, BulkGenerator, QuickSlotForm
        /manager/      — today-preview.tsx
      /public/        — SiteHeader, HeroSection, etc.
      /ui/            — shadcn/ui generated components
    /hooks/           — use-auth (auth state + token management)
    /lib/             — api.ts, utils.ts, toast.ts, error-context.tsx
    /types/           — TypeScript type definitions (auth.ts, api.ts)
```

---

## Conventions

### Language

- UI text and error messages are in **Persian**; Swagger summaries, code, and comments are in **English**
- Code, variable names, types, commit messages are in **English**
- **Commits:** Conventional commits — see `CLAUDE.md` for full rules

### Code Style — Backend

- Type hints on all functions
- `from __future__ import annotations` in all route/service files
- Async/await throughout (SQLAlchemy async sessions)
- Pydantic v2 `model_validate()` for ORM → schema conversion
- Business logic in Services, not Routes or Repositories
- Use `log_action()` for audit trail on important operations

### Code Style — Frontend

- TypeScript strict mode
- `"use client"` for interactive components; server components by default
- Prefer existing shadcn/ui components over custom HTML
- Use `cn()` utility from `lib/utils.ts` for conditional Tailwind classes
- `size-*` classes for consistent icon sizing (Tailwind v4)
- Icons: Lucide for most icons, Hugeicons for specialized ones

### Commenting

- **Don't explain what** — explain **why** (if code is clear, omit comment)
- **No commented-out code** in committed files
- **Inline**: `// lowercase start, no period` (TS/TSX), `# lowercase start, no period` (Python)
- **Section headers**: `// ── Title ──` (TS), `# ── Title ──` (Python)
- **eslint-disable-next-line**: immediately before the suppressed line, no blank line between
- **No JSDoc/TSDoc** in application code — well-named identifiers are sufficient

### Timezone

- **Storage:** All datetimes stored in UTC in PostgreSQL (`DateTime(timezone=True)`)
- **Display/Input:** User-facing times in Iran timezone (`Asia/Tehran`)
- **Helpers:** `app.core.timezone` — `iran_to_utc()` for input, `utc_to_iran()` for output, `now_utc()` for internal comparisons
- **Naive assumption:** Incoming datetimes without timezone info assumed to be Iran local time

---

## Architecture

### Backend: Layer Pattern

Every feature follows this chain:

```
Route (api/v1/*.py) → Service (services/*.py) → Repository (repositories/*.py) → Model (models/*.py)
```

| Layer | Responsibility |
| ----- | -------------- |
| **Router** | HTTP endpoints, validation, auth dependencies |
| **Service** | Business logic, orchestration, cross-cutting concerns |
| **Repository** | Raw DB queries via SQLAlchemy async session (one per model) |
| **Schema** | Pydantic v2 models for request/response serialization |

### Backend: Router Registration

All 16 routers registered in `main.py`:

```python
app.include_router(auth_router, prefix="/api/v1")
app.include_router(courts_router, prefix="/api/v1")
# ...
```

Each router has: `prefix` (e.g. `/auth`), `tags` (single English tag), every endpoint has `summary=` + `response_model=`.

### Backend: Auth Dependencies

| Dependency | Description |
| ----------- | ----------- |
| `get_current_user_optional` | Returns User or None (no error if unauthenticated) |
| `get_current_user` | Returns User or raises 401 |
| `get_current_manager` | Requires manager or admin role (403 otherwise) |
| `get_current_admin` | Requires admin role (403 otherwise) |

All use `HTTPBearer(auto_error=False)`, then decode JWT, verify token version, return user.

### Backend: Error Handling

- Global handlers in `main.py`: HTTPException, RequestValidationError, IntegrityError, StatementError, generic Exception
- Custom Persian error response format in `schemas/error.py`

### Frontend: API Client (`lib/api.ts`)

Centralized `api()` function:

1. Attaches `Authorization: Bearer <token>` header
2. Handles JSON serialization/deserialization
3. On 401: auto-refreshes using refresh_token
4. On refresh failure: clears tokens, redirects to login
5. Adds Sentry breadcrumbs for all API calls
6. Parses Persian error messages from backend

Specialized helpers: `uploadAvatar(file)`, `deleteAvatar()`, `buildAvatarUrl(path)`.

### Frontend: Auth State (`hooks/use-auth.ts`)

`useAuth()` → `{ user, loading, isAuthenticated, login, register, logout, refreshUser }`

- Tokens in `localStorage` (`access_token`, `refresh_token`)
- On mount: tries `/auth/me`, if fails → clears tokens

### Frontend: Dashboard Layout

- Wrapped in `AuthGuard` (redirects to login if unauthenticated)
- `SidebarProvider` + `AppSidebar` (shadcn sidebar, collapsible, role-based nav)
- `SidebarInset` with `overflow-y-auto`
- `SiteHeader` is `sticky top-0 z-10` with backdrop blur

### Frontend: Avatar System

- Upload/delete from settings page
- Files stored at `/uploads/avatars/<uuid>.<ext>` on backend
- Only `relative_url` in DB; `buildAvatarUrl()` prepends `NEXT_PUBLIC_API_URL`
- `<Image unoptimized />` for display
- File deleted on: re-upload, DELETE endpoint, admin hard-delete user

### Frontend: Theme

- `next-themes` with `ThemeProvider` wrapping the app
- Toggle in public header and settings page
- Light + dark modes; system preference on first visit

### Auth Flow

```
Register/Login
  ↓
Returns { access_token, refresh_token, user }
  ↓
Access token (30 min) used for API calls
Refresh token (7 days) for new access tokens
  ↓
On 401: api() helper auto-refreshes and retries
  ↓
Token version (ver) enables session invalidation
```

### Database Models

| Model | Key Fields | Relationships |
| ----- | ---------- | ------------- |
| User | id, phone, password_hash, full_name, role (enum), avatar_url, token_version | has many Bookings, Reviews, Notifications; manages Courts |
| Court | id, name, address, sport_types (JSON), capacity, price_per_slot, is_active, manager_id | belongs to User (manager); has many TimeSlots, Images, Reviews |
| TimeSlot | id, court_id, start_time, end_time, is_reserved, price | belongs to Court; has one Booking |
| Booking | id, user_id, slot_id, status (enum), total_price, paid_at | belongs to User, TimeSlot; has one Payment |
| Payment | id, booking_id, amount, status, gateway_name, ref_id | belongs to Booking |
| Review | id, user_id, court_id, booking_id, rating, comment, response | belongs to User, Court, Booking |
| Wallet | id, user_id, balance | belongs to User; has many Transactions |
| Notification | id, user_id, type, message, is_read | belongs to User |
| Penalty | id, user_id, booking_id, amount, reason | belongs to User, Booking |
| Log | id, user_id, action, details, created_at | audit log for admin |
| Setting | id, key, value, description | platform configuration |

---

## Design & UI

### RTL

- `<html dir="rtl" lang="fa">` in root layout
- `me-`, `ms-` classes instead of `ml-`, `mr-` (Tailwind RTL-aware)
- Radix UI components can misbehave in RTL — `align` and `dir` props must be set correctly
- MutationObserver on site-header fixes Radix scroll-lock padding in RTL

### Mobile

- **Apple HIG 44px touch target:** Global CSS enforces `min-height: 44px` on buttons at ≤767px. Excludes intentionally small buttons via `:not(.size-11):not(.h-11)`.
- **Critical buttons** (hamburger toggle, theme toggle) use `size-11` or `max-sm:size-11`.
- **Hamburger Sheet:** Slides from physical right in RTL (`side="right"` when `isRtl`). Always passes `dir={dir || "rtl"}` prop.

### Tailwind v4

- Uses `@import "tailwindcss"` instead of `@tailwind` directives
- No `@apply` in components — inline classes only
- CSS custom properties via `@theme` directive
- `size-*` replaces `h-* w-*` for square sizing

### Design Tokens

- Persian RTL UI (`dir="rtl"`, `lang="fa"`, IranYekanX font)
- 48px grid pattern overlay on `#toopset-root::before`
- Glassmorphism: `bg-background/80 backdrop-blur-xl`
- View transition API for theme toggle
- Dark mode: `oklch(0.13 0 0)` background, `oklch(0.17 0 0)` card/popover

### Layout Rules

- Max content width: `max-w-7xl` (1280px) with `px-4`
- Vertical padding: `py-12` (48px = 1 grid), `md:py-24` (96px = 2 grids)
- Fixed header: `h-16`, glass effect `border-b bg-background/80 backdrop-blur-xl`
- Footer: `bg-background` with `border-t`

### No-Glow Policy

No glow/shine/neon effects anywhere. No `blur-*` decorative divs, no `bg-gradient-to-r` separator lines, no `radial-gradient` backgrounds, no neon border hovers.

---

## Routes

| Path | Status | Description |
| ---- | ------ | ----------- |
| `/` | ✅ | Homepage (Hero + Search + Map + Courts Grid) |
| `/about` | ✅ | About page |
| `/contact` | ✅ | Contact page |
| `/privacy` | ✅ | Privacy policy |
| `/terms` | ✅ | Terms of service |
| `/register` | ✅ | User registration |
| `/login` | ✅ | User login |
| `/courts/[id]` | ✅ | Court detail page |
| `/book` | ✅ | Booking flow |
| `/dashboard` | ✅ | Dashboard (redirects by role) |
| `/dashboard/user` | ✅ | User dashboard |
| `/dashboard/manager` | ✅ | Manager dashboard |
| `/dashboard/admin` | ✅ | Admin dashboard |
| `/dashboard/bookings` | ✅ | User bookings |
| `/dashboard/courts` | ✅ | Courts management |
| `/dashboard/courts/create` | ✅ | Create court |
| `/dashboard/courts/[id]` | ✅ | Court detail (dashboard) |
| `/dashboard/courts/[id]/edit` | ✅ | Edit court |
| `/dashboard/courts/schedule` | ↪ | Redirects to /dashboard/manager/schedule |
| `/dashboard/manager/schedule` | ✅ | Schedule management (weekly grid, bulk gen) |
| `/dashboard/settings` | ✅ | User settings |
| `/dashboard/payments` | ✅ | Payments list |
| `/dashboard/contact` | ✅ | Messages (admin) |
| `/dashboard/notifications` | ✅ | Notifications |
| `/dashboard/reports` | ✅ | Reports (manager) |
| `/dashboard/users` | ✅ | Users management (admin) |
| `/dashboard/users/[id]` | ✅ | User detail (admin) |
| `/dashboard/admin/bookings` | ✅ | All bookings (admin) |
| `/dashboard/admin/courts` | ✅ | All courts (admin) |
| `/dashboard/admin/payments` | ✅ | Payments management (admin) |
| `/dashboard/admin/settings` | ✅ | Platform settings (admin) |
| `/dashboard/admin/logs` | ✅ | Audit logs (admin) |

---

## Development

### Environment Variables

Each service has its own env file. Copy `.example` to the real file and adjust:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

| File | Purpose |
| ---- | ------- |
| `.env` | Docker Compose infra variables |
| `backend/.env` | DB, Redis, JWT, Sentry, payment/SMS gateway |
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL`, optional `NEXT_PUBLIC_SENTRY_DSN` |
| `.env.example` | Full reference template |

### Commands

**Backend:**

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
python scripts/seed.py                        # Seed database
alembic upgrade head                          # Run migrations
alembic revision --autogenerate -m "message"  # Generate migration
ruff check .                                  # Lint Python
```

**Frontend:**

```bash
cd frontend
npm run dev       # Dev server (Turbopack, :3000)
npm run build     # Production build
npm run lint      # ESLint check
npx tsc --noEmit  # TypeScript type check
```

**Pre-commit:**

```bash
pip install pre-commit && pre-commit install
pre-commit run --all-files
make precommit-install   # via Makefile
make precommit-run       # via Makefile
```

**Version Management:**

```bash
make version                  # Show current version
make version-check            # Verify VERSION == __init__ == package.json
make version-sync             # Sync VERSION → __init__.py + package.json
make version-bump BUMP=patch  # 0.2.0 → 0.2.1
make version-bump BUMP=minor  # 0.2.0 → 0.3.0
make version-bump BUMP=major  # 0.2.0 → 1.0.0
make version-tag              # git tag v0.2.x + push (triggers CD)
```

**SSOT:** `VERSION` file at project root. `backend/app/__init__.py` has `__version__` for dynamic FastAPI metadata. `backend/pyproject.toml` reads via `version = {attr = "app.__version__"}`.

### Pre-commit Hooks

Configured in `.pre-commit-config.yaml`:

| Category | Hook | Scope |
| -------- | ---- | ----- |
| General | trailing-whitespace | All files |
| General | end-of-file-fixer | All files |
| General | check-yaml / check-json / check-toml | Config files |
| General | mixed-line-ending (LF) | All files |
| General | detect-private-key | All files |
| Python | ruff format | backend/ |
| Python | ruff check --fix | backend/ |
| Frontend | prettier | frontend/ |
| Frontend | eslint --fix | frontend/ |

### Workflows

**Adding an API endpoint:**

1. Create schemas in `backend/app/schemas/` (if new)
2. Add service method in `backend/app/services/`
3. Add repository method in `backend/app/repositories/` if needed
4. Add route in the appropriate `backend/app/api/v1/*.py` with `summary=`, `response_model=`
5. Run `alembic revision --autogenerate -m "..."` if models changed

**Adding a frontend page:**

1. Create page file under `frontend/app/` (App Router convention)
2. Use existing shadcn components (Card, Button, Input, etc.)
3. Call `api()` from `lib/api.ts` for data fetching
4. Handle loading/error states with Skeleton + error boundary

**Debugging:**

- **Backend:** Server logs, Sentry for errors
- **Frontend:** Browser DevTools console, Sentry breadcrumbs track API calls
- **Tokens:** Check localStorage, refresh logic in `api.ts`
- **DB:** Check alembic migrations, SQLAlchemy logs
