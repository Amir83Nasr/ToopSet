# Tasks

> Last updated: 2026-06-16

## In Progress

- [ ] **[Feature]** Real payment gateway integration — replace mock with Zibal/Parsian/Saman gateway
- [ ] **[Feature]** Frontend location-based court search (API ready with haversine, needs UI)
- [ ] **[Bug]** Reports page is cleared (empty `page.tsx`) — rebuild or remove from sidebar
- [ ] **[Bug]** Admin dashboard page is cleared (empty `page.tsx`) — same issue

## Up Next

- [ ] **[Feature]** SMS notification on booking confirmation — replace mock with Kavenegar/FarazSMS
- [ ] **[Feature]** User notification preferences — which notification types to receive
- [ ] **[Feature]** Build admin dashboard page (was cleaned out, needs rebuilding)
- [ ] **[Feature]** Build reports page (was cleaned out)

## Icebox / Future

- [ ] **[Refactor]** Split booking logic into focused service modules (booking + cancellation + payment)
- [ ] **[Feature]** Multi-court management for managers (currently limited to 1 court)
- [ ] **[Feature]** Promo/discount codes
- [ ] **[Feature]** Recurring bookings (weekly/monthly schedules)
- [ ] **[Feature]** Multi-language support (FA/EN)
- [ ] **[Feature]** Court gallery management in dashboard UI

## Done

### 2026-06-16

- [x] **[Chore]** Add rate limiting to auth endpoints (slowapi + Redis — login: 5/min, register: 3/min, refresh: 10/min)
- [x] **[Bug]** Fix timezone issues in booking slots (added Asia/Tehran module, UTC conversion on store/read)

### 2026-06-14

- [x] **[Docs]** Add AGENTS.md with comprehensive project overview

### 2026-06-12

- [x] **[Bug]** Fix RTL layout issues in sidebar
- [x] **[Feature]** Improve dashboard header (sticky + transparency)
- [x] **[Fix]** Controlled input warning and redirect after registration

### 2026-06-10

- [x] **[Feature]** Court detail page overhaul
- [x] **[Feature]** Schedule/time slot generation for managers

### 2026-06-08

- [x] **[Feature]** User avatar upload and management
- [x] **[Feature]** Dashboard role-based sidebar (user/manager/admin)
- [x] **[Feature]** Manager one-court limit enforced

### 2026-06-05

- [x] **[Feature]** Persian (Jalali) date picker integration
- [x] **[Feature]** Court listing with sport type, search, price, location (haversine) filtering

### 2026-06-01 — Initial feature set

- [x] **[Feature]** User registration, login, profile with JWT
- [x] **[Feature]** Wallet system — deposit, withdraw, balance, transactions, auto-refund on cancel
- [x] **[Feature]** Booking system — create, pay (via wallet), cancel with penalty/reversal
- [x] **[Feature]** Court CRUD with images/gallery management for managers
- [x] **[Feature]** Admin features — court approval/rejection, users CRUD, hard-delete, broadcast
- [x] **[Feature]** Review system with admin response
- [x] **[Feature]** Contact form (public) with admin management
- [x] **[Feature]** Favorites system
- [x] **[Feature]** Notification system with read/unread/broadcast
- [x] **[Feature]** Penalty system for late cancellations
- [x] **[Feature]** Dashboard stats — user, manager, admin stats, revenue, charts
- [x] **[Feature]** Audit log system with filtering, clear, delete
- [x] **[Feature]** Platform settings management (key-value)
- [x] **[Feature]** Prometheus metrics + monitoring middleware
- [x] **[Feature]** Sentry error monitoring
- [x] **[Feature]** Health check endpoint
- [x] **[Chore]** Docker Compose (Postgres + Redis)
- [x] **[Chore]** Pre-commit hooks (ruff, prettier, eslint, trailing whitespace)
- [x] **[Chore]** CI/CD workflows (tests, lint, docker build)
