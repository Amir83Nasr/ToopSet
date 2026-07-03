export interface Booking {
  id: number
  user_id: number
  slot_id: number
  status:
    | "pending_payment"
    | "confirmed"
    | "pending_cancellation"
    | "transferred"
    | "cancelled"
    | "expired"
  source?: "online" | "manager_manual"
  settlement_status?: string
  customer_full_name?: string | null
  customer_phone?: string | null
  price_paid: number
  penalty_amount: number | null
  participants_count: number
  created_at: string
  updated_at: string
}

export interface BookingDetail extends Booking {
  vendor_name: string
  vendor_address: string
  slot_start_time: string | null
  slot_end_time: string | null
  payment: { id: number; status: string } | null
  refund_status: string | null
  refund_amount: number | null
  refund_paid_at: string | null
}

export interface BookingCancellationTerms {
  booking_id: number
  can_cancel: boolean
  requires_bank_card: boolean
  has_verified_bank_card: boolean
  mode: string
  refund_amount: number
  penalty_amount: number
  rules: string[]
  blocking_reason: string | null
}
