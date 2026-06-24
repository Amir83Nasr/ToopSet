// ---------------------------------------------------------------------------
// Booking status constants — shared across dashboard pages
// ---------------------------------------------------------------------------

/** Matches the Badge component's ``variant`` prop from class-variance-authority. */
type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link"

export const BOOKING_STATUS_LABELS: Record<
  string,
  { label: string; variant: BadgeVariant }
> = {
  pending_payment: { label: "در انتظار پرداخت", variant: "outline" },
  confirmed: { label: "تایید شده", variant: "default" },
  cancelled: { label: "لغو شده", variant: "secondary" },
}

/** Tailwind classes for inline status badges (used in table cells). */
export const BOOKING_STATUS_STYLES: Record<string, string> = {
  pending_payment: "bg-status-pending-bg text-status-pending",
  confirmed: "bg-status-confirmed-bg text-status-confirmed",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
}

// ---------------------------------------------------------------------------
// Payment status constants — shared across dashboard pages
// ---------------------------------------------------------------------------

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  success: "موفق",
  pending: "در انتظار",
  failed: "ناموفق",
}

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  success: "bg-status-confirmed-bg text-status-confirmed",
  pending: "bg-status-pending-bg text-status-pending",
  failed: "bg-status-cancelled-bg text-status-cancelled",
}
