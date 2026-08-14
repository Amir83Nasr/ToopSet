// ---------------------------------------------------------------------------
// Shared localization utilities — Persian (fa-IR)
//
// Every user-facing number, date, time, and currency value should use these
// helpers rather than formatting inline.  This keeps the rendering consistent
// and makes future locale changes a single edit.
// ---------------------------------------------------------------------------

import { toPersianDigits } from "@/lib/utils"

// ── Money / Currency ──────────────────────────────────────────

/**
 * Format an amount as Persian currency.
 *
 *     formatMoney(15000)     →  "۱۵٬۰۰۰ تومان"
 *     formatMoney(null)      →  "—"
 */
export function formatMoney(amount: number | null | undefined): string {
  if (amount == null) return "—"
  return `${toPersianDigits(new Intl.NumberFormat("fa-IR").format(amount))} تومانءء`
}

// ── Enum / Status translation ─────────────────────────────────

/** SMS delivery statuses from the backend */
const SMS_STATUS_LABELS: Record<string, string> = {
  sent: "ارسال شده",
  delivered: "تحویل شده",
  failed: "ناموفق",
  pending: "در انتظار",
  queued: "در صف",
}

/** Notification statuses from the backend */
const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  sent: "ارسال شده",
  delivered: "تحویل شده",
  failed: "ناموفق",
  pending: "در انتظار",
  read: "خوانده شده",
}

/** Translate an SMS status value to Persian. Falls back to the raw value. */
export function translateSmsStatus(status: string | null | undefined): string {
  if (!status) return "—"
  return SMS_STATUS_LABELS[status] ?? status
}

/** Translate a notification status value to Persian. Falls back to the raw value. */
export function translateNotificationStatus(
  status: string | null | undefined
): string {
  if (!status) return "—"
  return NOTIFICATION_STATUS_LABELS[status] ?? status
}
