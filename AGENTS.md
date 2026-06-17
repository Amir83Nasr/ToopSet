# ToopSet Project Guide

## Overview

ToopSet is a Persian sports venue booking platform. Users can search for sports courts (e.g., football, basketball, tennis), book available time slots, pay through a wallet system, leave reviews, and manage their profile. Managers can register and manage their own courts. Admins oversee the entire system — approving courts, managing users, viewing logs, and configuring platform settings.

**License**: Proprietary — All rights reserved. See [LICENSE](../LICENSE) for details.

---

## Tech Stack

### Backend

| Layer      | Technology                                |
| ---------- | ----------------------------------------- |
| Language   | Python 3.12+                              |
| Framework  | FastAPI                                   |
| ORM        | SQLAlchemy 2.0 (async)                    |
| Database   | PostgreSQL                                |
| Auth       | JWT (access + refresh) via `python-jose`  |
| Validation | Pydantic v2                               |
| Migrations | Alembic                                   |
| Caching    | Redis                                     |
| Monitoring | Sentry + Prometheus                       |
| Server     | Uvicorn (dev) / Gunicorn + Uvicorn (prod) |

### Frontend

| Layer      | Technology                                  |
| ---------- | ------------------------------------------- |
| Language   | TypeScript (strict)                         |
| Framework  | Next.js 16 (App Router)                     |
| Styling    | Tailwind CSS v4                             |
| Components | shadcn/ui + Radix UI primitives             |
| Icons      | Lucide React + Hugeicons                    |
| Forms      | react-hook-form + @hookform/resolvers (zod) |
| Date       | react-day-picker (Jalali/Shamsi calendar)   |
| HTTP       | Fetch-based custom `api()` helper           |
| Auth       | JWT stored in localStorage, auto-refresh    |
| Toast      | Custom `lib/toast.ts`                       |
| Monitoring | @sentry/nextjs                              |

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
      /upload.py      — File upload helpers (save_upload, delete_upload, _detect_mime)
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
    /models/          — SQLAlchemy ORM models (user, court, booking, etc.)
    /repositories/    — DB query layer (one repo per model)
    /schemas/         — Pydantic request/response models (one file per domain)
    /services/        — Business logic layer (one service per domain)
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

## API Architecture (Backend)

### Layer Pattern

Every feature follows this dependency chain:

```
Route (api/v1/*.py) → Service (services/*.py) → Repository (repositories/*.py) → Model (models/*.py)
```

- **Routers**: Define HTTP endpoints, validation, auth dependencies. No business logic.
- **Services**: Orchestrate business logic, call repositories, handle cross-cutting concerns.
- **Repositories**: Raw DB queries via SQLAlchemy async session. One repo per model.
- **Schemas**: Pydantic v2 models for request validation and response serialization.

### Router Registration

All 16 routers are imported and registered in `main.py`:

```python
app.include_router(auth_router, prefix="/api/v1")
app.include_router(courts_router, prefix="/api/v1")
# ... etc
```

Each router has:

- A `prefix` (e.g., `/auth`, `/courts`)
- A `tags` list (single English tag name for Swagger grouping)
- Every endpoint has `summary=` (English) and `response_model=` (Pydantic schema)

### Auth Dependencies (`deps.py`)

| Dependency                  | Description                                        |
| --------------------------- | -------------------------------------------------- |
| `get_current_user_optional` | Returns User or None (no error if unauthenticated) |
| `get_current_user`          | Returns User or raises 401                         |
| `get_current_manager`       | Requires manager or admin role (403 otherwise)     |
| `get_current_admin`         | Requires admin role (403 otherwise)                |

All use `HTTPBearer(auto_error=False)` for token extraction, then decode JWT, verify token version, and return the user.

### Error Handling

- Global exception handlers in `main.py`: HTTPException, RequestValidationError, IntegrityError, StatementError, generic Exception
- Custom Persian error response format in `schemas/error.py`

---

## Frontend Architecture

### API Client (`lib/api.ts`)

Centralized `api()` function that:

1. Attaches `Authorization: Bearer <token>` header
2. Handles JSON serialization/deserialization
3. On 401: automatically attempts token refresh using refresh_token
4. On refresh failure: clears tokens, redirects to login
5. Adds Sentry breadcrumbs for all API calls
6. Parses Persian error messages from backend

Specialized helpers:

- `uploadAvatar(file)` — multipart upload with token refresh
- `deleteAvatar()` — DELETE /auth/avatar
- `buildAvatarUrl(path)` — builds full URL from relative avatar path

### Auth State (`hooks/use-auth.ts`)

- `useAuth()` hook provides: `{ user, loading, isAuthenticated, login, register, logout, refreshUser }`
- Tokens stored in `localStorage` (`access_token`, `refresh_token`)
- On mount: tries to load user from `/auth/me`, if fails → clears tokens
- `logout()`: clears tokens + localStorage + redirects to home
- `refreshUser()`: re-fetches `/auth/me` and updates state

### Dashboard Layout

- Wrapped in `AuthGuard` (redirects to login if not authenticated)
- `SidebarProvider` + `AppSidebar` (shadcn sidebar, collapsible, role-based nav items)
- `SidebarInset` with `overflow-y-auto` (scrollable content area)
- `SiteHeader` is `sticky top-0 z-10` with backdrop blur transparency
- Dashboard pages: `/dashboard/` route group, role-specific sub-pages

### Avatar System

- Users can upload/delete their avatar from settings page
- Avatar files stored at `/uploads/avatars/<uuid>.<ext>` on backend
- Only `relative_url` (e.g., `/uploads/avatars/uuid.jpg`) stored in DB
- Frontend `buildAvatarUrl()` prepends `NEXT_PUBLIC_API_URL`
- `<Image unoptimized />` for avatar display (no Next.js optimization needed)
- File physically deleted on: re-upload, avatar DELETE endpoint, admin hard-delete user

### Theme

- `next-themes` with `ThemeProvider` wrapping the app
- Theme toggle in public header (ModeToggle component) and settings page
- Supports `light` and `dark` modes
- System preference respected on first visit

---

## Auth Flow

```
Register/Login
  ↓
Returns { access_token, refresh_token, user }
  ↓
Access token (30 min default) used for API calls
Refresh token (7 days) used to get new access tokens
  ↓
On 401: api() helper auto-refreshes and retries the request
  ↓
Token version (ver) enables session invalidation from other devices
```

---

## Database Models

Key models and their relationships:

| Model        | Key Fields                                                                             | Relationships                                                  |
| ------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| User         | id, phone, password_hash, full_name, role (enum), avatar_url, token_version            | has many Bookings, Reviews, Notifications, manages Courts      |
| Court        | id, name, address, sport_types (JSON), capacity, price_per_slot, is_active, manager_id | belongs to User (manager), has many TimeSlots, Images, Reviews |
| TimeSlot     | id, court_id, start_time, end_time, is_reserved, price                                 | belongs to Court, has one Booking                              |
| Booking      | id, user_id, slot_id, status (enum), total_price, paid_at                              | belongs to User, belongs to TimeSlot, has one Payment          |
| Payment      | id, booking_id, amount, status, gateway_name, ref_id                                   | belongs to Booking                                             |
| Review       | id, user_id, court_id, booking_id, rating, comment, response                           | belongs to User, belongs to Court, belongs to Booking          |
| Wallet       | id, user_id, balance                                                                   | belongs to User, has many Transactions                         |
| Notification | id, user_id, type, message, is_read                                                    | belongs to User                                                |
| Penalty      | id, user_id, booking_id, amount, reason                                                | belongs to User, belongs to Booking                            |
| Log          | id, user_id, action, details, created_at                                               | audit log for admin                                            |
| Setting      | id, key, value, description                                                            | platform configuration                                         |

---

## Key Conventions

### Language

- UI text and error messages are in **Persian**; Swagger summaries, code, and comments are in **English**
- Code, variable names, comments, types, commit messages are in **English**
- Commit messages follow conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, etc.

### RTL Design

- `<html dir="rtl" lang="fa">` in root layout
- All components designed for RTL layout
- `me-`, `ms-` classes used instead of `ml-`, `mr-` (Tailwind RTL-aware)
- Radix UI components can misbehave in RTL — `align` and `dir` props must be set correctly
- Site-header has a MutationObserver to fix Radix scroll-lock padding in RTL

### Code Style — Backend

- Type hints on all functions
- `from __future__ import annotations` in all route/service files
- Async/await throughout (SQLAlchemy async sessions)
- Pydantic v2 `model_validate()` for ORM → schema conversion
- Business logic goes in Services, not Routes or Repositories
- Use `log_action()` for audit trail on important operations

### Timezone

- **Storage:** All datetimes stored in UTC in PostgreSQL (columns use `DateTime(timezone=True)`)
- **Display/Input:** User-facing times are in Iran timezone (`Asia/Tehran`)
- **Conversion helpers:** Use `app.core.timezone` — `iran_to_utc()` for input, `utc_to_iran()` for output, `now_utc()` for internal comparisons
- **Naive assumption:** Incoming datetimes without timezone info are assumed to be Iran local time
- **Rate limiting:** Redis-backed via slowapi — see `app.core.rate_limiter`; auth endpoints have per-endpoint limits (login: 5/min, register: 3/min, refresh: 10/min)

### Code Style — Frontend

- TypeScript strict mode
- `"use client"` for interactive components, server components by default
- Prefer existing shadcn/ui components over custom HTML
- Use `cn()` utility from `lib/utils.ts` for conditional Tailwind class merging
- `size-*` classes for consistent icon sizing (Tailwind v4)
- Icons: Lucide for most icons, Hugeicons for specialized ones
- Form fields use shadcn Input + Label components with consistent sizing

### Mobile Design

- **Apple HIG 44px touch target**: Global CSS in `frontend/app/globals.css` enforces `min-height: 44px` on buttons at viewports ≤ 767px. Uses exclusion selectors (`:not(.size-11):not(.h-11)`) to leave intentionally small buttons untouched.
- **Critical buttons** (hamburger menu toggle, theme toggle) use `size-11` or `max-sm:size-11` for explicit 44px sizing on mobile.
- **Hamburger menu Sheet**: On mobile, the sidebar/nav Sheet slides from the **physical right** in RTL mode (`side="right"` when `isRtl`). This ensures the sheet opens in the user's natural thumb zone.
- **Sheet direction prop**: Mobile variant of `SheetContent` always passes `dir={dir || "rtl"}` to ensure correct RTL text direction inside slide-in panels.

### Tailwind CSS v4 Notes

- Tailwind v4 uses `@import "tailwindcss"` instead of `@tailwind` directives
- No `@apply` in components — use inline classes
- CSS custom properties for theming via `@theme` directive
- Utility classes like `bg-background/80`, `text-muted-foreground` use CSS variables
- `size-*` replaces `h-* w-*` for square sizing

---

## Pre-commit Hooks

Project uses [pre-commit](https://pre-commit.com) for automated code quality gates:

```bash
pip install pre-commit     # One-time install
pre-commit install          # Activate hooks for this repo
pre-commit run --all-files  # Run once on all files
pre-commit autoupdate       # Update hook versions
```

**Configured hooks** (`.pre-commit-config.yaml`):

| Category | Hook                                 | Scope        |
| -------- | ------------------------------------ | ------------ |
| General  | trailing-whitespace                  | All files    |
| General  | end-of-file-fixer                    | All files    |
| General  | check-yaml / check-json / check-toml | Config files |
| General  | mixed-line-ending (LF)               | All files    |
| General  | detect-private-key                   | All files    |
| Python   | ruff format                          | backend/     |
| Python   | ruff check --fix                     | backend/     |
| Frontend | prettier                             | frontend/    |
| Frontend | eslint --fix                         | frontend/    |

## Environment Variables

Each service has its own env file — no single `.env` to rule them all:

| File                    | Purpose                       |
| ----------------------- | ----------------------------- |
| `.env`                  | Docker Compose infrastructure |
| `backend/.env`          | Backend runtime variables     |
| `backend/.env.example`  | Backend env template          |
| `frontend/.env.local`   | Frontend runtime variables    |
| `frontend/.env.example` | Frontend env template         |
| `.env.example`          | Comprehensive reference       |

Copy the relevant example and adjust:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

**Backend** (`backend/.env`): Postgres, Redis, JWT secrets, connection pool, payment/SMS gateway, Sentry.

**Frontend** (`frontend/.env.local`): `NEXT_PUBLIC_API_URL`, optional `NEXT_PUBLIC_SENTRY_DSN`.

**Root** (`.env`): Only Docker Compose variable substitution (ports, project name).

---

## Commands

### Backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
python scripts/seed.py                         # Seed database with sample data
alembic upgrade head                           # Run pending migrations
alembic revision --autogenerate -m "message"   # Generate migration from model changes
ruff check .                                   # Lint Python code
```

### Frontend

```bash
cd frontend
npm run dev            # Dev server (Turbopack, http://localhost:3000)
npm run build          # Production build
npm run lint           # ESLint check
npx tsc --noEmit       # TypeScript type check
```

### Pre-commit

```bash
pip install pre-commit && pre-commit install   # Setup hooks
pre-commit run --all-files                     # Run all hooks
make precommit-install                         # (via Makefile)
make precommit-run                             # (via Makefile)
```

### Version Management

```bash
make version                # Show current version (0.2.x)
make version-check          # Verify VERSION == __init__ == package.json
make version-sync           # Sync VERSION → __init__.py + package.json
make version-bump BUMP=patch    # 0.2.0 → 0.2.1
make version-bump BUMP=minor    # 0.2.0 → 0.3.0
make version-bump BUMP=major    # 0.2.0 → 1.0.0
make version-tag            # git tag v0.2.x + push (triggers CD)
```

**SSOT**: `VERSION` file in project root. `backend/app/__init__.py` has `__version__` for dynamic FastAPI metadata. `backend/pyproject.toml` reads dynamically via `version = {attr = "app.__version__"}`.

---

## Common Workflows

### Adding a new API endpoint

1. Create request/response schemas in `backend/app/schemas/` (if new)
2. Add service method in `backend/app/services/`
3. Add repository method in `backend/app/repositories/` if needed
4. Add route in the appropriate `backend/app/api/v1/*.py` with `summary=`, `response_model=`
5. Run `alembic revision --autogenerate -m "..."` if model changes

### Adding a new frontend page

1. Create page file under `frontend/app/` (App Router convention)
2. Use existing shadcn components (Card, Button, Input, etc.)
3. Call `api()` from `lib/api.ts` for data fetching
4. Handle loading/error states with Skeleton + error boundary

### Debugging

- Backend: Check server logs in terminal, Sentry for errors
- Frontend: Browser DevTools console, Sentry breadcrumbs track all API calls
- Token issues: Check localStorage, refresh logic in `api.ts`
- DB issues: Check alembic migrations, SQLAlchemy logs

---

## Agent Development Guide

### Commenting Conventions

#### Frontend (TypeScript / TSX)

- **Inline comments**: `// lowercase start, no trailing period`

  ```ts
  // fetch court details for each favorite
  const data = await getFavorites(user.id);
  ```

- **Section headers**: `// ── Title ──` (em-dash, padded with spaces)

  ```ts
  // ── Types ──
  // ── Helpers ──
  // ── Page ──
  ```

- **eslint-disable-next-line**: placed immediately before the suppressed line, no extra blank line

  ```ts
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setState(value);
  ```

- **No JSDoc/TSDoc** in application code — let well-named identifiers speak. Only use `/** */` for external-facing library exports if needed.

#### Backend (Python)

- **Inline comments**: `# lowercase start, no trailing period`

  ```py
  # fallback: replace numeric path segments with {id}
  ```

- **Section headers**: `# ── Title ──` (em-dash, padded with spaces, dashes to fill 60 chars)

  ```py
  # ── Path normalisation helper ───────────────────────────────────────────
  # ── Global exception handlers ───────────────────────────────────────────
  ```

- **Multi-line logic comments**: capitalize first word if it reads as a sentence

  ```py
  # Pre-check related data to avoid FK violations
  ```

#### CSS

- **Inline comments**: `/* lowercase start, no trailing period */`

  ```css
  /* neon border on hover */
  ```

- **Section headers**: `/* ── Title ── */` (single line)

  ```css
  /* ── Text selection ── */
  ```

#### General rules

1. **Don't explain what** — explain **why**. If the code is clear without a comment, omit it.
2. **No commented-out code** in committed files. Remove dead code, don't just comment it.
3. **Keep comments short** — one line max. If you need more, the code needs refactoring.
4. **Section separators** are 60 characters wide (title + dashes to fill).

### Design System

- Persian RTL UI (`dir="rtl"`, `lang="fa"`, IranYekanX font)
- 48px grid pattern overlay on `#toopset-root::before`
- Glassmorphism: `bg-background/80 backdrop-blur-xl`
- Shimmer text gradient animation
- View transition API for theme toggle
- Dark mode: `oklch(0.13 0 0)` background, `oklch(0.17 0 0)` card/popover

### Key Layout Rules

- Max content width: `max-w-7xl` (1280px) with `px-4`
- Vertical padding: `py-12` (48px = 1 grid), `md:py-24` (96px = 2 grids)
- Fixed header: `h-16`, glass effect with `border-b bg-background/80 backdrop-blur-xl`
- Footer: `bg-background` with `border-t`

### No-Glow Policy

No glow/shine/neon effects anywhere in the app. No `blur-*` decorative divs, no `bg-gradient-to-r` separator lines, no `radial-gradient` ambient backgrounds, no neon border hovers.

### Routes

| Path                          | Status | Description                                  |
| ----------------------------- | ------ | -------------------------------------------- |
| `/`                           | ✅     | Homepage (Hero + Search + Map + Courts Grid) |
| `/about`                      | ✅     | About page                                   |
| `/contact`                    | ✅     | Contact page                                 |
| `/privacy`                    | ✅     | Privacy policy                               |
| `/terms`                      | ✅     | Terms of service                             |
| `/register`                   | ✅     | User registration                            |
| `/login`                      | ✅     | User login                                   |
| `/courts/[id]`                | ✅     | Court detail page                            |
| `/book`                       | ✅     | Booking flow                                 |
| `/dashboard`                  | ✅     | Dashboard (redirects by role)                |
| `/dashboard/user`             | ✅     | User dashboard                               |
| `/dashboard/manager`          | ✅     | Manager dashboard                            |
| `/dashboard/admin`            | ✅     | Admin dashboard                              |
| `/dashboard/bookings`         | ✅     | User bookings                                |
| `/dashboard/courts`           | ✅     | Courts management                            |
| `/dashboard/courts/create`    | ✅     | Create court                                 |
| `/dashboard/courts/[id]`      | ✅     | Court detail (dashboard)                     |
| `/dashboard/courts/[id]/edit` | ✅     | Edit court                                   |
| `/dashboard/courts/schedule`  | ↪️     | Redirects to /dashboard/manager/schedule     |
| `/dashboard/manager/schedule` | ✅     | Schedule management (weekly grid, bulk gen)  |
| `/dashboard/settings`         | ✅     | User settings                                |
| `/dashboard/payments`         | ✅     | Payments list                                |
| `/dashboard/contact`          | ✅     | Messages (admin)                             |
| `/dashboard/notifications`    | ✅     | Notifications                                |
| `/dashboard/reports`          | ✅     | Reports (manager)                            |
| `/dashboard/users`            | ✅     | Users management (admin)                     |
| `/dashboard/users/[id]`       | ✅     | User detail (admin)                          |
| `/dashboard/admin/bookings`   | ✅     | All bookings (admin)                         |
| `/dashboard/admin/courts`     | ✅     | All courts (admin)                           |
| `/dashboard/admin/payments`   | ✅     | Payments management (admin)                  |
| `/dashboard/admin/settings`   | ✅     | Platform settings (admin)                    |
| `/dashboard/admin/logs`       | ✅     | Audit logs (admin)                           |
