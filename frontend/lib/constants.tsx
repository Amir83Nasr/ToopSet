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
  pending_cancellation: { label: "در انتظار لغو", variant: "outline" },
  transferred: { label: "جایگزین شده", variant: "secondary" },
  cancelled: { label: "لغو شده", variant: "secondary" },
  expired: { label: "منقضی شده", variant: "secondary" },
}

/** Tailwind classes for inline status badges (used in table cells). */
export const BOOKING_STATUS_STYLES: Record<string, string> = {
  pending_payment: "bg-status-pending-bg text-status-pending",
  confirmed: "bg-status-confirmed-bg text-status-confirmed",
  pending_cancellation: "bg-status-pending-bg text-status-pending",
  transferred: "bg-muted text-muted-foreground",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
  expired: "bg-muted text-muted-foreground",
}

// ---------------------------------------------------------------------------
// Payment status constants — shared across dashboard pages
// ---------------------------------------------------------------------------

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  success: "موفق",
  pending: "در انتظار",
  failed: "ناموفق",
  expired: "منقضی شده",
}

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  success: "bg-status-confirmed-bg text-status-confirmed",
  pending: "bg-status-pending-bg text-status-pending",
  failed: "bg-status-cancelled-bg text-status-cancelled",
  expired: "bg-muted text-muted-foreground",
}
