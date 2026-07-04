# Part 5 — Codebase Assessment

## Architecture Quality

**Rating: Strong (8/10)**

The 3-layer architecture (API → Service → Repository) is consistently applied across all domains. Separation of concerns is clean: repositories handle data access, services handle business logic, API handlers handle HTTP concerns. The use of FastAPI's dependency injection for auth and DB sessions is idiomatic and testable.

**Strengths:**
- Consistent layering across all 15+ domains
- Repository pattern isolates query complexity from business logic
- Pydantic schemas enforce clear API contracts
- Background tasks (expired booking cleanup, metrics refresh) cleanly integrated via lifespan

**Weaknesses:**
- Services raise `HTTPException` directly (couples service layer to HTTP concerns)
- Some services are very large (booking_service.py ~800 lines) — could benefit from sub-services
- No interface/abstract base classes for repositories — swapping implementations requires changing imports

---

## Backend Quality

**Rating: Strong (8/10)**

Well-structured, well-tested Python backend with modern async patterns.

**Strengths:**
- Async throughout (asyncpg, async SQLAlchemy, aioredis)
- Connection pool properly tuned with pre_ping and sensible defaults
- Query timing instrumentation built into the database layer
- Comprehensive environment validation at startup
- Graceful degradation on Redis failure (cache misses, rate limiter fallback)

**Weaknesses:**
- `PaymentService` and `SmsProvider` are mocks with no adapter pattern for real implementations
- Some N+1 query risks with default lazy-loading (no explicit `selectinload` in model definitions)
- Background task error handling is basic (catch-all + sleep loop)

---

## Database Quality

**Rating: Very Strong (9/10)**

The schema is well-normalized, properly indexed, and uses PostgreSQL features effectively.

**Strengths:**
- Partial unique index (`uq_bookings_one_active_per_slot`) is elegant and correct
- Optimistic locking via version field — proper concurrent-booking protection
- TIMESTAMPTZ used consistently (after migration `0009` fixed the regression)
- FK indexes comprehensive (retroactively added via dedicated performance migrations)
- Check constraint on phone format — defense in depth at DB level
- Migration history is clean and well-ordered (22 migrations, no branches)

**Weaknesses:**
- `TimeSlot.is_reserved` is technical debt (duplicates `status` information)
- `Vendor.average_rating` denormalized without a DB trigger — relies on app correctness
- `sport_types` ARRAY(String) lacks GIN index for containment queries
- No soft-delete — accidental deletion is unrecoverable without backup

---

## API Design Quality

**Rating: Strong (8/10)**

RESTful, well-documented, with consistent patterns.

**Strengths:**
- Consistent REST resource naming (`/api/v1/vendors/{id}/slots`)
- Cursor-based pagination for performance at scale
- Clear auth tier system (public, optional, user, manager, admin)
- Structured error responses with Persian translations, request IDs, and field-level details
- OpenAPI documentation enhanced with `openapi_docs.py`
- Rate limiting on sensitive endpoints

**Weaknesses:**
- Some endpoints return mixed response shapes (inconsistent between list/detail)
- Legacy routes (`/courts/`) still mounted for backwards compatibility (API surface area bloat)
- No API versioning strategy beyond `/v1` prefix (no clear v2 migration path)

---

## Frontend Quality

**Rating: Good (7/10)**

Well-organized Next.js app with good Persian/RTL support.

**Strengths:**
- Consistent use of shadcn/ui primitives — cohesive design language
- RTL-first with proper Radix DirectionProvider integration
- Token refresh with single-inflight deduplication is well-implemented
- Zod schemas shared between form validation and API types
- Persian digit conversion applied consistently via utility

**Weaknesses:**
- Most pages are client-rendered (`"use client"`) — misses Next.js SSR/RSC benefits
- No global state library — can lead to prop drilling in deeper component trees
- No E2E testing (only unit/component tests)
- Some large page files (vendor detail >1000 lines) could be decomposed

---

## Security

**Rating: Strong (8/10)**

Comprehensive security model with multiple defense layers.

**Strengths:**
- JWT with key rotation, token versioning, session management
- Refresh token rotation with replay attack detection
- bcrypt password hashing with minimum key length enforcement
- Rate limiting (Redis-backed with graceful fallback)
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- File upload validation (magic bytes, not just extensions)
- DB-level phone format constraint
- OTP lockout after 5 failed attempts
- Audit logging for all security events

**Weaknesses:**
- Access token stored in non-httpOnly cookie (XSS → token theft)
- CORS set to `*` in development (validated but only warns, doesn't block startup)
- No CSRF protection (relies on SameSite cookie + Bearer token)
- No account lockout on failed password attempts (only OTP has lockout)

---

## Performance

**Rating: Good (7/10)**

**Strengths:**
- Cursor-based pagination (O(log n) vs O(n) for offset)
- Redis caching with jitter (prevents stampede)
- Connection pooling with pre_ping
- Query timing instrumentation for identifying slow queries
- SELECT FOR UPDATE on booking creation (prevents lost updates)

**Weaknesses:**
- Cache TTLs are very short (30s for slots, 60s for admin lists) — high cache miss rate
- No query result caching at the ORM level
- Background tasks poll on fixed intervals (60s/120s) rather than event-driven
- No database query optimization visible (no raw SQL, no query plans documented)
- Missing GIN index for sport_types array queries

---

## Scalability

**Rating: Moderate (6/10)**

Designed for single-city (Qom) scale — appropriate for current needs.

**Strengths:**
- Stateless backend (horizontal scaling possible)
- Redis for shared state (sessions, rate limits, cache)
- Connection pool properly sized for moderate concurrency
- Partial unique index prevents double-booking without application locks

**Limitations:**
- Single PostgreSQL instance (no read replicas, sharding, or partitioning)
- Background tasks run in-process (no external job queue like Celery)
- File uploads stored locally (`uploads/` directory) — not CDN/S3
- No WebSocket/SSE for real-time updates (polling-based)
- Single-region deployment assumption

---

## Maintainability

**Rating: Strong (8/10)**

**Strengths:**
- Clear folder structure with consistent naming
- Alembic migrations properly chained (no orphans)
- Pre-commit hooks enforce formatting (Ruff, Prettier, ESLint)
- Makefile with comprehensive targets
- Type hints throughout Python code
- Conventional Commits enforced
- 248 tests passing (good coverage of happy paths and edge cases)

**Weaknesses:**
- Two large monolithic commits in recent history (bundling multiple features)
- Some code duplication in booking response construction
- Missing docstrings on several service methods

---

## Technical Debt

| Item | Severity | Effort | Description |
|---|---|---|---|
| `TimeSlot.is_reserved` | Low | Small | Legacy boolean duplicating `status` info. Drop or derive as property. |
| Legacy `/courts/` routes | Low | Small | API surface area bloat. Can be removed when frontend fully migrated. |
| Mock payment/SMS | Medium | Large | No adapter pattern — switching to real gateways requires refactoring service layer. |
| Access token in non-httpOnly cookie | Medium | Medium | XSS vulnerability. Move to httpOnly or use BFF pattern. |
| `Vendor.average_rating` sync | Low | Medium | No DB trigger — rating can drift. Add trigger or compute on read. |
| Large page components | Low | Medium | Several 1000+ line page files. Extract sub-components. |
| No E2E tests | Medium | Large | Only unit/component tests. Critical flows (booking, payment) lack browser-level verification. |
| Local file storage | Medium | Medium | `uploads/` not S3/CDN. Won't work with multiple backend instances. |
| No external job queue | Medium | Large | Background tasks in-process. Booking expiry depends on running server. |

---

## Future Improvement Priorities

1. **Real payment gateway integration** — Replace mock with adapter pattern supporting Zarinpal/Mellat
2. **Real SMS provider** — Replace mock with Kavenegar/Faraz SMS
3. **Object storage** — Move uploads to S3-compatible storage (MinIO/Arvan)
4. **E2E testing** — Add Playwright tests for booking flow, payment, cancellation
5. **Access token hardening** — Move to httpOnly cookie or implement BFF pattern
6. **Job queue** — Extract background tasks to Celery/ARQ for reliability
7. **Read replicas** — When query load increases, add PG read replicas
8. **WebSocket notifications** — Real-time booking confirmations and slot updates
9. **GIN index on sport_types** — Optimize venue filtering queries
10. **Service decomposition** — Split booking_service.py into booking_creation, booking_payment, booking_cancellation
