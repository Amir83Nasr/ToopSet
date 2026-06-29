# Project Memory

> Chronological record of all major work completed on the ToopSet platform. Updated at the end of each phase.

---

## Current State

- **Version:** 0.4.0
- **Backend:** Python 3.12 + FastAPI + SQLAlchemy async + PostgreSQL 17 + Redis 7
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- **Tests:** 248 passing (all backend integration)
- **Migrations:** 17 Alembic versions
- **Production maturity:** Deployable via Docker Compose with monitoring stack

---

## Initial State

The original backend was a working FastAPI monolith with:
- Basic JWT auth with single-device token versioning
- 15 SQLAlchemy models covering users, courts, bookings, payments, reviews
- 10 services with business logic
- 11 repositories for data access
- Offset-based pagination
- Mock payment and SMS providers
- Redis for basic slot caching
- Sentry for error tracking
- Development-only Docker Compose (postgres + redis)
- Basic Makefile workflow

Key pain points addressed by subsequent phases:
- No transaction consistency guarantees
- No timestamp standardization (mixed aware/naive datetimes)
- Missing foreign key indexes causing N+1 queries
- ORM relationship issues (back_populates, collection types)
- Repository pattern inconsistencies
- No cursor pagination (offset-based performance decay)
- No Redis connection hardening (no pooling, timeouts, health checks)
- No cache optimization (missing TTLs, eviction policies)
- No connection pool hardening (no pool_pre_ping, timeouts, recycling)
- No production infrastructure (Docker Compose, CI/CD)
- No security hardening (password policy, rate limiting, upload sanitization)
- No enterprise auth (refresh token rotation, session management, key rotation)
- No observability (correlation IDs, tracing, profiling, metrics)

---

## Phase A — Foundation Hardening

Scope: Transaction consistency, timestamp standardization, database indexing, ORM cleanup, repository improvements.

### Transaction Consistency
- Wrapped all service methods with proper commit/rollback via `get_db()` context manager
- Fixed missing commits in booking and payment flows
- Ensured all `session.commit()` calls are paired with rollback on exception

### Timestamp Standardization
- Created `core/timezone.py` with helper functions (`now_utc()`, `now_iran()`, `utc_to_iran()`)
- Migrated all datetime columns to timezone-aware (Alembic migration 0009)
- Fixed seed data and test factories to use consistent UTC storage / Asia/Tehran display

### Database Indexing
- Added missing FK indexes on all foreign key columns (Alembic migration 0010)
- Added performance indexes on booking status/slot queries, log actions, notification reads (migration 0012)
- Analyzed common query patterns to cover index gaps

### ORM Relationship Cleanup
- Fixed `back_populates` on all bidirectional relationships
- Corrected relationship collection types
- Dropped legacy court_images column after migration to dedicated table (migration 0011)

### Repository Architecture
- Standardized method signatures across all 11 repositories
- Added `count_by_status()` and `count_today()` to `BookingRepo`
- Added `count_active()` to `CourtRepo`, `count_all()` to `UserRepo`

### Migrations
- 0009: `make_timestamps_timezone_aware`
- 0010: `add_missing_fk_indexes`
- 0011: `drop_legacy_court_images`
- 0012: `add_missing_performance_indexes`

---

## Stabilization Phase

Scope: Test isolation, dashboard optimization, ORM audit, performance cleanup.

### Transaction-Safe Test Isolation
- Fixed test fixtures to properly isolate transactions between tests
- Ensured each test runs in its own transaction with clean rollback
- Eliminated test pollution causing flaky failures

### Dashboard Query Optimization
- Optimized dashboard stats queries to use aggregate SQL instead of Python-side counting
- Reduced N+1 query patterns in admin and manager dashboard endpoints

### ORM Audit
- Comprehensive review of all 15 models for correct relationship definitions
- Verified all cascade behaviors are appropriate
- Fixed missing `uselist=False` on one-to-one relationships

### Performance Cleanup
- Removed dead code and unused query paths
- Consolidated duplicate query logic

---

## Phase B — Performance & Caching

Scope: Cursor pagination, Redis infrastructure, cache optimization, connection pool hardening, performance instrumentation.

### Cursor Pagination
- Created `core/pagination.py` with `CursorPage`, `encode_cursor()`, `decode_cursor()`
- Base64-encoded cursors with url-safe encoding
- O(log n) B-tree seek pagination via `WHERE id > :cursor`
- Backward-compatible with existing list response schemas

### Redis Infrastructure
- Hardened `redis_client.py` with connection pooling (50 max connections)
- Added socket timeouts (2s connect, 2s operation), keepalive, retry on timeout
- Health check interval (30s) for detecting stale connections
- Loop-aware singleton that reconnects on event loop changes (pytest compatibility)
- Proper teardown on shutdown

### Cache Optimization
- Added TTL-based cache eviction for slot lists
- Tracked cache hit/miss via Prometheus counters
- Graceful degradation on Redis failure (fall back to DB query)

### Connection Pool Hardening
- Configured asyncpg pool with `pool_pre_ping=True` for stale connection detection
- Set pool timeout (5s), recycle (1800s), size/max_overflow tuning via env vars
- Added pool status gauges in Prometheus metrics

### Performance Instrumentation
- Added SQLAlchemy query timing listener at 200ms slow-query threshold
- Database.py records execution start/end via `before_cursor_execute`/`after_cursor_execute`
- Slow queries logged with truncated SQL

---

## Phase C-1 — Production Infrastructure

Scope: Docker Compose production, GitHub Actions, deployment documentation.

### Docker Improvements
- Multi-stage Dockerfile for backend (builder + runtime, Python 3.12-slim)
- Non-root user (toopset, uid 1001)
- Layer caching for pip dependencies
- Graceful shutdown via uvicorn SIGTERM drain (30s timeout)
- Healthcheck with curl

### Docker Compose Production
- Created `compose.prod.yml` with postgres + redis + backend
- Healthchecks on all services with proper start periods and dependencies
- Secrets via env vars (required vars fail hard if unset)
- Optional PgBouncer connection pooler (commented)
- Optional Caddy reverse proxy with TLS (commented)
- Separate networks for service isolation
- Persistent volumes for DB data, Redis data, uploads, logs

### GitHub Actions
- `backend.yml`: PR workflow — ruff lint, mypy typecheck, pytest 248 tests
- `docker-release.yml`: Tag-push workflow — build multi-arch Docker image, publish to registry

### Documentation
- Created `DEPLOYMENT.md`, `OPERATIONS.md`, `PRODUCTION_CHECKLIST.md`, `PHASE_C1_REPORT.md`

---

## Phase C-2 — Security Hardening

Scope: Password policy, OTP rate limiting, upload sanitization, HTTP security headers, JWT improvements.

### Environment Validation
- Created `config.validate_env()` with strict startup checks
- SECRET_KEY minimum length (32 chars), rejects default values
- CORS_ORIGINS must not be `*` in production
- DB_POOL_SIZE minimum validation
- LOG_LEVEL validation
- Production-only: payment/SMS provider must not be `mock`

### Password Policy
- bcrypt hashing already in place, added minimum key length enforcement
- JWT clock skew handling (manual leeway validation)

### OTP Rate Limiting
- Created `services/otp_service.py` with code generation and validation
- Redis-backed rate limiting per phone number
- Lockout tracking via Prometheus counter (`toopset_otp_lockouts_total`)

### Upload Sanitization
- MIME type detection via magic bytes (JPEG, PNG, WebP)
- SVG XSS sanitization (strips script tags, event handlers, javascript: URLs)
- File extension whitelist (.jpg, .jpeg, .png, .webp, .svg)
- 5MB file size limit
- UUID-based filenames to prevent path traversal

### HTTP Security Headers
- Created `SecurityHeadersMiddleware` in `core/exceptions.py`
- CSP: `default-src 'none'`, permissive only for images, styles, fonts
- HSTS: `max-age=31536000; includeSubDomains`
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Permissions-Policy: disables geolocation, microphone, camera, payment
- Referrer-Policy: strict-origin-when-cross-origin
- Cache-Control: no-store for sensitive paths (auth, users/me, admin)

### JWT Improvements
- Manual claim validation (exp, iat, nbf) with configurable clock skew
- Token type claim enforcement (`type: access` vs `type: refresh`)
- KID header in JWT for key identification
- Add-only previous key support for rotation

---

## Phase C-3 — Enterprise Authentication

Scope: Refresh token rotation, session management, secrets management, key rotation architecture, security test suite.

### Refresh Token Rotation
- Created `models/refresh_token.py` with `token_hash`, `session_id`, `expires_at`, `is_revoked`
- Created `repositories/refresh_token_repo.py` for persistence
- On refresh: revoke old token (store hash), issue new pair
- Stolen token detection: if revoked token is reused, invalidate all sessions
- Configurable expiry and cleanup interval

### Session Management
- Session-bound refresh tokens via `sid` claim in JWT
- Token cleanup background job based on `session_cleanup_interval_days`
- Session tracking via Prometheus gauge (`toopset_active_sessions`)
- Token hashing via SHA-256 for stored refresh tokens

### Key Rotation Architecture
- `SECRET_KEY_PREVIOUS` env var for dual-key support
- Current key signs new tokens, both keys verify
- KID header (`v1` / `v0`) identifies signing key
- Zero-downtime rotation: set PREVIOUS, wait for all tokens issued under old key to expire, rotate primary

### Secrets Management
- Env validation ensures SECRET_KEY meets length requirements
- CORS validation prevents misconfigured production deployments
- All secrets passed via environment variables (no checked-in secrets)

### Security Test Suite
- Refresh token rotation test scenarios
- Stolen token detection test scenarios
- Token replay attack prevention tests
- Auth dependency edge case coverage

---

## Phase C-4 — Enterprise Observability

Scope: Correlation IDs, OpenTelemetry, request profiler, slow query metrics, Prometheus/Grafana stack, SLO definitions.

### Correlation IDs
- Created `core/correlation_id.py` with middleware and contextvar
- Reads incoming `X-Request-ID` header or generates UUID4
- Injects into `request.state`, `logging.Filter`, error responses
- Configurable header name and ID length via env vars

### OpenTelemetry
- Created `core/telemetry.py` with configurable OTLP exporter
- Instruments FastAPI/Starlette, SQLAlchemy, Redis, HTTPX
- Batch span processor with configurable queue and batch size
- Console exporter for development
- Configurable sample rate (default 10%)
- Idempotent setup guard

### Request Profiler
- Created `core/profiler.py` with contextvar-based profiling
- Per-request DB query count, cumulative DB duration
- Redis operation count and cumulative duration
- Slow request logging at configurable threshold (default 500ms)
- Prometheus histogram integration for all profiler metrics

### Prometheus Metrics
- HTTP request count, latency histograms (bucketed), in-progress gauge
- Business KPI gauges: total users, active courts, today's bookings, today's revenue
- Booking status breakdown gauge
- Booking success ratio, payment failure ratio
- Cache hit/miss counters, evictions, memory usage
- Request profiling histograms (duration, DB/Redis counts and durations)
- Connection pool gauges (checked in, checked out, overflow, total)
- Refresh token rotation counter, OTP lockout counter, upload counter
- Periodic business metrics refresh (every 120s via background task)

### Metrics Refresh Background Task
- Queries DB every 120s for business gauges
- Initial delay of 5s for pool warmup
- Graceful error handling (logs and continues)

### Grafana Integration
- Production compose file supports Grafana + Prometheus datasource
- Prometheus metrics endpoint at `/metrics`

### SLO Definitions
- Availability target: 99.9%
- Latency P99 target: 500ms
- Error rate target: 1.0%

### Logging Improvements
- Structured JSON logging with `python-json-logger`
- Dual output: stdout (Docker) + rotating file handler for Logstash/ELK
- Request ID injection in every log record
- Health-check log suppression (`/health` path excluded below WARNING)

---

## Architecture Summary

```
┌─────────────┐     ┌──────────────────────────────────────────────────┐
│   Client     │     │  Backend (FastAPI)                               │
│  (Next.js)   │     │                                                  │
└──────┬──────┘     │  Middleware Stack:                                │
       │            │   1. CORS                                         │
       │  HTTP      │   2. CorrelationId (X-Request-ID)                 │
       ▼            │   3. Profiler (DB/Redis timing)                   │
┌─────────────┐     │   4. SecurityHeaders (CSP, HSTS, ...)             │
│   API       │     │   5. Prometheus (HTTP metrics)                    │
│  (18 routes)│     │   6. SlowAPI (rate limiting)                      │
└──────┬──────┘     │                                                  │
       │            │  Layers: Route → Service → Repository → Model     │
       ▼            │                                                  │
┌─────────────┐     │  Background: metrics refresh (120s),             │
│   Auth      │     │               booking cleanup (60s)              │
│   (4-tier)  │     │                                                  │
└──────┬──────┘     │  Observability:                                   │
       │            │   - Prometheus /metrics endpoint                  │
       ▼            │   - OpenTelemetry OTLP export                    │
┌─────────────┐     │   - Structured JSON logs with request_id         │
│ PostgreSQL  │     │   - Sentry error tracking                        │
│  + Redis 7  │     └──────────────────────────────────────────────────┘
└─────────────┘
```

---

## Future Roadmap

The next planned development phase is **Phase D**, which will focus on expanding platform capabilities. Specific features have not yet been scoped or documented.
