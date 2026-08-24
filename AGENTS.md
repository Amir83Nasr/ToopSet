# CLAUDE.md

Guidance for Claude Code when working on **ToopSet (توپ‌سِت)** — sports court booking platform in Qom, Iran.

## Project

- **Version:** `0.4.0` — single source of truth in `VERSION` file (see `make version-check` / `make version-bump`).

## Tech Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (radix-nova), framer-motion 12, Radix UI, react-hook-form + zod, Recharts, sonner, embla-carousel, Lucide + Hugeicons
**Backend:** Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), asyncpg, Alembic, Pydantic v2, Redis, python-jose (JWT), passlib (bcrypt), slowapi, Prometheus, Sentry, OpenTelemetry
**Infra:** PostgreSQL 17, Redis 7, Docker Compose

## Architecture

Monorepo: `backend/` (FastAPI) + `frontend/` (Next.js).

**Backend layers:**

- `api/v1/*.py` — thin route handlers. No business logic.
- `services/*.py` — business logic, orchestrate repos, enforce rules.
- `repositories/*.py` — async SQLAlchemy CRUD. One class per model.
- `schemas/*.py` — Pydantic request/response models.
- `models/*.py` — SQLAlchemy ORM models (async engine, declarative base in `core/database.py`).
- `core/*.py` — config, security, DB, Redis, rate limiter, metrics, profiler, logging, telemetry, upload, pagination, exceptions.

**Frontend pattern:** Next.js App Router. Pages in `app/`. Shared components in `components/` (ui/ for shadcn primitives, domain-specific folders otherwise). Custom hooks in `hooks/`. Utilities in `lib/`.

**DB:** PostgreSQL 17 via Docker Compose. Alembic migrations in `backend/migrations/`.

- `make db-migrate` — apply migrations.
- `cd backend && alembic revision --autogenerate -m "desc"` — create new.
- `make db-seed` — seed test data.
- Connection pool: 20 size / 10 overflow (configurable).

## Repository Structure

```
backend/
  app/api/v1/        — Route modules          app/core/         — Cross-cutting
  app/models/        — SQLAlchemy models       app/repositories/ — CRUD layer
  app/services/      — Business logic          app/schemas/      — Pydantic models
  app/__init__.py    — Version constant        app/main.py       — FastAPI app
  migrations/        — Alembic                 tests/            — Pytest
frontend/
  app/               — Next.js pages           components/       — React components (ui/, auth/, bookings/, dashboard/, map/, notifications/, public/, vendors/, admin/)
  hooks/             — Custom hooks            lib/              — api, toast, utils, validations, cookies, constants, i18n
  tests/             — Vitest                  public/           — fonts, icons, images
```

## Development Workflow

**Setup:** `make install` (backend: `pip install -r backend/requirements.txt`, frontend: `pnpm install`).
**Run:** `make dev-backend` (uvicorn :8000), `make dev-frontend` (next --turbopack :3000), `make db-start` (docker postgres+redis).
**Production:** `make build` → `make start` (standalone server on :3000)

**Validation gates (must all pass before commit):**

```bash
make lint           # ruff check (backend) + eslint (frontend)
make format         # ruff format (backend) + prettier (frontend)
make typecheck      # mypy (backend) + tsc (frontend)
make test           # pytest (backend) + vitest (frontend)
make build          # next build (frontend)
make check          # lint + typecheck + build (CI gate)
```

**Lefthook** runs auto on `git commit` (staged: Ruff, Prettier, ESLint, trailing-whitespace, EOF-newline, merge-conflict, private-key, LF endings). `stage_fixed: true`. **Never** `--no-verify`.

**CI architecture** (`backend-ci.yml`, `frontend-ci.yml`): **Never** add `paths:` to `on:` triggers — path-filtered runs are skipped entirely, so required checks stay "Expected" forever and block merges. Path-gating is done at the **job level** via `dorny/paths-filter@v4` (`changes` job → `if: needs.changes.outputs.<pkg> == 'true'`), so skipped jobs report "Success" and required checks always resolve deterministically. Both workflows must run for every PR to `main`.

**Testing:**

- Backend: `backend/tests/`. Requires `toopset_test` DB (`make test-db-setup`). Rate-limiter disabled in conftest. PrometheusMiddleware stripped (event-loop issue in py3.14+).
- Frontend: `frontend/tests/`. Vitest.

## Layout Rules

- Body must never own the application scroll.
- Use app root/container as the main scroll area.
- Avoid width: 100vw unless required.
- Always test RTL layouts.
- Never introduce horizontal overflow.
- Dialogs and Sheets must not shift page layout when opened.

## Code Style

### Section Headers

Config/env/infra files use 80‑char wide `──` dividers:

```text
# ── SECTION TITLE ────────────────────────────────────────────────────────────
```

Use box-drawing `─` (U+2500), never hyphens. Major sections (Makefile) use `───`. Box banners in `.env.example` use `┌─┐`/`└─┘`.

### Backend

- Python 3.12+, line length 100. Ruff (config: `backend/pyproject.toml`). Double quotes. `from __future__ import annotations`.
- SQLAlchemy 2.0 async: `async with async_session_factory() as db`.
- Services inject repos, never use sessions directly.
- New model: create model → schema → repo → service → route.

### Frontend

- TypeScript strict. Prettier + ESLint. React 19, function components + hooks.
- Tailwind v4 (`@import "tailwindcss"` in `globals.css`, no `tailwind.config.ts`). Theme via `@theme inline {}` CSS variables.
- shadcn radix-nova, RTL (`components.json`). Use `cn()` from `@/lib/utils` for class merging.
- **RTL:** Use `start`/`end` never `left`/`right` in Tailwind (e.g. `start-1/2`, `ps-4`, `ms-2`). Leaflet maps reset direction to LTR.
- **Persian digits:** `toPersianDigits()` from `@/lib/utils` for all user-facing numbers. Exceptions: `<input>` values, HH:MM time.
- **Responsive:** Mobile <768px (`useIsMobile()`). Touch targets ≥44px (auto-enforced in CSS). Dialogs become bottom sheets on mobile (opt-out: `mobileAsSheet={false}`). Safe-area: `env(safe-area-inset-*)` — use `.pt-safe`, `.pb-safe`, `.px-safe` utilities.
- **State handling:** Every component must cover loading (spinner), empty (message), error (toast + retry), and edge cases.
- Icons: Hugeicons + Lucide. Toast: sonner via `@/lib/toast`. Theme: `next-themes`.

### Naming

| Layer               | Convention              | Example                     |
| ------------------- | ----------------------- | --------------------------- |
| Backend models      | snake_case, singular    | `time_slot.py`              |
| Backend routes      | snake_case, plural      | `bookings.py`               |
| Backend services    | snake_case + `_service` | `booking_service.py`        |
| Backend repos       | snake_case + `_repo`    | `time_slot_repo.py`         |
| Backend schemas     | snake_case              | `booking.py`                |
| Frontend components | kebab-case              | `booking-cancel-dialog.tsx` |
| Frontend hooks      | `use-` prefix, kebab    | `use-mobile.ts`             |
| Frontend lib files  | kebab-case              | `neshan-map.ts`             |
| API routes          | kebab-case              | `/api/v1/time-slots`        |

## Git Workflow

- `main` = production. Feature branches: `feature/<name>`. Fix branches: `fix/<name>`.
- **Conventional commits:** `<type>(scope): summary`. Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `style`, `revert`. Imperative mood, ~72‑char summary. One logical change per commit.
- Example: `feat(courts): add multi-select sport filter with mono-color badges`

## API Conventions

- FastAPI, all routes under `/api/v1/`. Docs at `/docs`. Health at `/health`. Metrics at `/metrics`.
- JWT access tokens (30min) + refresh tokens (7d, HTTP-only cookie). Auto-refresh on 401 in frontend `lib/api.ts`.
- Route protection: `deps.py` (`get_current_user`, `require_role`, `require_admin`).
- Rate limiting via slowapi. CORS via `CORS_ORIGINS` env var.
- Pagination: `app/core/pagination.py`.
- Two auth flows: password-based (`/login`) and OTP-based (`/register` + `/otp/*`).
- Security headers middleware (`app/core/exceptions.py`). Refresh token rotation with old-token invalidation.

## Environment Variables

Single source of truth: `.env.example` (root). Copy sections to respective files:

- `.env` (root) — Docker Compose
- `backend/.env` — PostgreSQL, Redis, JWT, payment, SMS, Sentry, CORS, logging
- `frontend/.env.local` — API URL, Neshan key, Sentry DSN

Key vars: `SECRET_KEY` (gen: `python3 -c "import secrets; print(secrets.token_urlsafe(64))"`), `PAYMENT_GATEWAY=mock` (dev), `SMS_PROVIDER=mock` (dev, logs to console), `APP_ENVIRONMENT=development|production`, `NEXT_PUBLIC_API_URL=http://localhost:8000` (auto-resolves LAN IP on client).

## Rules & Pitfalls

### Hard Rules

1. **All user-facing numbers → Persian digits** via `toPersianDigits()`.
2. **RTL-first CSS** — use `start`/`end` over `left`/`right`.
3. **No `--no-verify`** — lefthook must pass before every commit.
4. **Conventional commits** — imperative mood, one change per commit.
5. **Every component handles** loading, empty, error, and edge cases.
6. **Repository pattern** — services access DB through repos, never raw sessions.
7. **Safe-area insets** on all fixed-position mobile elements (`env(safe-area-inset-*)`).
8. **Touch targets ≥44px** on mobile (auto-enforced in CSS, but don't override).
9. **Bottom sheets on mobile** — `ResponsiveDialog`/`ResponsiveAlertDialogContent` render Dialog on desktop and bottom Drawer (vaul) on mobile. Use these for booking/record overlays; set `mobileAsSheet={false}` for custom fullscreen overlays. Drawer branch hides the ✕ close button (drag-to-dismiss + cancel button instead).
10. **Frontend auto-refreshes tokens** on 401 via `api()`. Listen for `auth:expired` events.
11. **Commit attribution:** Never include AI name or co-author in commits; use only user name.
12. **IranYekan Typography & Formats:** Use `تومانءء` (with `ءء` glyph) for currency, Persian thousands separator `٬`, and Persian dot separator `٫` (`YYYY٫MM٫DD`) for dates via `formatPrice()` and `formatPersianDate()`.
13. **Dialog & Table Layout:** Do not wrap data tables inside `<Card>` components when used inside dialogs/drawers if it applies unwanted borders or card styling. Tables should be standalone inside dialog content.

### Common Pitfalls

- **Scrollbar shift:** `html body[data-scroll-locked]` CSS in `globals.css` neutralizes `react-remove-scroll-bar` margin. Don't remove.
- **Leaflet popups:** Must use `.theme-popup` class to get app theming.
- **RTL centering:** Centered overlays need `start-1/2` + `rtl:translate-x-1/2`, not `left-1/2` + `-translate-x-1/2`.
- **Prometheus in tests:** Must strip `PrometheusMiddleware` in conftest or py3.14+ pytest-asyncio hangs.
- **Env files are separate:** Docker ← `.env`, backend ← `backend/.env`, frontend ← `frontend/.env.local`. Not shared.
- **Image URLs:** API returns absolute URLs; `buildVendorImageUrl()` converts to relative for `next/image` proxy.
- **Vendor images:** `vendorCreateSchema` requires minimum 3 images.
- **Two auth flows:** password (`/login`) + OTP (`/otp/*`) — both active.
- **map:** Neshan tiles with CartoDB fallback on 204 errors.
- **New model workflow:** model → schema → repo → service → route (test each step).
- **API errors:** Frontend `lib/api.ts` auto-translates server error messages to Persian.
