# Part 6 — Learning Guide

A recommended path for a new developer to become productive in this codebase.

---

## Step 1: Understand the Domain

**Read:**
- `README.md` (project overview, features list, stack table)
- `docs/app/01-overview.md` (this documentation)

**Concepts:** Sports court booking in Iran, Persian-first UX, role-based access (user/manager/admin), the booking-payment-cancellation lifecycle.

**Why first:** You can't reason about code without understanding what the system does and who it serves. The domain is straightforward but has Iran-specific nuances (gender-segregated sessions, Jalali calendar, Toman currency, Iranian mobile format).

---

## Step 2: Run the Project Locally

**Files:**
- `compose.yml` (PostgreSQL + Redis)
- `.env.example` → copy the backend section to `backend/.env` and the frontend section to `frontend/.env.local`
- `Makefile` (see targets: `make dev`, `make migrate`, `make seed`)

**Steps:**
```bash
docker compose up -d          # Start PostgreSQL + Redis
cd backend && pip install -r requirements.txt
alembic upgrade head          # Run migrations
python scripts/seed.py        # Seed sample data
uvicorn app.main:app --reload # Start backend on :8000
cd ../frontend && pnpm install && pnpm dev  # Start frontend on :3000
```

**Why second:** Having the system running lets you explore API endpoints via Swagger (`/docs`), see the frontend, and understand how the pieces connect before reading code.

---

## Step 3: Understand the Backend Layering

**Read (in order):**
1. `backend/app/main.py` — How the app starts, middleware stack, router registration
2. `backend/app/api/deps.py` — Dependency injection (auth, DB session)
3. `backend/app/core/config.py` — All configuration settings
4. `backend/app/core/database.py` — Engine, session factory, query instrumentation

**Concepts:** FastAPI app lifecycle, middleware ordering, async session management, environment-driven configuration.

**Why third:** These 4 files are the backbone. Every request flows through main.py's middleware, uses deps.py's injection, reads config.py's settings, and accesses the DB via database.py.

---

## Step 4: Trace a Complete Request

**Follow the booking creation flow end-to-end:**

1. `backend/app/api/v1/bookings.py` — route handler
2. `backend/app/schemas/booking.py` — request/response validation
3. `backend/app/services/booking_service.py` — `create_booking()` method
4. `backend/app/repositories/booking_repo.py` — data access
5. `backend/app/models/booking.py` + `time_slot.py` — ORM models

**Concepts:** 3-layer architecture in practice, Pydantic validation, SQLAlchemy async queries, optimistic locking, FOR UPDATE row locking.

**Why fourth:** Tracing one complete flow teaches you the architecture by example. Booking creation is the most complex single operation and touches all layers.

---

## Step 5: Understand Authentication

**Read:**
1. `backend/app/core/security.py` — JWT creation/decode, key rotation, password hashing
2. `backend/app/services/auth_service.py` — Login, register, refresh rotation, session management
3. `backend/app/services/otp_service.py` — Passwordless OTP flow
4. `backend/app/models/refresh_token.py` — Refresh token storage

**Concepts:** JWT claims (sub, ver, sid, type), HS256 signing, key rotation (kid headers), token versioning for invalidation, refresh token rotation with replay detection, bcrypt hashing.

**Why fifth:** Auth permeates every protected endpoint. Understanding token_version, refresh rotation, and the 4-tier auth system (public/optional/user/manager/admin) is essential before working on any feature.

---

## Step 6: Study the Database Schema

**Read:**
- `docs/app/03-database.md` (this documentation)
- `backend/app/models/__init__.py` (model registry)
- Browse each model file for 2 minutes each, focusing on relationships and constraints

**Concepts:** All 20 models, their relationships, enums (11 total), the partial unique index, optimistic locking version field.

**Why sixth:** Once you understand a request flow and auth, the schema is the next essential knowledge. Every service/repo depends on understanding model relationships.

---

## Step 7: Understand the Business Rules

**Read:**
- `backend/app/services/booking_service.py` — Full file, focus on `cancel_booking()`
- `backend/app/services/finance_service.py` — Manager operations, refund creation
- `backend/app/services/payment_service.py` — Mock gateway (short file)
- `backend/docs/booking-cancellation-flow-fa.md` — Persian documentation of cancellation rules

**Concepts:** Cancellation tiers (>48h = 10% penalty, ≤48h = pending replacement), replacement bookings, settlement lifecycle, wallet refunds, manager walk-in bookings.

**Why seventh:** The booking-cancellation-refund flow is the most complex business logic. It connects bookings, slots, penalties, refunds, wallets, and notifications.

---

## Step 8: Explore the Frontend

**Read:**
- `frontend/lib/api.ts` — How frontend talks to backend
- `frontend/hooks/use-auth.ts` — Auth state management
- `frontend/app/vendors/[id]/page.tsx` — A complex page with slot calendar + booking
- `frontend/components/ui/` — Browse shadcn primitives available

**Concepts:** Token storage in cookies, automatic refresh on 401, Persian digit conversion, Jalali date handling, RTL layout considerations.

**Why eighth:** By now you understand the backend. The frontend is simpler architecturally — understanding the API client and auth hook lets you navigate any page.

---

## Step 9: Run and Understand Tests

**Read:**
- `backend/tests/conftest.py` — Test infrastructure and fixtures
- `backend/tests/test_bookings.py` — Integration test patterns
- `backend/tests/test_auth.py` — Auth flow testing
- `backend/tests/test_security.py` — Security edge cases

**Run:**
```bash
cd backend && pytest -x -q    # Run all backend tests
cd frontend && npx vitest run # Run all frontend tests
```

**Concepts:** Transactional test isolation, auth fixture helpers, how to write a new test.

**Why ninth:** Understanding test patterns lets you verify your changes and write tests for new features.

---

## Step 10: Review Infrastructure

**Read:**
- `Makefile` — All development commands available
- `lefthook.yml` — Git hooks (pre-commit/pre-push)
- `backend/Dockerfile` — Production build
- `backend/app/core/metrics.py` — Prometheus instrumentation
- `backend/app/core/profiler.py` — Request profiling

**Concepts:** Development workflow (lefthook, make lint, make test, make check), Docker multi-stage builds, monitoring setup.

**Why last:** Infrastructure knowledge isn't needed for feature development, but is essential for deployment and debugging production issues.

---

## Quick Reference: "Where Is...?"

| I need to... | Look at... |
|---|---|
| Add a new API endpoint | `backend/app/api/v1/` (create route file, register in main.py) |
| Add a new DB model | `backend/app/models/` then `alembic revision --autogenerate` |
| Add business logic | `backend/app/services/` (create or extend service) |
| Add a query | `backend/app/repositories/` (create or extend repo) |
| Add a frontend page | `frontend/app/` (Next.js file-based routing) |
| Add a UI component | `frontend/components/` (use shadcn/ui primitives) |
| Change auth behavior | `backend/app/core/security.py` + `backend/app/services/auth_service.py` |
| Add a migration | `cd backend && alembic revision --autogenerate -m "description"` |
| Run tests | `make test` (backend) or `cd frontend && npx vitest run` |
| Check formatting | `make precommit` |
| See all API endpoints | Run backend → visit `http://localhost:8000/docs` |
| Understand a feature | Start with the service file, then trace to repo and API |
