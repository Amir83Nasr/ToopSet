# TODO

Updated: 2026-06-26

## Backlog

- [ ] **Fix `next/image` unoptimized — Config remotePatterns for user uploads** — Replace 10+ `unoptimized` props on next/image with proper `remotePatterns` in next.config.js for CDN/local uploads. Some external images may still need `unoptimized` but most can be optimized for better performance and SEO.

- [ ] **Fix all N+1 Queries + Harden cache_service** — Audit all services for N+1 patterns (selectinload/joinedload) and narrow `except Exception` in `cache_service.py` to specific exceptions so real DB/Redis bugs aren't silently swallowed.

- [ ] **Remove All `as any` TypeScript Assertions** — Remove unsafe `as any` casts in `courts/create/page.tsx`, `courts/[id]/page.tsx` (zodResolver typing) and `courts-map.tsx` (custom marker properties via extended interface).

- [ ] **Extract Duplicate Status Labels into Shared Constants** — Create `frontend/lib/constants.tsx` with shared `BOOKING_STATUS_LABELS`, `BOOKING_STATUS_STYLES`, `PAYMENT_STATUS_CONFIG` maps. Remove duplicate definitions from 4-6 dashboard pages.

- [ ] **Fix N+1 Query in BookingService** — Use `selectinload(Booking.slot).selectinload(TimeSlot.court)` in the base booking query so the 21-query pattern (1 for bookings + N for each slot) becomes a single query.

- [ ] **Fix Duplicate Response Mapping in BookingService** — Extract private `_build_booking_list_response` helper in `booking_service.py` to deduplicate the identical response-building loops in `list_my_bookings` and `list_completed_bookings`.

- [ ] **Booking Confirmation Animation + Share** — Animated confirmation screen with confetti (canvas-confetti already installed) after successful booking. Share buttons for Telegram/WhatsApp. Add-to-calendar option (Persian calendar).

- [ ] **Manager Revenue & Booking Analytics** — Charts in manager dashboard using recharts (already installed): daily/weekly/monthly revenue, popular time-slot heatmap, booking trends by day of week.

- [ ] **Advanced OTP UX** — 6-digit segmented input with auto-focus, auto-submit on completion, resend countdown timer, smooth transitions between auth steps (framer-motion already installed).

- [ ] **Monthly Booking Calendar View** — Visual monthly calendar on court detail page showing available/blocked dates. Click on a day to see its time slots. Improves booking UX beyond date-picker + slot-list pattern.

- [ ] **Review Enhancements (Photos + Helpful Votes)** — Allow photo uploads in reviews, add "helpful" voting on reviews, add sort options (newest, highest rating, most helpful).

- [ ] **Court Photo Gallery Management** — UI for managers to upload, reorder (drag & drop), and delete court images from the manager dashboard. CourtImage model and upload API already exist.

- [ ] **Wallet Top-Up UX** — Add wallet top-up card in user dashboard with amount input and payment gateway redirect. Wallet system (wallets table, wallet router, wallet_repo) already exists on the backend.

- [ ] **Performance & SEO** — Sitemap + robots.txt, full metadata for all pages, next/image optimization for court images, bundle analysis (@next/bundle-analyzer already installed), lazy loading for heavy components. Essential for Google indexing and smooth UX at launch.

- [ ] **Real-time Notifications (WebSocket)** — WebSocket integration for instant notifications (booking confirmation/cancellation alerts, manager alerts for new courts). Currently notifications exist in DB but require page refresh.

- [ ] **E2E Tests with Playwright** — End-to-end test covering the core user flow: search → court detail → book → pay → review. Also cancellation penalty scenarios. Unit/integration tests exist but no full E2E coverage.

- [ ] **Real Payment Gateway** — Replace `PAYMENT_GATEWAY=mock` with a real Iranian provider (ZarinPal, Pay.ir, etc.). Wallet system already built (refund only); needs direct deposit + booking payment support. Production blocker.

- [ ] **Real SMS Provider** — Replace mock SMS (`print("code 123456 to console")`) with a real Iranian SMS provider (Kavenegar, FarazSMS, etc.) for OTP delivery. Production blocker for auth flow.

## In Progress

- [ ] Manager court management page (started: 2026-06-23)

- [ ] Public court page (started: 2026-06-23)

- [ ] **Booking Confirmation (In Progress)** — Added SiteHeader + SiteFooter to booking page, removed breadcrumbs, removed participants count, changed final button to "تأیید و پرداخت" with redirect to `/book/payment` gateway page. Gateway page shows under-construction placeholder with booking summary. Remaining: connect real payment gateway. (started: 2026-06-23)

- [ ] Add new time slot entries (started: 2026-06-23)

- [ ] Court profile section for manager dashboard (started: 2026-06-23)

- [ ] Time slot display tables (started: 2026-06-23)

- [ ] Dashboard settings section (started: 2026-06-23)

- [ ] Profile page layout (started: 2026-06-23)

## Done

- [x] **Update README.md with Logo and Screenshots** — Added responsive logo (dark/light mode via `<picture>` tag + `srcset`), interactive screenshot gallery showing main page (light/dark) and manager dashboard, tech stack badges, and clean project structure layout. (completed: 2026-06-26)

- [x] **Replace Hero Illustration with Animated SVG + Add Branding Assets** — Created `HeroAnimatedIllustration` inline SVG component with staggered piece-by-piece entry (14 groups fade+slide from y:6) and infinite gentle animations (arrow float 6px, body pulse 0.4↔1, circle breath 1↔1.07, connector wiggle 3px). No glow. Dark mode via CSS `invert`. Replaced `<Image>` in hero-section with new component. Removed old `hero-illustration.tsx` and legacy image assets. Added brand icons (favicon, profile, vector) and sports imagery (arrange SVGs, championship/worldcup photos). Updated site header/footer and auth page layouts with new branding. (completed: 2026-06-26)

- [x] **Refactor Large Dashboard Pages into Reusable Components** — Extracted 600-line `bookings/page.tsx` and 520-line `notifications/page.tsx` into standalone reusable components: `BookingTable`, `BookingFilters`, `BookingTableSkeleton`, `BookingEmptyState`, `BookingCancelDialog`, `NotificationTable`, `NotificationFilters`, `NotificationTableSkeleton`, `NotificationEmptyState`, `NotificationBroadcastDialog`. Each with unified styling matching the admin dashboard design system. Centralized types in `components/bookings/types.ts` and constants in `lib/constants.tsx`. (completed: 2026-06-24)

- [x] **Animated Hero SVG Illustration** — Created `HeroIllustration` component with framer-motion sequential chain animation on arrow paths. Three arrow paths animate in sequence (2s active + 4s pause per arrow) with accent elements lighting up half a slot later. `subtleRipple` on decorative small paths and `faintBody` on background elements create a coordinated visual rhythm. No glow/spotlight per user feedback. (completed: 2026-06-24)

- [x] **Manager Dashboard Bookings & Slots Pages** — Added two full dashboard pages for manager role: `/dashboard/manager/bookings` with search, status/court/date filters, and cancel booking action; `/dashboard/manager/slots` with court/status/date filters, inline edit dialog for time/price, and delete slot via AlertDialog. Both paginated and matching admin table design. Updated sidebar nav with "رزروها" and "سانس‌ها" links. Backend: new `manager.py` router with `/api/v1/manager/bookings` and `/api/v1/manager/slots` endpoints, `ManagerBookingResponse`/`ManagerSlotResponse` schemas, and `list_by_manager()` in booking repo. (completed: 2026-06-24)

- [x] **Update Seed Data with Timezone-Aware Time Slots and Court Ratings** — Fixed `backend/scripts/seed.py` to use timezone-aware datetimes (`now_iran()` / `iran_to_utc()`) for time slot generation, covering 60 future days with 5 fixed daily schedules per court (total 4,500 slots). Added `court.average_rating` calculation with SQL aggregation after review creation. Added 16 new review entries to ensure all 15 courts have at least 1-2 ratings. Fixed duplicate `booking_id` issue in review matching with `used_booking_ids` tracking. Ran seed to populate database with proper ratings (3.0–5.0 range) and future-dated slots. (completed: 2026-06-20)

- [x] **Remove Favorites System from Frontend** — Deleted the `FavoriteButton` component (`frontend/components/courts/favorite-button.tsx`) and its test file (`frontend/tests/favorite-button.test.tsx`) due to API errors on toggle. Cleaned up all usages in `frontend/app/courts/page.tsx` and `frontend/components/courts/court-image-gallery.tsx`. Backend model (`favorite.py`), repository (`favorite_repo.py`), and router (`/api/v1/favorites`) left intact for future re-enablement. (completed: 2026-06-20)

- [x] **Add Sidebar Nav Items to Header Dropdown** — Extended the user profile DropdownMenu in the public SiteHeader (`frontend/components/public/site-header.tsx`) with all sidebar navigation items from `nav-main.tsx`, organized by user role. Admin sees management (Courts, Bookings, Users, Payments, Messages), Reports, and System Settings sections. Manager sees Court Management (Courts, Schedule). Regular user sees Bookings (My Bookings, Payments). All roles get General section (Notifications, Profile) plus Logout. Dashboard link now routes to role-specific URL (`/dashboard/admin`/`/manager`/`/user`). (completed: 2026-06-20)

- [x] **Page Shift Fix on Popups (scroll-lock)** — Fixed horizontal page shift when Radix Select/Dialog/Sheet popups open, caused by `react-remove-scroll-bar` double-compensating with `margin-right` on body while `html` already has `scrollbar-gutter: stable`. CSS fix: `html body[data-scroll-locked] { margin-right: 0 !important; padding-right: 0 !important; overflow: visible !important; }` with higher specificity (0-2-1) to beat injected rules. Added `overflow: visible` to prevent Chrome from hiding `html`'s viewport scrollbar when body gets `overflow: hidden`. Changed `frontend/app/globals.css`. (completed: 2026-06-20)

- [x] **Redesign Court Pages** — Redesign 3 main court pages: public detail (`/courts/[id]`), management detail (`/dashboard/courts/[id]`), and create court (`/dashboard/courts/create`). Merge edit into management page with inline edit dialog. Modern UI matching admin user management aesthetic. (completed: 2026-06-20)

- [x] **Add Slot Calendar Component and Fix Documentation** — Added reusable `SlotCalendar` component for time slot display with Persian week navigation, day tabs, and slot list. Redesigned public court detail and dashboard edit pages with improved UI. Fixed frontend documentation discrepancies (users route path, middleware filename, test file listing). Added structure skill, reorganized docs/ directory, and added context pictures. Fixed ESLint React 19 hooks warnings across affected files. (completed: 2026-06-23)
