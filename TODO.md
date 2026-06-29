# TODO

Updated: 2026-06-29

---

## Milestones

| Phase | Status |
| ----- | ------ |
| ✅ Phase A — Foundation Hardening | Complete |
| ✅ Stabilization — Test Isolation & Cleanup | Complete |
| ✅ Phase B — Performance & Caching | Complete |
| ✅ Phase C-1 — Production Infrastructure | Complete |
| ✅ Phase C-2 — Security Hardening | Complete |
| ✅ Phase C-3 — Enterprise Authentication | Complete |
| ✅ Phase C-4 — Enterprise Observability | Complete |
| ⬜ Phase D — Upcoming | Not started |
| ⬜ Phase E | Not started |
| ⬜ Phase F | Not started |

---

## In Progress 🚧

No active implementation phase. Phase C-4 (Enterprise Observability) completed on 2026-06-29.

---

## Done ✅

### Phase A — Foundation Hardening
- [x] **Transaction Consistency** — Wrapped all service methods with proper commit/rollback; fixed missing commits in booking and payment flows
- [x] **TIMESTAMPTZ Migration** — Migrated all datetime columns to timezone-aware (Alembic 0009); created timezone.py helpers
- [x] **Database Indexing** — Added missing FK indexes (Alembic 0010); performance indexes on booking/log/notification queries (Alembic 0012)
- [x] **ORM Relationship Cleanup** — Fixed back_populates on all bidirectional relationships; corrected collection types; dropped legacy court_images column (Alembic 0011)
- [x] **Repository Architecture** — Standardized method signatures across all repositories; added count helpers

### Stabilization Phase
- [x] **Transaction-Safe Test Isolation** — Fixed fixtures to properly isolate transactions; eliminated flaky failures
- [x] **Dashboard Query Optimization** — Optimized stats queries to use aggregate SQL; reduced N+1 patterns
- [x] **ORM Audit** — Reviewed all models for correct relationship definitions and cascade behaviors
- [x] **Performance Cleanup** — Removed dead code and unused query paths; consolidated duplicate logic

### Phase B — Performance & Caching
- [x] **Cursor Pagination** — Created pagination.py with base64-encoded cursor support; O(log n) B-tree seek pagination
- [x] **Redis Hardening** — Added connection pooling (50 max), socket timeouts, keepalive, health checks, loop-aware singleton
- [x] **Cache Improvements** — TTL-based eviction for slot lists; cache hit/miss tracking via Prometheus counters
- [x] **Connection Pool Optimization** — Configured asyncpg pool with pool_pre_ping, timeouts, recycling; pool status metrics
- [x] **Slow Query Logging** — SQLAlchemy query timing listener at 200ms threshold; truncated SQL logging

### Phase C-1 — Production Infrastructure
- [x] **Multi-Stage Dockerfile** — Builder + runtime stages; Python 3.12-slim; non-root user; layer caching; graceful shutdown
- [x] **Docker Compose Production** — compose.prod.yml with postgres/redis/backend; healthchecks; secrets via env vars; PgBouncer/Caddy options
- [x] **GitHub Actions** — PR workflow (be: lint + mypy + pytest); Docker release workflow on tag
- [x] **Deployment Documentation** — Created DEPLOYMENT.md, OPERATIONS.md, PRODUCTION_CHECKLIST.md

### Phase C-2 — Security Hardening
- [x] **Environment Validation** — validate_env() with strict startup checks (SECRET_KEY length, CORS, DB pool, LOG_LEVEL)
- [x] **Password Policy** — Minimum 32-char secret key enforcement; bcrypt already in place
- [x] **OTP Rate Limiting** — Redis-backed rate limiting per phone; lockout tracking via Prometheus counter
- [x] **Upload Sanitization** — MIME detection via magic bytes; SVG XSS stripping; extension whitelist; 5MB limit; UUID filenames
- [x] **HTTP Security Headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, Referrer-Policy, Cache-Control
- [x] **JWT Improvements** — Manual claim validation with clock skew; token type enforcement; KID header; previous key support

### Phase C-3 — Enterprise Authentication
- [x] **Refresh Token Rotation** — refresh_token model/repo; revoke old token on refresh; stolen token detection
- [x] **Session Management** — Session-bound refresh tokens via sid claim; periodic cleanup; session tracking metrics
- [x] **Key Rotation Architecture** — Dual-key support (SECRET_KEY + SECRET_KEY_PREVIOUS); zero-downtime rotation
- [x] **Secrets Management** — Env validation for all secrets; no checked-in credentials
- [x] **Security Test Suite** — Rotation, stolen token, replay attack, auth edge case tests

### Phase C-4 — Enterprise Observability
- [x] **Correlation IDs** — X-Request-ID middleware with contextvar propagation; configurable header name/length
- [x] **OpenTelemetry** — OTLP exporter; instruments FastAPI, SQLAlchemy, Redis, HTTPX; configurable sample rate
- [x] **Profiler Middleware** — Per-request DB/Redis timing breakdown; slow request logging at configurable threshold
- [x] **Prometheus Metrics** — HTTP request/latency histograms; business KPI gauges; cache hit/miss; pool stats; profiling histograms; counters (OTP lockouts, token rotations, uploads)
- [x] **SLO Definitions** — Availability (99.9%), latency P99 (500ms), error rate (1.0%)
- [x] **Structured Logging** — JSON format to stdout + rotating file; request_id injection; health-check suppression
- [x] **Metrics Refresh Background Task** — Polls DB every 120s for business gauges; error handling

### Frontend & Feature Work
- [x] **Neshan Map with CartoDB Tile Fallback** — 3-second tile-loading monitor; graceful fallback to CartoDB Voyager
- [x] **Profile Page Layout Redesign** — Card-section layout with account info and security sections
- [x] **Animated Hero SVG Illustration** — Framer-motion sequential chain animation for hero section
- [x] **Refactor Large Dashboard Pages** — Extracted 600-line pages into reusable components (BookingTable, NotificationTable, etc.)
- [x] **Manager Dashboard Bookings & Slots Pages** — Two full pages with search, filters, inline edit, and pagination
- [x] **Redesign Court Pages** — Public detail, management detail, and create court pages with modern UI
- [x] **Slot Calendar Component** — Reusable SlotCalendar with Persian week navigation and day tabs
- [x] **Update Seed Data** — Timezone-aware time slots (4,500 slots); court ratings aggregation
- [x] **Sidebar Nav Items in Header Dropdown** — Role-based dropdown menu in public SiteHeader
- [x] **Page Shift Fix on Popups** — scroll-lock fix for Radix Select/Dialog/Sheet
- [x] **Replace Hero Illustration with Animated SVG** — Inline SVG component with staggered entry animations
- [x] **Documentation Synchronization** — Updated README, architect.md, backend.md, frontend.md, commands.md, config.md; created memory.md

---

## Backlog 📌

### Phase D — Scale & Harden
- [ ] **Horizontal Scaling** — Container orchestration (Kubernetes / Nomad); multi-instance support
- [ ] **PgBouncer Deployment** — Uncomment and configure PgBouncer in compose.prod.yml; connection pooling for production
- [ ] **OpenTelemetry Expansion** — Custom spans for business logic; alerting rules from trace data
- [ ] **Read Replicas** — Configure PostgreSQL read replicas; route read queries to replica pool
- [ ] **Load Testing** — Artillery/k6 benchmark for booking flow; identify bottleneck under concurrent users
- [ ] **Performance Benchmarking** — Establish baseline metrics; track regression across releases
- [ ] **Worker Tuning** — Async worker pool sizing; background queue for non-critical tasks

### Phase E — Frontend Polish
- [ ] **E2E Tests with Playwright** — Core user flow: search → court detail → book → pay → review; cancellation scenarios
- [ ] **Performance & SEO** — Sitemap + robots.txt; full page metadata; next/image optimization; bundle analysis
- [ ] **Booking Confirmation Animation + Share** — Animated confirmation screen; share buttons for Telegram/WhatsApp
- [ ] **Advanced OTP UX** — 6-digit segmented input with auto-focus; resend countdown; smooth transitions
- [ ] **Manager Revenue & Booking Analytics** — Charts for daily/weekly/monthly revenue; time-slot heatmap
- [ ] **Monthly Booking Calendar View** — Visual calendar on court detail page; click day to see time slots

### Phase F — Advanced Features
- [ ] **Real Payment Gateway** — Replace PAYMENT_GATEWAY=mock with ZarinPal / Pay.ir; wallet top-up UX
- [ ] **Real SMS Provider** — Replace mock SMS with Kavenegar / FarazSMS for OTP delivery
- [ ] **Real-time Notifications (WebSocket)** — WebSocket integration for instant booking/alert notifications
- [ ] **Review Enhancements** — Photo uploads in reviews; helpful voting; sort options
- [ ] **Court Photo Gallery Management** — Drag & drop reorder for manager dashboard; CourtImage API exists
- [ ] **Wallet Top-Up UX** — Wallet top-up card with amount input and payment gateway redirect
- [ ] **Fix N+1 Queries in BookingService** — Use selectinload(Booking.slot).selectinload(TimeSlot.court)
- [ ] **Fix Duplicate Response Mapping in BookingService** — Extract shared response-building helper
- [ ] **Remove All `as any` TypeScript Assertions** — Clean unsafe casts in courts pages and map component
- [ ] **Extract Duplicate Status Labels** — Shared BOOKING_STATUS_LABELS, PAYMENT_STATUS_CONFIG in lib/constants.tsx
- [ ] **Fix next/image `unoptimized`** — Config remotePatterns for CDN/local uploads

---

## Statistics

| Metric | Value |
| ------ | ----- |
| **Version** | 0.4.0 |
| **Completed Phases** | A + Stabilization + B + C-1 + C-2 + C-3 + C-4 |
| **Tests Passing** | 248 (backend pytest) |
| **Backend Modules** | 19 core · 13 services · 12 repos · 16 models · 16 schemas · 18 routers |
| **Database Migrations** | 17 Alembic versions |
| **Frontend Components** | 36 shadcn/ui primitives |
| **Pipeline** | GitHub Actions (be: lint + typecheck + test; release: Docker build + push) |
| **Observability** | Prometheus · OpenTelemetry · Grafana · Sentry · JSON logs · Correlation IDs · Profiler |
| **Security** | OWASP headers · CSP · HSTS · Rate limiting · Upload sanitization · JWT rotation · Session management |
| **Documentation** | README · architect.md · backend.md · frontend.md · commands.md · config.md · memory.md |
| **Production Readiness** | Docker Compose · Healthchecks · Env validation · Non-root user · Graceful shutdown |

---

## Next Goal ⏭️

**Phase D — Scale & Harden.** Begin with PgBouncer deployment and load testing to establish a performance baseline before scaling horizontally.
