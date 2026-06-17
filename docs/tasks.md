# Tasks

> Last updated: 2026-06-17

## In Progress

*Nothing currently in progress.*

## Backlog

- [ ] **[Feature]** Real payment gateway integration — replace mock with Zibal/Parsian/Saman

- [ ] **[Feature]** SMS notification on booking confirmation — replace mock with Kavenegar/FarazSMS
- [ ] **[Feature]** Frontend location-based court search (API ready, needs UI)
- [ ] **[Feature]** User notification preferences — which notification types to receive
- [ ] **[Bug]** Reports & admin dashboard pages are cleared — rebuild or remove from sidebar
- [ ] **[Feature]** Multi-court management for managers (currently limited to 1 court)
- [ ] **[Feature]** Promo/discount codes
- [ ] **[Feature]** Recurring bookings (weekly/monthly schedules)
- [ ] **[Refactor]** Split booking logic into focused service modules
- [ ] **[Feature]** Court gallery management in dashboard UI
- [ ] **[Feature]** Multi-language support (FA/EN)

## Done

- [x] **[Chore]** Mobile-friendly responsive design — RTL fixes, touch targets, hamburger menu and theme toggle mobile fixes (2026-06-17)
- [x] **[Chore]** Homepage redesign: streamlined to 4 sections, new hero, removed glow/separators (2026-06-17)
- [x] **[Chore]** Remove dead pages (dashboard/favorites, /penalties, /wallet, /reviews) and unused public components (2026-06-17)
- [x] **[Chore]** Clean up remaining glow effects — removed radial-gradient backgrounds from body CSS, removed blur glow div from about page (2026-06-17)
- [x] **[Bug]** Fix dashboard court detail page "خطا در دریافت اطلاعات" — slots limit mismatch (limit=500 vs backend le=200) + fragile Promise.all (2026-06-16)
- [x] **[Chore]** Add rate limiting to auth endpoints (2026-06-16)
- [x] **[Bug]** Fix timezone issues in booking slots (2026-06-16)
- [x] **[Docs]** Add AGENTS.md (2026-06-14)
- [x] **[Bug]** Fix RTL layout in sidebar (2026-06-12)
- [x] **[Feature]** Dashboard header sticky + transparency (2026-06-12)
- [x] **[Fix]** Controlled input warning + redirect after registration (2026-06-12)
- [x] **[Feature]** Court detail page overhaul (2026-06-10)
- [x] **[Feature]** Schedule/time slot generation for managers (2026-06-10)
- [x] **[Feature]** Avatar upload & management (2026-06-08)
- [x] **[Feature]** Role-based sidebar (user/manager/admin) (2026-06-08)
- [x] **[Feature]** Manager one-court limit enforced (2026-06-08)
- [x] **[Feature]** Jalali date picker (2026-06-05)
- [x] **[Feature]** Court listing with sport type, search, price, location filter (2026-06-05)
- [x] **[Feature]** JWT auth — register, login, profile, avatar (2026-06-01)
- [x] **[Feature]** Wallet — deposit, withdraw, balance, transactions, refund (2026-06-01)
- [x] **[Feature]** Booking — create, pay (wallet), cancel with penalty/reversal (2026-06-01)
- [x] **[Feature]** Court CRUD with image gallery (2026-06-01)
- [x] **[Feature]** Admin — approve/reject courts, users CRUD, hard-delete, broadcast (2026-06-01)
- [x] **[Feature]** Reviews with admin response (2026-06-01)
- [x] **[Feature]** Contact form + admin management (2026-06-01)
- [x] **[Feature]** Favorites (2026-06-01)
- [x] **[Feature]** Notifications — read/unread/broadcast (2026-06-01)
- [x] **[Feature]** Penalty system for late cancellations (2026-06-01)
- [x] **[Feature]** Dashboard stats — user, manager, admin + revenue + charts (2026-06-01)
- [x] **[Feature]** Audit logs — filter, clear, delete (2026-06-01)
- [x] **[Feature]** Platform settings management (2026-06-01)
- [x] **[Feature]** Prometheus + Sentry monitoring (2026-06-01)
- [x] **[Feature]** Health check endpoint (2026-06-01)
- [x] **[Chore]** Docker Compose (Postgres + Redis) (2026-06-01)
- [x] **[Chore]** Pre-commit hooks (2026-06-01)
- [x] **[Chore]** CI/CD workflows (2026-06-01)
