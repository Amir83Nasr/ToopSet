<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/icons/profile/profile.svg" />
    <img src="docs/icons/profile/profile.svg" alt="ToopSet" width="120" />
  </picture>
</p>

<h1 align="center">توپ‌سِت | ToopSet</h1>

<p align="center">
  <strong>Online sports court booking platform for Qom, Iran</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/FastAPI-Latest-009688" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-336791" alt="PostgreSQL 17" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D" alt="Redis 7" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4" alt="Tailwind v4" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB" alt="Python 3.12" />
  <img src="https://img.shields.io/badge/Version-1.1.0-blue" alt="Version 1.1.0" />
</p>

---

## Overview

ToopSet is a production-grade platform for discovering and booking sports courts. Built for the Qom market with Persian-first UX, it supports role-based dashboards (user, manager, admin), real-time booking with optimistic concurrency, payment simulation, and a full observability stack.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Branch Strategy & Git Workflow](#branch-strategy--git-workflow)
- [CI Pipeline](#ci-pipeline)
- [Deployment](#deployment)
- [Local Development](#local-development)
- [Environment Setup](#environment-setup)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Production Readiness](#production-readiness)
- [License](#license)

---

## Tech Stack

| Layer          | Technology                                                             |
| -------------- | ---------------------------------------------------------------------- |
| **Frontend**   | Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui           |
| **Backend**    | Python 3.12 + FastAPI + SQLAlchemy 2.0 (async) + Alembic               |
| **Database**   | PostgreSQL 17                                                          |
| **Cache**      | Redis 7                                                                |
| **Auth**       | JWT (HS256) + bcrypt + refresh token rotation + session management     |
| **Maps**       | Neshan Maps SDK (Qom-bounded, CartoDB fallback)                        |
| **Locale**     | Persian (fa-IR) — RTL layout, Jalali dates, Persian digits             |
| **Monitoring** | Prometheus + Grafana + OpenTelemetry + Sentry                          |
| **Infra**      | Vercel (frontend) + Railway (backend) + Docker Compose (local)         |
| **CI/CD**      | GitHub Actions + Lefthook (pre-commit/push hooks)                      |

---

## Architecture

```
Client (Next.js on Vercel)
    │
    ▼
API Route (api/v1/*.py) ─── Deps: Auth (4 tiers)
    │
    ▼
Service Layer (services/*.py) ─── business logic, validation
    │
    ▼
Repository Layer (repositories/*.py) ─── async SQLAlchemy queries
    │
    ├──► PostgreSQL 17 ─── indexed, connection pooled, slow-query tracked
    └──► Redis 7 ───────── caching, rate limiting, session storage
```

**Middleware stack** (applied in order):

1. `CORSMiddleware`
2. `CorrelationIdMiddleware` — X-Request-ID propagation
3. `ProfilerMiddleware` — per-request timing breakdown
4. `SecurityHeadersMiddleware` — OWASP security headers
5. `PrometheusMiddleware` — HTTP metrics
6. `SlowAPIMiddleware` — Redis-backed rate limiting

---

## Branch Strategy & Git Workflow

See [BRANCH_STRATEGY.md](BRANCH_STRATEGY.md) for full details.

```
main          ─── production (stable, auto-deploys to Vercel + Railway Production)
develop       ─── staging (integration, auto-deploys to Vercel Preview + Railway Staging)
feature/*     ─── new features (branch off develop, PR to develop)
fix/*         ─── bug fixes (branch off develop, PR to develop)
hotfix/*      ─── urgent production fixes (branch off main, PR to main + develop)
```

### Flow

```
Feature Branch → Pull Request → develop (CI runs) → Merge → main (CI runs) → Production Deploy
```

- No direct pushes to `main` or `develop` — all changes enter via PR.
- Every PR triggers CI (lint → typecheck → build → test).
- Merges to `develop` auto-deploy to staging.
- Merges to `main` auto-deploy to production.

---

## CI Pipeline

GitHub Actions runs on every PR and push to `main`/`develop`:

### Frontend (`ci.yml`)

```
Checkout → Setup Node → Install deps → Lint (ESLint) → Typecheck → Build (Next.js)
```

### Backend (`ci.yml`)

```
Checkout → Setup Python → Install deps → Format check (Ruff) → Lint (Ruff)
→ Typecheck (mypy) → Migration check → Migrate → Test (pytest)
```

Both jobs run in parallel. **Fail-fast**: any failing step stops the job immediately.

### Local hooks (Lefthook)

| Hook       | Checks                                                              |
| ---------- | ------------------------------------------------------------------- |
| Pre-commit | Trailing whitespace, EOF newline, merge conflicts, private keys     |
|            | Ruff format + lint (staged Python files)                            |
|            | Prettier + ESLint (staged frontend files)                           |
| Pre-push   | TypeScript typecheck, full ESLint, Next.js build                    |
|            | Ruff (full check), mypy, migration revision check, YAML validation  |

Tests are excluded from hooks (need running PostgreSQL). CI is the safety layer.

---

## Deployment

### Frontend (Vercel)

| Branch    | Vercel Environment | URL pattern                       |
| --------- | ------------------ | --------------------------------- |
| `develop` | Preview            | `toopset-git-develop.vercel.app`  |
| `main`    | Production         | `toopset.vercel.app` (custom)     |

**Deployment workflow** (`.github/workflows/deploy-frontend.yml`):

1. `git push` to `develop` or `main`
2. GitHub Action triggers → installs Vercel CLI
3. Pulls environment variables from Vercel dashboard
4. Builds and deploys to the matching environment
5. Preview URL is posted as a comment on the commit

**Environment variables** are set in Vercel dashboard:
- **Production**: `NEXT_PUBLIC_API_URL` (Railway production), `NEXT_PUBLIC_NESHAN_API_KEY`, etc.
- **Preview**: same keys, different values pointing to Railway staging

Never store secrets in `.env.production` files on disk.

### Backend (Railway)

| Branch    | Railway Environment | Database         |
| --------- | ------------------- | ---------------- |
| `develop` | Staging             | Separate PG + Redis |
| `main`    | Production          | Separate PG + Redis |

**Deployment workflow** (`.github/workflows/deploy-backend.yml`):

1. `git push` to `develop` or `main`
2. GitHub Action triggers → installs Railway CLI
3. Builds Docker image and deploys to the matching Railway environment
4. Railway healthchecks validate the deployment

**Two Railway environments** are required — never share databases between staging and production.

### Migration + App startup order

```
1. Docker container starts
2. Entrypoint runs static revision check (no DB)
3. `alembic upgrade head` applies pending migrations
4. Only then: uvicorn starts accepting traffic
```

This guarantees the database schema is current before the app serves requests. Rollback is always possible:

```bash
alembic downgrade -1   # roll back one step
alembic downgrade <revision_id>  # roll back to specific revision
```

---

## Environment Setup

### Secret generation

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### Env file layout

| File                          | Purpose                       | Committed? |
| ----------------------------- | ----------------------------- | ---------- |
| `.env.example`                | Reference for all env vars    | ✅ yes     |
| `backend/.env.example`        | Backend local dev template    | ✅ yes     |
| `frontend/.env.example`       | Frontend local dev template   | ✅ yes     |
| `.env`                        | Docker Compose (ports only)   | ❌ no      |
| `backend/.env`                | Backend local dev             | ❌ no      |
| `frontend/.env.local`         | Frontend local dev            | ❌ no      |
| `backend/.env.production`     | Deleted — use dashboards      | ❌ no      |
| `frontend/.env.production`    | Deleted — use dashboards      | ❌ no      |

### Required secrets per environment

**Railway Production:**

| Variable                      | Where              |
| ----------------------------- | ------------------ |
| `DATABASE_URL`                | Postgres add-on    |
| `REDIS_URL`                   | Redis add-on       |
| `SECRET_KEY`                  | Manual (64+ chars) |
| `APP_ENVIRONMENT`             | `production`       |
| `REFRESH_COOKIE_SECURE`       | `true`             |
| `REFRESH_COOKIE_SAMESITE`     | `none`             |
| `CORS_ORIGINS`                | Frontend URL       |
| `PAYMENT_GATEWAY`             | Your choice        |
| `SMS_PROVIDER`                | Your choice        |
| `SMS_API_URL`                 | SMS.ir Verify URL  |
| `SMS_API_KEY`                 | SMS.ir secret      |
| `SMS_TEMPLATE_ID`             | Verify template ID |

**Railway Staging:** Same variables, different values (separate DB, separate Redis).

**Vercel Production:**

| Variable                      | Where              |
| ----------------------------- | ------------------ |
| `NEXT_PUBLIC_API_URL`         | Railway production |
| `NEXT_PUBLIC_NESHAN_API_KEY`  | Neshan dashboard   |

**Vercel Preview:** Same as production, but `NEXT_PUBLIC_API_URL` points to Railway staging.

### Migrating secrets from .env files to dashboard

```bash
bash scripts/migrate-secrets-to-dashboard.sh
```

This prints all variables you need to copy into Railway and Vercel dashboards, then delete the local files.

---

## Local Development

### Prerequisites

- Docker (for PostgreSQL + Redis)
- Python 3.12+
- Node.js 22+
- pnpm

### Setup

```bash
# 1. Clone and install
git clone git@github.com:Amir83Nasr/ToopSet.git
cd ToopSet
make install

# 2. Start dependencies
make db-start

# 3. Set up environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edit as needed

# 4. Run migrations + seed
make db-migrate
make db-seed

# 5. Start development servers (two terminals)
make dev-backend   # FastAPI on :8000
make dev-frontend  # Next.js on :3000
```

### Validation

```bash
make doctor          # Check system prerequisites
make check           # Lint + typecheck + build (CI gate)
make test            # Run all tests
make version-check   # Verify version consistency
```

### Makefile reference

| Command                  | Description                              |
| ------------------------ | ---------------------------------------- |
| `make install`           | Install all dependencies                 |
| `make dev-backend`       | Start FastAPI (auto-reload)              |
| `make dev-frontend`      | Start Next.js (Turbopack HMR)            |
| `make db-start`          | PostgreSQL + Redis via Docker            |
| `make db-migrate`        | Run Alembic migrations                   |
| `make db-seed`           | Seed with Persian test data              |
| `make db-autogenerate`   | Create migration: `MSG="description"`    |
| `make db-downgrade`      | Rollback: `REV=-1`                       |
| `make lint`              | Run all linters (Ruff + ESLint)          |
| `make format`            | Format all code (Ruff + Prettier)        |
| `make typecheck`         | Run all type checkers (mypy + tsc)       |
| `make test`              | Run all tests (pytest + vitest)          |
| `make build`             | Build frontend (production, webpack)     |
| `make start`             | Start production frontend (standalone)   |
| `make check`             | lint + typecheck + build                 |
| `make version-bump`      | Bump: `BUMP=patch|minor|major`           |
| `make doctor`            | Verify system setup                      |
| `make clean`             | Remove build artifacts                   |

---

## Project Structure

```
├── frontend/               # Next.js 16 app (Vercel)
│   ├── app/                # App Router (RTL, Persian, dark-mode)
│   ├── components/         # UI components (36 shadcn primitives)
│   ├── hooks/              # Custom hooks
│   ├── lib/                # API client, utilities, map wrapper
│   └── tests/              # Vitest test suite
│
├── backend/                # FastAPI server (Railway)
│   ├── app/
│   │   ├── api/v1/         # 18 routers (thin, no business logic)
│   │   ├── core/           # Config, security, DB, Redis, metrics
│   │   ├── models/         # 16 SQLAlchemy models
│   │   ├── schemas/        # 16 Pydantic v2 schemas
│   │   ├── services/       # 13 business logic services
│   │   └── repositories/   # 12 data access repos
│   ├── tests/              # Pytest integration tests
│   └── migrations/         # Alembic migration versions
│
├── .github/workflows/      # CI + Deploy pipelines
│   ├── ci.yml              # PR + push checks
│   ├── deploy-frontend.yml # Vercel deployment
│   └── deploy-backend.yml  # Railway deployment
│
├── scripts/                # Utility scripts
├── docs/                   # Documentation, screenshots, diagrams
├── compose.yml             # Docker Compose (postgres + redis)
├── BRANCH_STRATEGY.md      # Full git workflow
├── VERSION                 # Single source of truth
└── Makefile                # Developer workflow
```

---

## Testing

| Layer    | Framework | Location              |
| -------- | --------- | --------------------- |
| Backend  | pytest    | `backend/tests/`      |
| Frontend | vitest    | `frontend/tests/`     |

```bash
make test          # Run all (requires running PostgreSQL)
make test-backend  # Backend only
make test-frontend # Frontend only
```

### Database migrations safety

Migration order is enforced:

1. **Static check** at container startup verifies revision metadata (no DB needed).
2. **Alembic upgrade** applies pending migrations before the app serves traffic.
3. **Rollback safety**: every migration has a `downgrade()` function.
4. **Single head**: verified at CI runtime via `alembic upgrade head`.

---

## Production Readiness

- [x] Multi-stage Docker builds with non-root user
- [x] Environment validation at startup (SECRET_KEY, CORS, DB config)
- [x] Cursor-based pagination for scalable list endpoints
- [x] JWT with key rotation capability
- [x] Refresh token rotation and session management
- [x] OWASP security headers (CSP, HSTS, XFO, X-Content-Type-Options)
- [x] File upload sanitization (MIME detection, SVG XSS stripping)
- [x] Rate limiting (Redis-backed with in-memory fallback)
- [x] Connection pooling with health checks and timeout
- [x] Structured JSON logging with correlation IDs
- [x] Prometheus metrics and Grafana dashboards
- [x] OpenTelemetry tracing (FastAPI, SQLAlchemy, Redis, HTTPX)
- [x] Slow query logging and request profiling
- [x] SLO definitions (availability 99.9%, latency P99 500ms)
- [x] Git-flow branching with branch protection
- [x] CI pipeline (lint, typecheck, test, build) on every PR
- [x] Automated deployments (Vercel + Railway)
- [x] Separated staging/production databases + secrets
- [ ] Real payment gateway integration
- [ ] Real SMS provider integration
- [ ] TLS termination (Caddy config commented in compose.prod.yml)

---

## License

All Rights Reserved. Copyright (c) 2026 ToopSet Team. See [LICENSE](LICENSE) for details.
