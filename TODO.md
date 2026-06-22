# TODO

Updated: 2026-06-23

## Backlog

- [ ] **Optional Paid Amenities (e.g. Ball Rental)** — Allow court managers to configure optional paid amenities per court (e.g. ball rental, shoe rental) with a custom price for each. Amenities model currently stores JSON; extend it so managers can define which extras are available and at what cost via the court management UI.
- [ ] **Select Paid Amenities During Booking** — When booking, let users select from optional paid amenities (e.g. rent a ball). The selected extras' costs are added to the booking total. Display the breakdown in the booking summary and payment flow.

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

- [ ] Booking confirmation and payment flow (started: 2026-06-23)

- [ ] Add new time slot entries (started: 2026-06-23)

- [ ] Court profile section for manager dashboard (started: 2026-06-23)

- [ ] Time slot display tables (started: 2026-06-23)

- [ ] Dashboard settings section (started: 2026-06-23)

- [ ] Logo fix and update (started: 2026-06-23)

- [ ] Add app screenshots (started: 2026-06-23)

- [ ] Add images and logo to README.md (started: 2026-06-23)

- [ ] Profile page layout (started: 2026-06-23)

## Done

- [x] **Update Seed Data with Timezone-Aware Time Slots and Court Ratings** — Fixed `backend/scripts/seed.py` to use timezone-aware datetimes (`now_iran()` / `iran_to_utc()`) for time slot generation, covering 60 future days with 5 fixed daily schedules per court (total 4,500 slots). Added `court.average_rating` calculation with SQL aggregation after review creation. Added 16 new review entries to ensure all 15 courts have at least 1-2 ratings. Fixed duplicate `booking_id` issue in review matching with `used_booking_ids` tracking. Ran seed to populate database with proper ratings (3.0–5.0 range) and future-dated slots. (completed: 2026-06-20)

- [x] **Remove Favorites System from Frontend** — Deleted the `FavoriteButton` component (`frontend/components/courts/favorite-button.tsx`) and its test file (`frontend/tests/favorite-button.test.tsx`) due to API errors on toggle. Cleaned up all usages in `frontend/app/courts/page.tsx` and `frontend/components/courts/court-image-gallery.tsx`. Backend model (`favorite.py`), repository (`favorite_repo.py`), and router (`/api/v1/favorites`) left intact for future re-enablement. (completed: 2026-06-20)

- [x] **Add Sidebar Nav Items to Header Dropdown** — Extended the user profile DropdownMenu in the public SiteHeader (`frontend/components/public/site-header.tsx`) with all sidebar navigation items from `nav-main.tsx`, organized by user role. Admin sees management (Courts, Bookings, Users, Payments, Messages), Reports, and System Settings sections. Manager sees Court Management (Courts, Schedule). Regular user sees Bookings (My Bookings, Payments). All roles get General section (Notifications, Profile) plus Logout. Dashboard link now routes to role-specific URL (`/dashboard/admin`/`/manager`/`/user`). (completed: 2026-06-20)

- [x] **Page Shift Fix on Popups (scroll-lock)** — Fixed horizontal page shift when Radix Select/Dialog/Sheet popups open, caused by `react-remove-scroll-bar` double-compensating with `margin-right` on body while `html` already has `scrollbar-gutter: stable`. CSS fix: `html body[data-scroll-locked] { margin-right: 0 !important; padding-right: 0 !important; overflow: visible !important; }` with higher specificity (0-2-1) to beat injected rules. Added `overflow: visible` to prevent Chrome from hiding `html`'s viewport scrollbar when body gets `overflow: hidden`. Changed `frontend/app/globals.css`. (completed: 2026-06-20)

- [x] **Redesign Court Pages** — Redesign 3 main court pages: public detail (`/courts/[id]`), management detail (`/dashboard/courts/[id]`), and create court (`/dashboard/courts/create`). Merge edit into management page with inline edit dialog. Modern UI matching admin user management aesthetic. (completed: 2026-06-20)

- [x] **Add Slot Calendar Component and Fix Documentation** — Added reusable `SlotCalendar` component for time slot display with Persian week navigation, day tabs, and slot list. Redesigned public court detail and dashboard edit pages with improved UI. Fixed frontend documentation discrepancies (users route path, middleware filename, test file listing). Added structure skill, reorganized docs/ directory, and added context pictures. Fixed ESLint React 19 hooks warnings across affected files. (completed: 2026-06-23)
