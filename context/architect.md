# Architecture

```
Route (api/v1/*.py) → Service (services/*.py) → Repository (repositories/*.py) → Model (models/*.py)
```

## Layers

| Layer                  | Responsibility                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `api/v1/` (18 routers) | HTTP handlers, input validation, response marshalling                                  |
| `api/deps.py`          | 4 auth deps (optional, required, manager, admin)                                       |
| `core/` (19 modules)   | Config, DB, Redis, JWT, security, upload, metrics, logging, rate-limiter, telemetry, profiler, correlation_id, pagination |
| `services/` (13)       | Business logic, OTP, SMS provider abstraction                                          |
| `repositories/` (12)   | Async SQLAlchemy queries, refresh token persistence                                    |
| `models/` (16)         | SQLAlchemy ORM models, refresh_token model                                             |
| `schemas/` (16)        | Pydantic v2 request/response, session + manager schemas                                |

## Middleware Stack (applied in order)

1. `CORSMiddleware`
2. `CorrelationIdMiddleware` — X-Request-ID propagation
3. `ProfilerMiddleware` — per-request DB/Redis timing breakdown, slow-request logging
4. `SecurityHeadersMiddleware` — CSP, HSTS, XFO, X-Content-Type-Options, Permissions-Policy
5. `PrometheusMiddleware` — HTTP request count, latency histograms, error rates
6. `SlowAPIMiddleware` — Redis-backed rate limiting, in-memory fallback

## Data Flow

```
Client → API Route → [Deps: Auth] → Service → Repository → DB
                                            ↓
                                       Redis Cache
```

- **Auth:** JWT Bearer → `api/deps.py` (4 levels) → token version check (single-device) + refresh token rotation
- **DB:** Auto commit/rollback via `get_db()` context manager, slow query logging at 200ms
- **Cache:** Slot list cached per `court_id+date` in Redis, degrade gracefully on failure
- **Audit:** Every business action logged via `log_action()` → `logs` table
- **Time:** UTC storage, Asia/Tehran for user I/O, handled in `core/timezone.py`
- **Tracing:** OpenTelemetry OTLP export (FastAPI, SQLAlchemy, Redis, HTTPX), configurable sample rate
- **Metrics:** Prometheus exposition at `/metrics`, periodic business gauge refresh, connection pool stats

## Business Rules

| Rule                      | Implementation                                                          |
| ------------------------- | ----------------------------------------------------------------------- |
| Manager = 1 court max     | Enforced in `CourtService.create_court()`                               |
| Double-booking prevention | Optimistic locking on `TimeSlot.version`                                |
| Payment window            | 10 minutes, background task cancels expired (`_cancel_expired_pending`) |
| Cancellation penalty      | <2h = impossible, 2-24h = 50%, >24h = 0% (refund to wallet)             |
| Payment mock              | Simulates success / fraud / timeout scenarios                           |
| Mock SMS                  | Prints code 123456 to console (pluggable provider interface)            |
| OTP rate limit            | 3/min registration, 5/min login, Redis duration tracking, lockout on abuse |

## Background Tasks (lifespan)

1. **Metrics refresh** — every 120s polls DB for business gauges (users, courts, revenue, bookings)
2. **Expired booking cleanup** — every 60s cancels past-due pending bookings (10-min window)

## Environment Validation

Strict startup checks in `config.validate_env()`:
- `SECRET_KEY` minimum length (32 chars), must not be default
- `CORS_ORIGINS` must not be `*` in production
- `DB_POOL_SIZE` minimum (5), recommended minimum (10)
- `LOG_LEVEL` must be a valid value
- Production-only: `PAYMENT_GATEWAY` and `SMS_PROVIDER` must not be `mock`

## Stack

| Component    | Technology                                                               |
| ------------ | ------------------------------------------------------------------------ |
| Frontend     | Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui             |
| Backend      | Python 3.12 + FastAPI + SQLAlchemy async                                 |
| DB           | PostgreSQL 17 + Redis 7                                                  |
| Auth         | JWT HS256 + bcrypt + refresh token rotation + session management         |
| Maps         | Neshan Maps (@neshan-maps-platform/leaflet) — Qom-bounded, CartoDB fallback |
| Observability| OpenTelemetry + Prometheus + Grafana + Sentry + structured JSON logging  |
| Container    | Docker Compose (dev: 2 services, prod: 3 services)                       |
| CI/CD        | GitHub Actions (lint, test, build, publish)                              |
