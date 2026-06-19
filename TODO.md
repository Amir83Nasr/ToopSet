# Tasks

> Last updated: 2026-06-19 — comprehensive seed data & cleanup

## In Progress

*Nothing currently in progress.*

## Next Up

- [ ] **[P1] [Feature]** Real payment gateway integration — replace mock with Zibal/Parsian/Saman
- [ ] **[P1] [Feature]** Multi-court management for managers

## Backlog

- [ ] **[P1] [Feature]** SMS notification on booking confirmation — replace mock with Kavenegar/FarazSMS
- [ ] **[P1] [Feature]** Frontend location-based court search (API ready, needs UI)
- [ ] **[P2] [Feature]** User notification preferences — which notification types to receive
- [ ] **[P2] [Feature]** Promo/discount codes
- [ ] **[P2] [Feature]** Recurring bookings (weekly/monthly schedules)
- [ ] **[P2] [Refactor]** Split booking logic into focused service modules
- [ ] **[P2] [Feature]** Court gallery management in dashboard UI
- [ ] **[P2] [Feature]** Multi-language support (FA/EN)

## Done

- [x] **[Chore]** Seed data: 20 Persian users, 15 Qom courts, 14-day slots, 38 bookings, payments, reviews, logs, transactions (2026-06-19)

- [x] **[Feature]** Pagination-aware search/filter for bookings & payments — backend query params (`search`, `status`) on all 4 list endpoints, frontend sends filters to backend instead of useMemo client-side filtering (2026-06-18)
- [x] **[Bug]** Fix courts admin 500 error — missing `فوتبال` in SportType enum + _SPORT_MAP (2026-06-18)
- [x] **[Bug]** Fix payments page empty — add missing `/my` endpoint for user payments + add `user_name` to `PaymentDetailResponse` for admin table (2026-06-18)
- [x] **[Perf]** Table optimization — pagination for payments & pending-courts, Redis caching for all admin list endpoints, cache invalidation on mutations (2026-06-17)
- [x] **[Bug]** Fix admin bookings route collision (`/all` shadowed by `/{booking_id}`) — reorder FastAPI routes, remove duplicate code (2026-06-17)
- [x] **[Bug]** Fix courts 500 error — Persian sport_type values in DB vs English SportType enum → add `@field_validator` mapping (2026-06-17)
- [x] **[Bug]** Fix user booking list missing court_name/slot info — switch schema to `BookingDetailResponse` with joined data (2026-06-17)
- [x] **[Feature]** Manager schedule management redesign — weekly grid, bulk generator, quick slot form, today preview (2026-06-17)
- [x] **[Docs]** Formal Persian academic proposal (پروپوزال) for bachelor's computer engineering project presentation — saved to docs/proposal.md (2026-06-17)
- [x] **[Chore]** Init CLAUDE.md + project-level `.claude/settings.json` for auto-context and permissionless workflow (2026-06-17)
- [x] **[Chore]** Style empty sidebar pages (reports, admin/settings) with consistent Card-based empty states (2026-06-17)
- [x] **[Chore]** Replace hardcoded badge/status colors with theme CSS variables across admin, notifications, manager, bookings, and courts pages (2026-06-17)
- [x] **[Chore]** Breadcrumbs clickable navigation, remove SidebarRail, fix collapsed logo alignment, add tooltip to sidebar toggle (2026-06-17)
- [x] **[Chore]** Add table header background tint (`bg-muted/30`), remove theme toggle from settings page, add refresh button to contact page (2026-06-17)
- [x] **[Chore]** Uniform form styling — `bg-background` on Input, Textarea, SelectTrigger, DatePicker, DateRangePicker, TimePicker (2026-06-17)
- [x] **[Chore]** Fix RTL alignment on picker components — `text-start` on SelectTrigger, SelectItem, TimePicker (2026-06-17)
- [x] **[Chore]** 6 UI polish items — table button tooltips, form border-radius uniformity (`rounded-md`), stronger table header (`bg-muted/50`), sidebar logo fix, Select RTL with `align="start"` (2026-06-17)
- [x] **[Chore]** Add shadcn-pattern Labels above all dashboard Select components (admin/bookings, admin/logs, courts, users, manager/schedule, homepage) (2026-06-17)
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
