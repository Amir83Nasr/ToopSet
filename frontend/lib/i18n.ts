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
  return `${toPersianDigits(new Intl.NumberFormat("fa-IR").format(amount))} تومان`
}

// ── Date / Time ───────────────────────────────────────────────

const FA_LOCALE = "fa-IR"
const TEHRAN_TZ = "Asia/Tehran"

/** e.g. "۱۴۰۴/۴/۱۸" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(FA_LOCALE)
}

/** e.g. "پنجشنبه, ۱۸ تیر ۱۴۰۴" */
export function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString(FA_LOCALE, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/** e.g. "پنجشنبه" */
export function formatWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString(FA_LOCALE, { weekday: "long" })
}

/** e.g. "۱۴:۳۰" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(FA_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** e.g. "۱۸ تیر" */
export function formatShortDate(iso: string): {
  dayNum: string
  month: string
} {
  const d = new Date(iso)
  return {
    dayNum: d.toLocaleDateString(FA_LOCALE, { day: "numeric" }),
    month: d.toLocaleDateString(FA_LOCALE, { month: "short" }),
  }
}

/** e.g. "۱۴۰۴/۴/۱۸, ۱۴:۳۰" */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`
}

/**
 * Like formatDate but explicitly in Tehran timezone.
 * Use when the API date string may lack timezone info.
 */
export function formatDateTehran(iso: string): string {
  const normalized = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z"
  return new Date(normalized).toLocaleDateString(FA_LOCALE, {
    timeZone: TEHRAN_TZ,
  })
}

export function formatTimeTehran(iso: string): string {
  const normalized = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z"
  return new Date(normalized).toLocaleTimeString(FA_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TEHRAN_TZ,
  })
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

// ── Booking status helpers (re-exports from constants for convenience) ──

export {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/constants"
