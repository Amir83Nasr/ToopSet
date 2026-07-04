# Part 4 — Recent Git Changes

## Commit Analysis (Most Recent → Oldest)

### `ff51e28` — Add booking finance and cancellation flows

**What changed:** This is the largest single commit in recent history (114 files, +9615/-1375 lines). It introduces the complete finance subsystem.

**Backend additions:**
- New models: `Refund`, `Settlement`, `SettlementItem`, `SlotCancellation`, `NotificationDelivery`
- New service: `finance_service.py` (578 lines) — settlement requests, manager bookings, recurring bookings, slot cancellations, refund creation
- Expanded `booking_service.py` with full cancellation tiers (>48h = 10% penalty + 90% refund; ≤48h = pending replacement)
- `otp_service.py` completely reworked (OTP rate limiting, lockout tracking, Redis-backed cooldown)
- `auth_service.py` extended with session management, refresh rotation with replay detection
- 4 new migrations: `0017` (finance models + partial unique index), `0018` (phone CHECK constraint), `0019` (one bank card per user), `0020` (merge booking sources)
- `openapi_docs.py` (518 lines) for enhanced Swagger documentation
- New endpoints: wallet balance, admin settlements/refunds, manager slot cancellations, OTP auth flow

**Frontend additions:**
- Complete booking cancellation dialog with bank card verification
- Admin pages for refunds, settlements, manager-cancellations
- Redesigned booking list with refund status display
- Settings page overhaul with bank card management
- OTP-based login/register flow with 2-step verification

**Architectural decisions:**
- Tiered cancellation policy (business rule: ≤48h gets pending-replacement, not instant refund)
- Partial unique index `uq_bookings_one_active_per_slot` — DB-enforced single-booking-per-slot
- Refund model stores full financial snapshot (denormalized by design for audit trail)
- Settlement workflow: manager requests → admin approves → marks paid

**Trade-offs:**
- Large monolithic commit violates "one logical change per commit" — multiple features bundled
- `is_reserved` legacy field not cleaned up alongside the new `SlotStatus` enum
- Manager recurring bookings added then immediately simplified (source enum merged in same commit's migration `0020`)

---

### `1ea6903` — feat: migrate vendors and add documentation

**What changed:** Domain rename from "courts" to "vendors" + substantial documentation.

**Backend:**
- Renamed `court.py` → `vendor.py`, `court_repo.py` → `vendor_repo.py`, `court_service.py` → `vendor_service.py`
- Migration `0016`: full DB rename (table, FK columns, indexes, sequences)
- New: `bank_card_service.py`, `upload_temp_service.py`, `card_security.py`
- Migration `0015`: slot hardening (status enum, gender, ball_price, version field significance)
- New docs: `backend-business-logic-review.md` (1111 lines), `backend.md` (603 lines)

**Frontend:**
- File renames: `courts/` → `vendors/` throughout (components, pages, tests)
- Legacy `courts/` pages kept as thin redirects/wrappers
- New `dashboard/vendors/` pages with full CRUD

**Why:** "Vendor" better represents the business concept (a sports complex/organization) vs "court" (a single playing surface). The rename is thorough — from DB table names through to frontend route segments.

**Maintainability:** Excellent — legacy routes maintained for backwards compatibility; migration is fully reversible. Documentation produced alongside the rename explains the entire backend.

---

### `7b80f6b` — docs(project): synchronize documentation with current codebase state

**What changed:** Comprehensive documentation sync covering all completed engineering phases.

**Key additions:**
- GitHub Actions CI: `backend.yml` (288 lines — lint, test, coverage on PR), `docker-release.yml` (Docker image on tag)
- Multi-stage Dockerfile rewrite (Python 3.12-slim, non-root user, layer caching)
- `compose.prod.yml` with healthchecks
- Security headers middleware, upload sanitization, env validation
- Refresh token rotation, session management, key rotation
- Correlation IDs, OpenTelemetry, request profiler, Prometheus metrics, SLO definitions
- Updated README, architect.md, backend.md, frontend.md, commands.md, config.md

**Architectural significance:** This commit represents the transition from MVP to production-readiness. The codebase went from "works in dev" to having proper security, observability, CI/CD, and deployment infrastructure.

---

### `ec3ec3f` — perf(map): reduce tile fallback delay to 1s and add DNS prefetch

**What changed:** Performance optimization for map tiles.
- CartoDB fallback trigger delay reduced from unspecified → 1 second
- DNS prefetch link added for CartoDB CDN

**Why:** Users in Iran experience intermittent Neshan Maps tile loading failures (HTTP 204). The fallback was too slow, causing visible blank tiles. DNS prefetch warms the connection to the fallback CDN.

---

### `5f902c6` — fix(map): add CartoDB tile fallback for Neshan 204 errors

**What changed:** Introduces CartoDB as a fallback tile provider when Neshan Maps returns 204 (No Content) errors.

**Why:** Neshan Maps (the Iranian mapping service) has reliability issues. Rather than showing broken map tiles, the app now transparently switches to CartoDB's global tile service. This is a resilience pattern — graceful degradation with automatic failover.

---

### `53e3182` — feat(dashboard): redesign profile with card-section layout

**What changed:** Dashboard profile page redesigned with distinct card sections for personal info, avatar, and settings.

---

### `559f7a9` / `2767bd4` / `85e9cb5` — feat(ui): animated hero SVG and manager dashboard

**What changed:** Multi-commit feature for:
- Custom animated SVG hero illustration (staggered entry animations via framer-motion)
- Manager dashboard pages (bookings, slots, schedule management)

---

### `bde7df2` — feat(courts): add slot calendar component and redesign court detail pages

**What changed:** New `SlotCalendar` component showing 7-day slot availability view. Court detail pages redesigned to prominently feature the calendar + booking flow.

---

### `fb908ac` — feat(dashboard): notifications with search, filters, caching, and broadcast

**What changed:** Full notification management: search by content, filter by type/read-status, Redis caching for notification lists, admin broadcast modal to send notifications to all users.

---

### Earlier commits (schedule system): `ed23c3d` → `3a54e20`

**What changed:** Complete schedule management system for managers:
- `SlotCard` component for time slot display
- `DayColumn`, `WeeklyGrid`, `MobileDayView` for schedule visualization
- `BulkGenerator` with template save/load for recurring slot creation
- `QuickSlotForm` for single slot creation
- `TodayPreview` widget on manager dashboard

---

## Evolution Summary

The project evolved through clear phases:

1. **Foundation (early commits):** Basic CRUD for courts, bookings, payments, auth
2. **UI Polish:** shadcn card redesigns, Persian digits, pagination, map integration
3. **Schedule System:** Manager tools for slot creation and visualization
4. **Map Integration:** Neshan SDK → CartoDB fallback → performance tuning
5. **Production Hardening (`7b80f6b`):** Security headers, OTEL, Prometheus, CI/CD, Docker
6. **Domain Rename (`1ea6903`):** courts → vendors, documentation, bank cards
7. **Finance System (`ff51e28`):** Cancellation tiers, refunds, settlements, OTP, session management

The overall trajectory is: **MVP → Feature Complete → Production Ready → Finance/Compliance Ready**.
