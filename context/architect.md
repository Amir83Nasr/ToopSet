# Architecture

```
Route (api/v1/*.py) → Service (services/*.py) → Repository (repositories/*.py) → Model (models/*.py)
```

## Layers

| Layer                  | Responsibility                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `api/v1/` (16 routers) | HTTP handlers, input validation, response marshalling                                            |
| `api/deps.py`          | 4 auth deps (optional, required, manager, admin)                                                 |
| `core/` (13 modules)   | Config, DB, Redis, JWT, timezone, date_utils, exceptions, upload, metrics, logging, rate-limiter |
| `services/` (10)       | Business logic                                                                                   |
| `repositories/` (11)   | Async SQLAlchemy queries                                                                         |
| `models/` (15)         | SQLAlchemy ORM models                                                                            |
| `schemas/` (14)        | Pydantic v2 request/response                                                                     |

## Data Flow

```
Client → API Route → [Deps: Auth] → Service → Repository → DB
                                            ↓
                                       Redis Cache
```

- **Auth:** JWT Bearer → `api/deps.py` (4 levels) → token version check for single-device
- **DB:** Auto commit/rollback via `get_db()` context manager
- **Cache:** Slot list cached per `court_id+date` in Redis, degrade gracefully on failure
- **Audit:** Every business action logged via `log_action()` → `logs` table
- **Time:** UTC storage, Asia/Tehran for user I/O, handled in `core/timezone.py`

## Business Rules

| Rule                      | Implementation                                                          |
| ------------------------- | ----------------------------------------------------------------------- |
| Manager = 1 court max     | Enforced in `CourtService.create_court()`                               |
| Double-booking prevention | Optimistic locking on `TimeSlot.version`                                |
| Payment window            | 10 minutes, background task cancels expired (`_cancel_expired_pending`) |
| Cancellation penalty      | <2h = impossible, 2-24h = 50%, >24h = 0% (refund to wallet)             |
| Payment mock              | Simulates success / fraud / timeout scenarios                           |
| Mock SMS                  | Prints code 123456 to console                                           |

## Background Tasks (lifespan)

1. **Metrics refresh** — every 120s polls DB for business gauges
2. **Expired booking cleanup** — every 60s cancels past-due pending bookings

## Stack

| Component  | Technology                                                   |
| ---------- | ------------------------------------------------------------ |
| Frontend   | Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui |
| Backend    | Python 3.12 + FastAPI + SQLAlchemy async                     |
| DB         | PostgreSQL 17 + Redis 7                                      |
| Maps       | Neshan Maps (@neshan-maps-platform/leaflet) — Qom-bounded    |
| Monitoring | Sentry + Prometheus + Grafana                                |
| Container  | Docker Compose (4 services)                                  |
