# Part 2 — Backend Deep Dive

## Architecture

### Folder Structure

```
backend/
├── app/
│   ├── __init__.py          # __version__ = "0.4.0"
│   ├── main.py              # FastAPI app factory, lifespan, middleware, routers
│   ├── api/
│   │   ├── deps.py          # Dependency injection (auth, DB session)
│   │   ├── openapi_docs.py  # Custom OpenAPI schema enrichment
│   │   └── v1/              # All route handlers (one file per domain)
│   │       ├── auth.py, admin.py, bookings.py, contact.py, dashboard.py
│   │       ├── favorites.py, manager.py, notifications.py, payments.py
│   │       ├── penalties.py, reviews.py, settings.py, time_slots.py
│   │       ├── uploads.py, users.py, vendors.py, wallet.py
│   ├── core/                # Cross-cutting infrastructure
│   │   ├── config.py        # Pydantic Settings + env validation
│   │   ├── database.py      # SQLAlchemy engine, session factory, query timing
│   │   ├── security.py      # JWT creation/decode, password hashing, key rotation
│   │   ├── rate_limiter.py  # SlowAPI Limiter (Redis or in-memory fallback)
│   │   ├── redis_client.py  # Async Redis connection pool
│   │   ├── exceptions.py    # Global exception handlers + SecurityHeadersMiddleware
│   │   ├── pagination.py    # Cursor-based pagination helpers
│   │   ├── correlation_id.py # X-Request-ID middleware + ContextVar
│   │   ├── profiler.py      # Per-request DB/Redis timing middleware
│   │   ├── metrics.py       # Prometheus counters/gauges/histograms + middleware
│   │   ├── health.py        # /health endpoint logic (DB + Redis probes)
│   │   ├── upload.py        # File upload validation (magic bytes, size, extension)
│   │   ├── card_security.py # Bank card encryption/masking
│   │   ├── phone.py         # Iranian phone normalization + validation
│   │   ├── timezone.py      # Iran TZ (Asia/Tehran) UTC conversion helpers
│   │   ├── date_utils.py    # Jalali date parsing for filters
│   │   ├── logger.py        # Structured audit log helper (log_action)
│   │   ├── logging_config.py # JSON formatter, rotating file, stdout
│   │   └── telemetry.py     # OpenTelemetry setup (optional)
│   ├── models/              # SQLAlchemy ORM models (20 models)
│   ├── repositories/        # Data access layer (one repo per aggregate)
│   ├── schemas/             # Pydantic request/response models
│   └── services/            # Business logic layer
├── migrations/              # Alembic migration scripts (22 migrations)
├── tests/                   # pytest-asyncio test suite (25 test files)
├── scripts/                 # Admin utilities (seed, create_admin, etc.)
├── Dockerfile               # Multi-stage production build
├── pyproject.toml           # Ruff, mypy, pytest config
└── requirements.txt         # Pinned dependencies
```

### Layer Separation

The backend follows a strict **3-layer architecture**:

```
┌─────────────────────────────────────┐
│  API Layer (app/api/v1/*.py)        │  ← HTTP concerns, request parsing, auth
├─────────────────────────────────────┤
│  Service Layer (app/services/*.py)  │  ← Business rules, orchestration
├─────────────────────────────────────┤
│  Repository Layer (app/repositories/*.py) │ ← Data access, queries
├─────────────────────────────────────┤
│  Model Layer (app/models/*.py)      │  ← ORM entities, relationships
└─────────────────────────────────────┘
```

- **API Layer:** Receives HTTP requests, validates input via Pydantic schemas, resolves auth via DI, delegates to services, serializes responses.
- **Service Layer:** Contains all business logic (booking rules, cancellation tiers, payment processing). Composes multiple repositories. Never touches HTTP request/response objects directly (except raising `HTTPException` for error signaling — a pragmatic choice, not textbook-clean).
- **Repository Layer:** Thin data-access wrappers around SQLAlchemy queries. Handles filtering, pagination, eager-loading strategies. No business logic.
- **Model Layer:** Pure SQLAlchemy declarative models. Defines tables, columns, relationships, constraints.

### Dependency Injection

FastAPI's `Depends()` system is used for:

1. **Database session** — `get_db()` in `core/database.py` yields an `AsyncSession`, auto-commits on success, rolls back on exception
2. **Current user** — `get_current_user()` in `api/deps.py` extracts JWT from `Authorization: Bearer` header, decodes, fetches user from DB
3. **Role guards** — `get_current_manager()` and `get_current_admin()` compose on `get_current_user` and check `user.role`

### Startup Lifecycle

The FastAPI app uses an async context manager lifespan:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Setup structured logging
    setup_logging()

    # 2. Validate environment (fails hard in production, warns in dev)
    validate_env(settings)

    # 3. Optional: OpenTelemetry instrumentation
    if settings.otel_enabled:
        setup_opentelemetry()

    # 4. Optional: Sentry error tracking
    if settings.sentry_dsn:
        sentry_sdk.init(...)

    # 5. Start background tasks
    metrics_task = asyncio.create_task(_refresh_metrics_periodically())  # every 120s
    cancel_task = asyncio.create_task(_cancel_expired_pending())          # every 60s

    yield  # App serves requests

    # Shutdown
    metrics_task.cancel()
    cancel_task.cancel()
    await close_redis()
    await engine.dispose()
```

### Middleware Stack (Order)

Middleware executes in **reverse registration order** for requests (last registered = first to process):

```python
app.add_middleware(CORSMiddleware, ...)          # 1st registered, last to wrap request
app.add_middleware(CorrelationIdMiddleware)       # 2nd - assigns X-Request-ID
app.add_middleware(ProfilerMiddleware)            # 3rd - times DB/Redis per request
app.add_middleware(SecurityHeadersMiddleware)     # 4th - adds security headers to response
app.add_middleware(PrometheusMiddleware)          # 5th - records request count/latency
app.add_middleware(SlowAPIMiddleware)             # 6th registered, first to wrap request - rate limiting
```

### Routing Structure

All API routes are prefixed with `/api/v1`. Special routes:
- `GET /` — redirects to `/docs` (Swagger UI)
- `GET /health` — structured health check (DB + Redis probes)
- `GET /metrics` — Prometheus text exposition

---

## Request Lifecycle

### Trace: `POST /api/v1/bookings` (Create Booking)

```
HTTP Request
  │
  ▼
SlowAPIMiddleware ─── checks rate limit (Redis/memory)
  │
  ▼
PrometheusMiddleware ─── starts timer, increments in_progress gauge
  │
  ▼
SecurityHeadersMiddleware ─── (response-phase: adds security headers)
  │
  ▼
ProfilerMiddleware ─── initializes per-request profiler ContextVar
  │
  ▼
CorrelationIdMiddleware ─── reads/generates X-Request-ID, sets ContextVar
  │
  ▼
CORSMiddleware ─── handles preflight, adds CORS headers
  │
  ▼
FastAPI Router ─── matches POST /api/v1/bookings
  │
  ▼
Dependency: HTTPBearer ─── extracts token from Authorization header
  │
  ▼
Dependency: get_current_user()
  ├── decode_token(credentials, expected_type="access")
  │   ├── Tries current key (kid="v1"), then previous key (kid="v0")
  │   ├── Validates iss, aud, exp (with clock_skew leeway)
  │   └── Returns payload dict or None
  ├── Extracts user_id from payload["sub"]
  ├── UserRepository.get_by_id(user_id)
  ├── Checks user.is_active
  ├── Checks payload["ver"] == user.token_version (single-device enforcement)
  └── Returns User ORM object
  │
  ▼
Dependency: get_db() ─── yields AsyncSession from pool
  │
  ▼
Route Handler (bookings.py)
  │
  ▼
Pydantic Validation ─── BookingCreate schema validates request body
  │
  ▼
BookingService.create_booking(data)
  ├── TimeSlotRepo.get_by_id(slot_id, for_update=True)  ← SELECT FOR UPDATE
  ├── Validates: vendor active, slot not closed/blocked, not in past,
  │   within 14-day window, ball availability, capacity, version match
  ├── BookingRepo.get_active_by_slot() ← checks existing active booking
  ├── Calculates price (slot_price + ball_price)
  ├── BookingRepo.create({...status=PENDING_PAYMENT, expires_at=now+10min})
  ├── TimeSlotRepo.update(slot, {status=RESERVING, is_reserved=True})
  ├── NotificationRepo.create() ← notify manager
  └── log_action() ← audit log
  │
  ▼
Response Serialization ─── BookingDetailResponse (Pydantic model)
  │
  ▼
HTTP Response (201 Created)
```

---

## Authentication

### JWT Implementation

**Algorithm:** HS256 (symmetric)
**Library:** `python-jose`
**Token Types:** `access`, `refresh`, `password_reset`

#### Access Token Claims

```json
{
  "sub": "42",           // user ID as string
  "role": "user",        // user/manager/admin
  "ver": 3,             // token_version for invalidation
  "iat": 1719000000,    // issued at
  "nbf": 1719000000,    // not before
  "exp": 1719001800,    // expires (30 min default)
  "jti": "abc123...",   // unique token ID
  "iss": "toopset-api", // issuer
  "aud": "toopset-client", // audience
  "type": "access"      // token type discriminator
}
```

#### Refresh Token Additional Claims

```json
{
  "sid": "session-uuid",  // session ID for per-device revocation
  // ... all standard claims above with type="refresh", 7-day expiry
}
```

#### Key Rotation

- Current signing key: `settings.secret_key` (kid="v1")
- Previous key: `settings.secret_key_previous` (kid="v0")
- `decode_token()` tries both keys in order — allows seamless rotation
- All new tokens signed with current key + `kid` header

#### Token Version (Single-Device)

- `User.token_version` increments on: login, password change, admin force-logout
- Access tokens embed `ver` at issuance
- On every request, `get_current_user()` checks `token["ver"] == user.token_version`
- Mismatch → 401 "session ended — logged in from another device"

#### Refresh Token Rotation

1. Client sends refresh token to `POST /api/v1/auth/refresh`
2. Server hashes token (SHA-256), looks up in `refresh_tokens` table
3. If token not found or already revoked:
   - If revoked → **replay attack detected** → revoke entire session chain
   - Raise 401
4. If valid: revoke old token, issue new pair, persist new refresh token hash
5. Old token's `replaced_by` field points to new hash (chain tracing)

#### Password Hashing

- **Algorithm:** bcrypt via `passlib.CryptContext`
- **Placeholder:** OTP-registered users get `password_hash = "__otp_user__"` (can't password-login until they set one)

### Dependency Injection Auth Chain

```python
# Public endpoints — no auth required
@router.get("/vendors")
async def list_vendors(): ...

# Optional auth — user info available but not required
@router.get("/vendors/{id}")
async def get_vendor(user: User | None = Depends(get_current_user_optional)): ...

# Required auth — 401 if not authenticated
@router.get("/bookings")
async def list_bookings(user: User = Depends(get_current_user)): ...

# Manager-gated — 403 if role not manager/admin
@router.post("/vendors")
async def create_vendor(user: User = Depends(get_current_manager)): ...

# Admin-gated — 403 if role not admin
@router.get("/admin/users")
async def list_users(user: User = Depends(get_current_admin)): ...
```

---

## Business Logic

### Booking Service (`services/booking_service.py`)

The most complex service. Key operations:

#### Create Booking
- Validates slot availability (FOR UPDATE lock)
- Checks optimistic locking via `slot.version == data.version`
- Supports "replacement booking" — if slot is in `PENDING_CANCELLATION`, a new user can book it (tracked via `replaces_booking_id`)
- Sets 10-minute payment window (`expires_at`)
- Slot transitions: `OPEN` → `RESERVING`

#### Pay Booking
- Validates booking still in `PENDING_PAYMENT` and not expired
- Calls `PaymentService.process_payment()` (mock gateway)
- On success: records payment, transitions booking to `CONFIRMED`, slot to `RESERVED`
- On replacement: calculates 10% penalty on old booking, creates refund record, transitions old booking to `TRANSFERRED`
- Handles 4 failure modes: generic decline, timeout, insufficient funds, fraud

#### Cancel Booking (Tiered Policy)
| Time Until Slot Start | Action |
|---|---|
| Slot already started | **Blocked** — cannot cancel |
| Pending payment (unpaid) | Immediate cancel, no penalty, slot released |
| ≤ 48 hours | Booking → `PENDING_CANCELLATION`, slot → `PENDING_CANCELLATION` (awaits replacement buyer) |
| > 48 hours | Immediate cancel, **10% penalty**, 90% refund to wallet |

Requirements: user must accept cancellation terms; must have verified bank card for confirmed bookings.

### Payment Service (`services/payment_service.py`)

A **mock** gateway simulator:
- Configurable success rate (default 75%)
- Simulates network latency (0.3–1.2s)
- Failure distribution: 50% generic decline, 25% timeout, 15% insufficient funds, 10% fraud
- Returns realistic Persian bank names, masked card numbers, ref IDs

### OTP Service (`services/otp_service.py`)

- 6-digit cryptographically random code via `secrets.randbelow`
- Stored in Redis with 90-second TTL
- Per-phone send cooldown: 90 seconds between sends
- Failed-attempt lockout: 5 failures per active code → locked until new code requested
- On verify: creates user if new (with placeholder password hash), or logs in existing user

### Finance Service (`services/finance_service.py`)

Handles manager operations:
- **Manager bookings:** walk-in/manual bookings created by managers (no payment, instant CONFIRMED)
- **Recurring bookings:** bulk-create bookings across a date range for specific weekdays
- **Refund records:** immutable financial snapshots preserving all amounts at refund time
- **Slot cancellations:** manager cancels a slot, triggers refund flow for affected customer

### Cache Service (`services/cache_service.py`)

| Cache Type | Key Pattern | TTL | Purpose |
|---|---|---|---|
| Slot list | `slots:{vendor_id}:{date}` | 30s ± 20% jitter | Time slot availability (high churn) |
| Admin list | `admin_list:{prefix}:{md5}` | 60s ± 20% jitter | Admin dashboard queries |
| Response | `resp:{prefix}:{md5}` | 60s ± 20% jitter | General cached responses |

All cache operations are wrapped in `try/except RedisError` — graceful degradation to DB on Redis failure. TTL jitter prevents cache stampede.

---

## Rate Limiting

| Endpoint | Limit |
|---|---|
| `POST /api/v1/auth/register` | 3/minute |
| `POST /api/v1/auth/login` | 5/minute |
| `POST /api/v1/auth/refresh` | 10/minute |
| OTP send | 1 per 90 seconds per phone (Redis-based custom) |
| OTP verify failures | 5 attempts per active code |

Implementation: SlowAPI library with Redis storage (`fixed-window` strategy). Falls back to in-memory if Redis unreachable at startup.

---

## Pagination

**Cursor-based** using base64-encoded item IDs:

```python
# Encoding: base64(str(last_item.id))
cursor = encode_cursor(items[-1].id)  # e.g. "NDI=" for id=42

# Decoding: base64_decode → string → int
after_id = int(decode_cursor(cursor))  # 42

# Query: WHERE id > :cursor ORDER BY id LIMIT :limit+1
# If len(results) > limit → there's a next page
```

Response schema:
```json
{
  "items": [...],
  "total": 157,
  "next_cursor": "NDI="  // null if last page
}
```

---

## Error Handling

### Exception Hierarchy

| Exception | HTTP Status | Error Code |
|---|---|---|
| `HTTPException` | varies | mapped from status |
| `RequestValidationError` | 422 | `validation_error` |
| `IntegrityError` | 409 | `duplicate` |
| `StatementError` | 500 | `database_error` |
| `RateLimitExceeded` | 429 | — |
| Any unhandled `Exception` | 500 | `internal_error` |

### Error Response Format

```json
{
  "detail": "Persian error message",
  "error_code": "validation_error",
  "timestamp": "2026-07-04T12:00:00Z",
  "path": "/api/v1/bookings",
  "request_id": "abc123...",
  "fields": [
    {"field": "phone", "message": "شماره تلفن: این فیلد اجباری است"}
  ]
}
```

All validation messages are translated to Persian. Field names are also translated via a static lookup table.

---

## File Upload Security (`core/upload.py`)

1. **Extension validation:** only `.jpg`, `.jpeg`, `.png`, `.webp` allowed
2. **Magic byte detection:** reads first 4-12 bytes to verify MIME matches extension
   - JPEG: `FF D8 FF`
   - PNG: `89 50 4E 47`
   - WebP: `52 49 46 46` + `WEBP` at offset 8
3. **Size limit:** 5 MB maximum
4. **Storage:** files saved with UUID filenames to `uploads/{subdir}/`, served via FastAPI `StaticFiles`
5. **Deletion:** `delete_upload()` safely removes files, handles both relative and absolute URL paths

---

## Security Headers (`SecurityHeadersMiddleware`)

Every response includes:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'none'; ...` (strict for API, relaxed for /docs)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()`
- `Cache-Control: no-store, max-age=0` (on auth/admin paths)

---

## Observability

### Prometheus Metrics

| Metric | Type | Labels | Purpose |
|---|---|---|---|
| `http_requests_total` | Counter | method, path, status | Request count |
| `http_request_duration_seconds` | Histogram | method, path | Latency |
| `http_errors_total` | Counter | status | Error rate |
| `http_requests_in_progress` | Gauge | — | Concurrency |
| `toopset_cache_hits_total` | Counter | — | Redis cache hits |
| `toopset_cache_misses_total` | Counter | — | Redis cache misses |
| `toopset_db_users_total` | Gauge | — | Total registered users |
| `toopset_active_vendors_total` | Gauge | — | Active venues |
| `toopset_today_bookings_total` | Gauge | — | Today's bookings |
| `toopset_today_revenue_toman` | Gauge | — | Today's revenue |
| `toopset_bookings_by_status` | Gauge | status | Per-status counts |
| `toopset_otp_lockouts_total` | Counter | — | OTP lockout events |
| `toopset_db_pool_size` | Gauge | state | Connection pool status |

Business metrics refresh every 120 seconds via background task.

### Correlation IDs

- `CorrelationIdMiddleware` reads `X-Request-ID` from incoming request or generates UUID4
- Stored in `contextvars.ContextVar` — accessible from any async code
- Injected into: structured logs, error responses, audit log entries
- Returned in response header

### Request Profiler

When enabled (`PROFILER_ENABLED=true`):
- Tracks per-request: total duration, DB query count, DB cumulative ms, Redis op count, Redis cumulative ms
- Logs warning for requests exceeding `PROFILER_SLOW_REQUEST_THRESHOLD_MS` (default 500ms)
- Feeds data into Prometheus histograms

---

## Testing

### Structure

- **25 test files** covering all API endpoints + business logic
- **Async tests** using `pytest-asyncio` + `httpx.AsyncClient`
- **Transactional isolation:** each test runs in a DB transaction that's rolled back after

### Key Fixtures (`conftest.py`)

| Fixture | Purpose |
|---|---|
| `setup_database` | Session-scoped: creates all tables before tests, drops after |
| `session` | Per-test: transactional `AsyncSession`, rolled back after each test |
| `client` | Per-test: `httpx.AsyncClient` with DB override |
| `user_token` | Registers user (phone `09120000000`), returns `{access_token, user}` |
| `manager_token` | Registers + promotes to manager (phone `09120000001`) |
| `admin_token` | Registers + promotes to admin (phone `09120000002`) |

### Test Configuration

- Rate limiting **disabled** for tests (`limiter.enabled = False`)
- PrometheusMiddleware **removed** (avoids TaskGroup lifecycle conflicts)
- `NullPool` used (no connection reuse between tests)
- Separate test database: `toopset_test`
