/**
 * Shared notification-type registry.
 *
 * Every type the backend emits (app/services/notification_service.py and
 * friends) maps to a Persian label, a badge color class, and a filter group.
 * Unknown types fall back to the raw type string so nothing renders broken.
 */

export type NotificationColor = "info" | "success" | "error" | "neutral"

interface NotificationTypeMeta {
  label: string
  color: NotificationColor
  group: string
}

export const NOTIFICATION_GROUPS = [
  "رزروها",
  "مالی",
  "نظرات",
  "حساب و مجموعه",
  "عمومی",
] as const

const NOTIFICATION_TYPES: Record<string, NotificationTypeMeta> = {
  // ── رزروها ──
  booking_created: { label: "رزرو جدید", color: "info", group: "رزروها" },
  booking_confirmed: { label: "تایید رزرو", color: "success", group: "رزروها" },
  booking_cancelled: { label: "لغو رزرو", color: "error", group: "رزروها" },
  booking_pending_replacement: {
    label: "در انتظار جایگزین",
    color: "info",
    group: "رزروها",
  },
  booking_replaced: {
    label: "جایگزینی رزرو",
    color: "success",
    group: "رزروها",
  },
  booking_failed: { label: "پرداخت ناموفق", color: "error", group: "رزروها" },
  booking_expired: { label: "انقضای رزرو", color: "error", group: "رزروها" },
  cancellation_withdrawn: {
    label: "انصراف از لغو",
    color: "success",
    group: "رزروها",
  },
  replacement_payment_failed: {
    label: "پرداخت جایگزین ناموفق",
    color: "error",
    group: "رزروها",
  },
  replacement_not_found: {
    label: "جایگزین پیدا نشد",
    color: "error",
    group: "رزروها",
  },
  slot_cancelled_by_manager: {
    label: "لغو سانس توسط مجموعه",
    color: "error",
    group: "رزروها",
  },

  // ── مالی ──
  refund_approved: { label: "تایید عودت", color: "success", group: "مالی" },
  refund_rejected: { label: "رد عودت", color: "error", group: "مالی" },
  refund_paid: { label: "پرداخت عودت", color: "success", group: "مالی" },
  settlement_approved: {
    label: "تایید تسویه",
    color: "success",
    group: "مالی",
  },
  settlement_rejected: { label: "رد تسویه", color: "error", group: "مالی" },
  settlement_paid: { label: "پرداخت تسویه", color: "success", group: "مالی" },

  // ── نظرات ──
  review_received: { label: "نظر جدید", color: "info", group: "نظرات" },
  review_response: { label: "پاسخ به نظر", color: "success", group: "نظرات" },

  // ── حساب و مجموعه ──
  role_changed: { label: "تغییر نقش", color: "info", group: "حساب و مجموعه" },
  account_activated: {
    label: "فعال‌سازی حساب",
    color: "success",
    group: "حساب و مجموعه",
  },
  account_deactivated: {
    label: "غیرفعال‌سازی حساب",
    color: "error",
    group: "حساب و مجموعه",
  },
  manager_request_approved: {
    label: "تایید درخواست مدیریت",
    color: "success",
    group: "حساب و مجموعه",
  },
  manager_request_rejected: {
    label: "رد درخواست مدیریت",
    color: "error",
    group: "حساب و مجموعه",
  },
  vendor_approved: {
    label: "تایید مجموعه",
    color: "success",
    group: "حساب و مجموعه",
  },
  vendor_rejected: {
    label: "رد مجموعه",
    color: "error",
    group: "حساب و مجموعه",
  },

  // ── عمومی ──
  broadcast: { label: "اعلان همگانی", color: "info", group: "عمومی" },
}

/** Persian label for a notification type; falls back to the raw value. */
export function notificationLabel(type: string): string {
  return NOTIFICATION_TYPES[type]?.label ?? type
}

/** Badge color class for a notification type. */
export function notificationColorClass(type: string): string {
  switch (NOTIFICATION_TYPES[type]?.color) {
    case "success":
      return "bg-notif-success-bg text-notif-success"
    case "error":
      return "bg-notif-error-bg text-notif-error"
    case "info":
      return "bg-notif-info-bg text-notif-info"
    default:
      return "bg-muted text-muted-foreground"
  }
}

/** Type options grouped by category, for the notifications filter select. */
export function notificationFilterGroups(): {
  group: string
  options: { value: string; label: string }[]
}[] {
  return NOTIFICATION_GROUPS.map((group) => ({
    group,
    options: Object.entries(NOTIFICATION_TYPES)
      .filter(([, meta]) => meta.group === group)
      .map(([value, meta]) => ({ value, label: meta.label })),
  })).filter((entry) => entry.options.length > 0)
}
