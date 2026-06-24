export interface Booking {
  id: number
  user_id: number
  slot_id: number
  status: "pending_payment" | "confirmed" | "cancelled"
  price_paid: number
  penalty_amount: number | null
  participants_count: number
  created_at: string
  updated_at: string
}

export interface BookingDetail extends Booking {
  court_name: string
  court_address: string
  slot_start_time: string | null
  slot_end_time: string | null
  payment: { id: number; status: string } | null
}
