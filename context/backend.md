# Backend

**Stack:** Python 3.12 + FastAPI + SQLAlchemy 2.0 async + Alembic + PostgreSQL 17 + Redis 7

## Directory

```
backend/
├── app/
│   ├── api/v1/       # 18 routers
│   ├── core/         # 19 infrastructure modules
│   ├── models/       # 16 SQLAlchemy models
│   ├── schemas/      # 16 Pydantic v2 schemas
│   ├── services/     # 13 business logic services
│   └── repositories/ # 12 data access repos
├── scripts/          # Seed, migration helpers
├── tests/            # pytest integration tests (248 passing)
└── migrations/       # Alembic (17 versions)
```

## Core Modules (19)

| Module              | Responsibility                                                       |
| ------------------- | -------------------------------------------------------------------- |
| `config.py`         | Pydantic settings, env validation, SLO config                        |
| `database.py`       | Async engine, connection pool, slow query logging at 200ms           |
| `redis_client.py`   | Redis singleton with connection pool, health checks, loop isolation  |
| `security.py`       | JWT create/decode, key rotation, bcrypt hashing, token hashing       |
| `exceptions.py`     | Global exception handlers, SecurityHeadersMiddleware, Persian errors |
| `rate_limiter.py`   | Redis-backed rate limiter, in-memory fallback on Redis failure       |
| `upload.py`         | File upload validation, MIME detection, SVG XSS sanitization         |
| `pagination.py`     | Cursor-based pagination (base64-encoded, O(log n) per page)          |
| `timezone.py`       | UTC storage, Asia/Tehran I/O, helper functions                       |
| `date_utils.py`     | Date range generation, Persian weekday mapping                       |
| `health.py`         | Health check endpoint (`GET /health`)                                |
| `logger.py`         | Logger setup helper                                                  |
| `logging_config.py` | Structured JSON logging (stdout + rotating file), request_id filter  |
| `metrics.py`        | Prometheus metrics: HTTP, business KPI, cache, pool, profiling       |
| `telemetry.py`      | OpenTelemetry setup: OTLP export, FastAPI/SQLAlchemy/Redis/HTTPX     |
| `correlation_id.py` | Correlation ID middleware, contextvar propagation                    |
| `profiler.py`       | Request profiling middleware, DB/Redis timing breakdown              |
| `ratelimit-middleware` | (via slowapi + MiddlewareStack)                                    |

## Database Models (16)

| Entity            | Table               | Key Fields                                                                             |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------- |
| User              | users               | phone (unique), role (user/manager/admin), token_version, avatar_url                   |
| Court             | courts              | manager_id→User, sport_types (ARRAY), lat/lng, amenities (JSON), is_active, avg_rating |
| CourtImage        | court_images        | court_id→Court, url, order                                                             |
| TimeSlot          | time_slots          | court_id→Court, start_time/end_time, base_price, is_reserved, **version**              |
| Booking           | bookings            | user_id→User, slot_id→TimeSlot (unique), status, price_paid, expires_at                |
| Payment           | payments            | booking_id→Booking (unique), amount, gateway fields, status                            |
| Wallet            | wallets             | user_id→User (unique), balance                                                         |
| WalletTransaction | wallet_transactions | wallet_id→Wallet, amount, type, description                                            |
| Review            | reviews             | user_id→User, court_id→Court, booking_id (unique), rating, comment                     |
| Penalty           | penalties           | user_id→User, booking_id→Booking, amount, reason                                       |
| Favorite          | favorites           | user_id+→User, court_id→Court (unique together)                                        |
| Notification      | notifications       | user_id→User, type, message, is_read                                                   |
| ContactMessage    | contact_messages    | name, email, phone, subject, message                                                   |
| Setting           | settings            | key (unique), value, description                                                       |
| Log               | logs                | user_id→User (nullable), action, details, request_id                                   |
| RefreshToken      | refresh_tokens      | user_id→User, token_hash, session_id, expires_at, is_revoked                           |

## Key Relationships

- User (1) → Court (N), Booking (N), Review (N), Wallet (1), RefreshToken (N)
- Court (1) → TimeSlot (N), Review (N), CourtImage (N) — cascade delete
- TimeSlot (1) ↔ Booking (1) — unique slot_id
- Booking (1) ↔ Payment (1), Review (1) — unique FKs
- User (N) ↔ RefreshToken (N) — session-bound tokens, cleaned periodically

## Services (13)

| Service          | File                   | Key Methods                                                      |
| ---------------- | ---------------------- | ---------------------------------------------------------------- |
| AuthService      | `auth_service.py`      | register, login, refresh_token, update_profile                   |
| UserService      | `user_service.py`      | list_users, get_user, update_user, toggle_active, delete_user    |
| CourtService     | `court_service.py`     | list_courts, get/create/update/delete, toggle_active             |
| TimeSlotService  | `time_slot_service.py` | list_slots, create/update/delete, generate_slots (bulk)          |
| BookingService   | `booking_service.py`   | list_my_bookings, create_booking, pay_booking, cancel_booking    |
| PaymentService   | `payment_service.py`   | process_payment (mock success/fraud/timeout)                     |
| ReviewService    | `review_service.py`    | submit, respond, list, report                                    |
| CacheService     | `cache_service.py`     | slot list cache (per court_id+date)                              |
| DashboardService | `dashboard_service.py` | user/admin/manager stats                                         |
| FavoriteService  | `favorite_service.py`  | toggle, list, check                                              |
| OTPService       | `otp_service.py`       | OTP code generation, validation, rate-limit tracking             |
| SMSProvider      | `sms_provider.py`      | SMS provider abstraction (mock impl, interface for real gateway) |
| TokenService     | (in auth_service)      | Refresh token rotation, session management                       |

## Auth Deps (`api/deps.py`)

1. `get_current_user_optional` → User | None
2. `get_current_user` → User (401 if no token)
3. `get_current_manager` → User (403 if user role)
4. `get_current_admin` → User (403 if not admin)

All validate JWT → active check → token version (single-device enforcement).

## Auth Endpoints

| Prefix              | Rate Limit | Notes                                     |
| ------------------- | ---------- | ----------------------------------------- |
| `/auth/register`    | 3/min      | OTP via SMS provider (mock: prints code)  |
| `/auth/login`       | 5/min      | Bumps `token_version`, issues refresh     |
| `/auth/refresh`     | —          | Refresh token rotation, expires old       |
| `/auth/me`          | —          | Current user profile                      |
| `/auth/update-profile` | —       | Password change, avatar upload            |

## Key Design Decisions

- **Optimistic concurrency:** `TimeSlot.version` incremented on update; booking requires matching version
- **Token version:** `User.token_version` bumped on login → invalidates prior sessions
- **Refresh token rotation:** On refresh, the previous refresh token is revoked (hash stored in `refresh_tokens`), a new pair is issued; stolen token reuse triggers automatic session invalidation
- **Key rotation:** Dual-key support (`SECRET_KEY` + `SECRET_KEY_PREVIOUS`) for zero-downtime key rotation
- **Cancellation penalties:** 2h cutoff (impossible), 2-24h (50% penalty), 24h+ (free → refund)
- **Payment mock:** `PaymentService.process_payment()` simulates success/fraud/timeout
- **Wallet:** Only refunds, no direct deposit/charge endpoint yet
- **Image upload:** Magic byte MIME validation, SVG XSS sanitization, 5MB limit, UUID filenames
- **Weekday mapping:** Persian (شنبه=0…جمعه=6) → Python (Mon=0…Sun=6): `[5,6,0,1,2,3,4]`
- **Timezone:** UTC storage, Asia/Tehran for user I/O, `core/timezone.py`
- **Cache degrade:** Redis failure → fall back to DB; slot list cached per court_id+date
- **CORS validation:** Warns if `*` used in production; configurable via env var
- **Slow query threshold:** 200ms, logged with truncated SQL + request_id
- **Correlation ID:** X-Request-ID header passthrough, UUID4 generation, propagated to logs + Sentry + error responses
- **Rate limiter:** Redis-backed (fixed-window), graceful fallback to in-memory on Redis outage, Persian 429 response

## Known Technical Debt

- `CourtService.list_courts()` — duplicate count query vs main query
- `BookingService.list_my_bookings()` / `list_completed_bookings()` — identical response loops
- Payment gateway is mock only
- SMS provider is mock only
- No real TLS termination (Caddy config in compose.prod.yml commented out)
- N+1 query in booking service (1 + N for slot queries)
