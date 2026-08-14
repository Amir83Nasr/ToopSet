import { toPersianDigits, formatPrice, formatPersianDate } from "@/lib/utils"

export function formatBookingDate(iso: string): string {
  return formatPersianDate(iso)
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
  return formatPrice(amount)
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

export type SettlementState =
  | "settled"
  | "pending_settlement"
  | "eligible"
  | "not_yet_eligible"

export type FinanceBooking = ManagerBooking & {
  settlement_state: SettlementState
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

export interface VendorSettlement {
  id: number
  vendor_id: number
  requested_amount: number
  gross_amount: number
  commission_amount: number
  status: string
  requested_at: string
  payment_tracking_code: string | null
}

export interface VendorSettlementItem {
  booking_id: number
  amount: number
  booking_status: string
  settlement_status: string
  slot_start_time: string
  slot_end_time: string
  customer_name: string
}

export interface VendorSettlementDetail extends VendorSettlement {
  manager_id: number
  approved_amount: number | null
  commission_percent: number
  gateway_fee: number
  bookings_count: number
  period_from: string | null
  period_to: string | null
  manager_note: string | null
  admin_note: string | null
  destination_card_masked: string | null
  destination_card_holder_name: string | null
  approved_at: string | null
  paid_at: string | null
  vendor_name: string
  manager_name: string
  items: VendorSettlementItem[]
}

export function settlementStateForBooking(booking: FinanceBooking): {
  label: string
  variant: "default" | "secondary" | "outline" | "destructive"
} {
  switch (booking.settlement_state) {
    case "settled":
      return { label: "تسویه شده", variant: "default" }
    case "pending_settlement":
      return { label: "در انتظار تسویه", variant: "outline" }
    case "eligible":
      return { label: "قابل تسویه", variant: "destructive" }
    case "not_yet_eligible":
      return {
        label: "غیرقابل تسویه (سانس هنوز پایان نیافته)",
        variant: "secondary",
      }
    default:
      return {
        label: booking.settlement_state
          ? `وضعیت نامشخص: ${booking.settlement_state}`
          : "وضعیت نامشخص",
        variant: "outline",
      }
  }
}
