import { toPersianDigits } from "@/lib/utils"

export function formatBookingDate(iso: string): string {
  return toPersianDigits(new Date(iso).toLocaleDateString("fa-IR"))
}

export function formatBookingWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR", { weekday: "long" })
}

export function formatBookingTime(iso: string): string {
  return toPersianDigits(
    new Date(iso).toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  )
}

export function getTimeInputValue(iso: string): string {
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`
}

export function getPersianDayIndex(date: Date): number {
  return (date.getDay() + 1) % 7
}

export function formatMoney(amount: number): string {
  return `${toPersianDigits(new Intl.NumberFormat("fa-IR").format(amount))} تومان`
}

export interface ManagerBooking {
  id: number
  user_id: number
  slot_id: number
  status: string
  source?: string
  settlement_status?: string
  customer_full_name?: string | null
  customer_phone?: string | null
  price_paid: number
  penalty_amount: number | null
  created_at: string
  updated_at: string
  expires_at: string | null
  vendor_name: string
  vendor_address: string
  user_name: string
  user_phone?: string
  slot_start_time: string | null
  slot_end_time: string | null
}

export interface FinanceSummary {
  total_online_revenue: number
  successful_online_bookings: number
  settled_bookings: number
  settlement_requested_bookings: number
  available_for_settlement_bookings: number
  not_due_bookings: number
  manual_bookings: number
  settlement_requested_amount: number
  settled_amount: number
  available_for_settlement: number
}

export function settlementStateForBooking(booking: ManagerBooking): {
  label: string
  variant: "default" | "secondary" | "outline" | "destructive"
} {
  if (booking.source !== "online" || booking.status !== "confirmed") {
    return { label: "غیرقابل تسویه", variant: "secondary" }
  }
  if (booking.slot_end_time && new Date(booking.slot_end_time) > new Date()) {
    return { label: "هنوز موعد سانس نرسیده", variant: "outline" }
  }
  switch (booking.settlement_status) {
    case "settled":
      return { label: "تسویه شده", variant: "default" }
    case "settlement_requested":
    case "included_in_settlement":
      return { label: "در جریان تسویه", variant: "outline" }
    case "not_settled":
      return { label: "قابل تسویه", variant: "destructive" }
    default:
      return { label: "تسویه نشده", variant: "secondary" }
  }
}
