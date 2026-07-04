# Part 1 — High-Level Project Overview

## Purpose

**ToopSet (توپ‌سِت)** is an online sports court/venue booking platform targeting Qom, Iran. It lets end-users discover venues, book time slots with real-time availability, pay (simulated gateway), leave reviews, and manage wallets. Venue managers register venues and manage schedules. System admins oversee users, approve venues, handle settlements, and monitor the platform.

## Business Domain

- **Core entity:** A "Vendor" (sports venue) offering bookable "Time Slots"
- **Primary flow:** User discovers venue → selects slot → creates booking (10-min payment window) → pays → confirmed reservation
- **Secondary flows:** Cancellation with tiered penalties, manager-created walk-in bookings, settlement payouts to managers, OTP-based passwordless auth, wallet refunds
- **Market specifics:** Persian-first UX, Jalali calendar, Iranian mobile phone numbers (`09XXXXXXXXX`), gender-segregated sessions, Qom-bounded map

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        Frontend                           │
│   Next.js 16 (App Router) + React 19 + TypeScript        │
│   Tailwind v4 + shadcn/ui + Neshan Maps SDK              │
└──────────────────────┬───────────────────────────────────┘
                       │  REST API (JSON)
                       │  JWT Bearer tokens
┌──────────────────────▼───────────────────────────────────┐
│                        Backend                            │
│   FastAPI + SQLAlchemy 2.0 (async) + Pydantic v2         │
│   SlowAPI rate limiting + Prometheus metrics              │
└────────┬───────────────────────────────┬─────────────────┘
         │                               │
┌────────▼────────┐           ┌──────────▼──────────┐
│  PostgreSQL 17  │           │      Redis 7        │
│  (Primary data) │           │  (Cache, OTP, rate  │
│                 │           │   limiter, sessions) │
└─────────────────┘           └─────────────────────┘
```

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js (App Router) | 16.2.6 |
| UI Framework | React | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| Component Library | shadcn/ui (radix-nova) | Latest |
| Backend | FastAPI | Latest |
| ORM | SQLAlchemy 2.0 (async) | 2.x |
| Migrations | Alembic | Latest |
| Database | PostgreSQL | 17 |
| Cache/Sessions | Redis | 7 |
| Auth | JWT (HS256) + bcrypt + refresh token rotation | python-jose + passlib |
| Maps | Neshan Maps SDK (Leaflet-based) | — |
| Monitoring | Prometheus + Sentry + OpenTelemetry (optional) | — |
| Testing (Backend) | pytest + pytest-asyncio + httpx | ~248 tests |
| Testing (Frontend) | Vitest + Testing Library | ~47 tests |
| Container | Docker (multi-stage) + Docker Compose | — |
| CI/CD | GitHub Actions | — |
| Language (BE) | Python | 3.12 |
| Language (FE) | TypeScript (strict) | 5.9 |

## External Services

| Service | Usage | Status |
|---|---|---|
| Payment Gateway | Mock (simulates success/failure/timeout/fraud) | `PAYMENT_GATEWAY=mock` |
| SMS Provider | Mock (logs OTP codes, no real sending) | `SMS_PROVIDER=mock` |
| Neshan Maps | Real map tiles, Qom-bounded display | Active |
| CartoDB Tiles | Fallback when Neshan returns 204 errors | Active |
| Sentry | Error tracking (optional, needs DSN) | Optional |
| OpenTelemetry | Distributed tracing via OTLP (optional) | Optional |

## Deployment Assumptions

- **Development:** `compose.yml` provides PostgreSQL + Redis locally; backend runs via `uvicorn`, frontend via `next dev`
- **Production:** Multi-stage Dockerfile for backend (Python 3.12-slim, non-root user); standalone Next.js build; orchestrated via `compose.prod.yml` (commented PgBouncer/Caddy options)
- **CI:** GitHub Actions runs backend lint/tests on PR, Docker image build on tag

## Important Dependencies (Backend)

| Package | Purpose |
|---|---|
| `fastapi` | Web framework |
| `sqlalchemy[asyncio]` + `asyncpg` | Async PostgreSQL ORM |
| `alembic` | Schema migrations |
| `pydantic-settings` | Typed configuration from env |
| `python-jose[cryptography]` | JWT encode/decode |
| `passlib[bcrypt]` | Password hashing |
| `redis[hiredis]` | Async Redis client |
| `slowapi` | Rate limiting middleware |
| `prometheus-client` | Metrics exposition |
| `opentelemetry-*` | Distributed tracing (optional) |
| `sentry-sdk` | Error tracking (optional) |
| `jdatetime` | Jalali/Persian date conversion |
| `Pillow` | Image processing (upload validation) |

## Important Dependencies (Frontend)

| Package | Purpose |
|---|---|
| `next` | React meta-framework |
| `react-hook-form` + `zod` | Form state + schema validation |
| `@daypicker/persian` | Jalali calendar picker |
| `framer-motion` | Animations |
| `recharts` | Dashboard charts |
| `@sentry/nextjs` | Error tracking |
| `class-variance-authority` | Component variants |
| `tailwind-merge` | Class deduplication |
