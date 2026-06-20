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

- [x] **Frontend Component Tests** — Add Vitest tests for key UI components (login/register forms, court card, court booking, reviews, site header, dashboard pages). Only 1 stub test currently exists. Vitest already configured with 60% coverage threshold. (completed: 2026-06-20)
