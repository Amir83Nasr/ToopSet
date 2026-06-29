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
  <img src="https://img.shields.io/badge/Tests-248%20passing-success" alt="248 tests passing" />
  <img src="https://img.shields.io/badge/Version-0.4.0-blue" alt="Version 0.4.0" />
</p>

---

## Overview

ToopSet is a production-grade platform for discovering and booking sports courts. Built for the Qom market with Persian-first UX, it supports role-based dashboards (user, manager, admin), real-time booking with optimistic concurrency, payment simulation, and a full observability stack.

---

## Features

### Core Booking
- **Court discovery** — browse by sport type, location (Neshan Maps), rating, and availability
- **Time slot booking** — 7-day view with real-time availability, optimistic locking prevents double-booking
- **Payment flow** — 10-minute payment window with simulated success/fraud/timeout scenarios
- **Cancellation policy** — tiered: &lt;2h (impossible), 2-24h (50% penalty), &gt;24h (free refund to wallet)
- **Reviews & ratings** — per-court reviews with manager response capability

### Authentication & Security
- **4-tier auth** — optional user, required user, manager-gated, admin-gated
- **JWT with key rotation** — HS256, kid header, dual-key support for seamless rotation
- **Refresh token rotation** — session-bound refresh tokens, hashed storage, automatic rotation detection
- **Session management** — per-user session tracking with cleanup interval, single-device enforcement via token version
- **Rate limiting** — Redis-backed, graceful fallback to in-memory on Redis failure (3/min register, 5/min login)
- **Password policy** — bcrypt hashing, minimum 32-char secret key enforcement at startup
- **Upload sanitization** — MIME detection via magic bytes, SVG XSS stripping, extension validation, 5MB cap
- **HTTP security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, Referrer-Policy
- **OTP rate limiting** — lockout tracking with Prometheus counter, Redis-backed cooldown

### Observability (Phase C-4)
- **Correlation IDs** — X-Request-ID propagation across all services, injected into logs and error responses
- **OpenTelemetry** — configurable OTLP exporter, instruments FastAPI, SQLAlchemy, Redis, HTTPX
- **Request profiler** — per-request DB/Redis timing breakdown, slow-request logging at configurable threshold
- **Prometheus metrics** — HTTP request count/latency, business KPI gauges (users, courts, revenue, bookings), cache hit/miss counters, connection pool status, error budgets
- **Structured logging** — JSON-formatted to stdout and rotating file, request_id injection, health-check suppression
- **Grafana dashboards** — configurable via production compose, Prometheus datasource
- **SLO definitions** — availability (99.9%), latency P99 (500ms), error rate (1%)

### Pagination & Performance
- **Cursor-based pagination** — O(log n) B-tree seek pagination via `WHERE id > :cursor`, base64-encoded cursors, backward-compatible with existing list schemas
- **Redis caching** — time slot lists cached per court_id+date, graceful degradation on Redis failure
- **Connection pooling** — asyncpg pool with tuneable size/overflow/recycle/timeout, pool_pre_ping for stale connection detection
- **Database indexing** — full index coverage on all foreign keys, booking status/slot queries, log actions/timestamps, notification reads
- **Query timing** — slow query logging at 200ms threshold, profiler integration with Prometheus histograms

### Infrastructure
- **Docker Compose** — development (`compose.yml`: postgres + redis) and production (`compose.prod.yml`: postgres + redis + backend with healthchecks, PgBouncer/Caddy options commented)
- **Multi-stage Dockerfile** — Python 3.12-slim, non-root user, layer caching, graceful shutdown
- **CI/CD** — GitHub Actions: backend lint/tests on PR, Docker image build & push on tag
- **Environment validation** — strict startup check for SECRET_KEY length, CORS origins, DB/Redis config

### UI/UX
- **Persian-first** — RTL layout, IranYekanX font (10 weights), Jalali calendar, Persian digits throughout
- **Dark mode** — next-themes with view-transition theme spread animation
- **shadcn/ui** — 36 primitives from radix-nova, all RTL-adapted
- **Neshan Maps** — Qom-bounded, CartoDB tile fallback, sport-type color-coded markers
- **Responsive** — mobile-first design, dashboard sidebar with icon collapse
- **Animated hero** — SVG illustration with staggered entry animations

---

## Stack

| Layer        | Technology                                                       |
| ------------ | ---------------------------------------------------------------- |
| **Frontend** | Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui    |
| **Backend**  | Python 3.12 + FastAPI + SQLAlchemy 2.0 (async) + Alembic        |
| **Database** | PostgreSQL 17 + Redis 7                                          |
| **Auth**     | JWT (HS256) + bcrypt + refresh token rotation + session mgmt     |
| **Maps**     | Neshan Maps SDK (Qom-bounded, CartoDB fallback)                  |
| **Locale**   | Persian (fa-IR) — RTL layout, Jalali dates, Persian digits       |
| **Monitoring**| Prometheus + Grafana + OpenTelemetry + Sentry                   |
| **Container**| Docker Compose (multi-stage builds, healthchecks)                |
| **CI/CD**    | GitHub Actions (lint, test, build, publish)                      |

---

## Architecture

```
Client (Next.js)
    │
    ▼
API Route (api/v1/*.py) ─── Deps: Auth (4 levels)
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

**Background tasks** (asyncio, lifespan-managed):
- Metrics refresh — polls DB every 120s for business gauges
- Expired booking cleanup — cancels pending bookings past 10-min window every 60s

---

## Project Structure

```
├── frontend/               # Next.js 16 app
│   ├── app/                # App Router (RTL, Persian, dark-mode)
│   │   ├── (auth)/         # Login, register
│   │   ├── courts/         # Listing + detail
│   │   ├── book/           # Booking flow
│   │   └── dashboard/      # Admin/manager/user role dashboards
│   ├── components/         # UI components (36 shadcn primitives)
│   ├── hooks/              # Custom hooks
│   ├── lib/                # API client, utilities, map wrapper
│   └── tests/              # Vitest test suite
│
├── backend/                # FastAPI server
│   ├── app/
│   │   ├── api/v1/         # 18 routers
│   │   ├── core/           # 19 infrastructure modules
│   │   ├── models/         # 16 SQLAlchemy models
│   │   ├── schemas/        # 16 Pydantic v2 schemas
│   │   ├── services/       # 13 business logic services
│   │   └── repositories/   # 12 data access repos
│   ├── tests/              # Pytest integration tests (248 passing)
│   └── migrations/         # Alembic (17 versions)
│
├── docs/                   # Documentation, screenshots, diagrams
├── context/                # Project context for Claude Code
├── compose.yml             # Development Docker (postgres + redis)
├── compose.prod.yml        # Production Docker (full stack)
└── Makefile                # Developer workflow commands
```

---

## Quick Start

**Prerequisites:** Docker, Python 3.12, Node.js

```bash
make install          # Install all dependencies (Python + npm)
make db-start         # Start Postgres + Redis via Docker
make db-migrate       # Run Alembic migrations
make db-seed          # Seed with Persian test data
make dev-backend      # Backend on :8000
make dev-frontend     # Frontend on :3000
```

Run `make doctor` to verify your system setup.

---

## Documentation Index

| File                                       | Content                                    |
| ------------------------------------------ | ------------------------------------------ |
| [architect.md](context/architect.md)       | Architecture layers, data flow, stack      |
| [backend.md](context/backend.md)           | Models, services, auth deps, key decisions |
| [frontend.md](context/frontend.md)         | Pages, components, API client, maps        |
| [ui.md](context/ui.md)                     | Component structure, layout, theming       |
| [commands.md](context/commands.md)         | Full Makefile reference                    |
| [commit.md](context/commit.md)             | Conventional Commits type/scope rules      |
| [config.md](context/config.md)             | Code style, naming, env vars               |
| [memory.md](context/memory.md)             | Engineering memory & project history       |

---

## Testing

| Layer      | Framework | Count      |
| ---------- | --------- | ---------- |
| Backend    | pytest    | 248 tests  |
| Frontend   | vitest    | Component tests |

Run all tests: `make test`

---

## Production Readiness

- [x] Multi-stage Docker builds with non-root user
- [x] Production Docker Compose with healthchecks and secrets management
- [x] Environment validation at startup (SECRET_KEY, CORS, DB config)
- [x] Cursor-based pagination for scalable list endpoints
- [x] JWT with key rotation capability
- [x] Refresh token rotation and session management
- [x] OWASP security headers (CSP, HSTS, XFO, etc.)
- [x] File upload sanitization (MIME detection, SVG XSS stripping)
- [x] Rate limiting (Redis-backed with in-memory fallback)
- [x] Connection pooling with health checks and timeout
- [x] Structured JSON logging with correlation IDs
- [x] Prometheus metrics and Grafana dashboards
- [x] OpenTelemetry tracing (FastAPI, SQLAlchemy, Redis, HTTPX)
- [x] Slow query logging and request profiling
- [x] SLO definitions (availability 99.9%, latency P99 500ms)
- [x] CI/CD pipeline (lint, test, build, publish)
- [ ] Real payment gateway integration
- [ ] Real SMS provider integration
- [ ] TLS termination (Caddy config in compose.prod.yml commented)

---

## License

All Rights Reserved.

Copyright (c) 2026 ToopSet Team. See [LICENSE](LICENSE) for details.
