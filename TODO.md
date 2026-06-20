# TODO

Updated: 2026-06-20

## Backlog

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

## Done

- [x] **Add Sidebar Nav Items to Header Dropdown** — Extended the user profile DropdownMenu in the public SiteHeader (`frontend/components/public/site-header.tsx`) with all sidebar navigation items from `nav-main.tsx`, organized by user role. Admin sees management (Courts, Bookings, Users, Payments, Messages), Reports, and System Settings sections. Manager sees Court Management (Courts, Schedule). Regular user sees Bookings (My Bookings, Payments). All roles get General section (Notifications, Profile) plus Logout. Dashboard link now routes to role-specific URL (`/dashboard/admin`/`/manager`/`/user`). (completed: 2026-06-20)

- [x] **Page Shift Fix on Popups (scroll-lock)** — Fixed horizontal page shift when Radix Select/Dialog/Sheet popups open, caused by `react-remove-scroll-bar` double-compensating with `margin-right` on body while `html` already has `scrollbar-gutter: stable`. CSS fix: `html body[data-scroll-locked] { margin-right: 0 !important; padding-right: 0 !important; overflow: visible !important; }` with higher specificity (0-2-1) to beat injected rules. Added `overflow: visible` to prevent Chrome from hiding `html`'s viewport scrollbar when body gets `overflow: hidden`. Changed `frontend/app/globals.css`. (completed: 2026-06-20)

- [x] **Redesign Court Pages** — Redesign 3 main court pages: public detail (`/courts/[id]`), management detail (`/dashboard/courts/[id]`), and create court (`/dashboard/courts/create`). Merge edit into management page with inline edit dialog. Modern UI matching admin user management aesthetic. (completed: 2026-06-20)
