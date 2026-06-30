export interface Vendor {
  id: number
  name: string
}

export interface TimeSlot {
  id: number
  vendor_id: number
  start_time: string
  end_time: string
  base_price: number
  is_reserved: boolean
  version: number
}

export interface TimeSlotTemplate {
  start_time: string
  end_time: string
  base_price: string
}

export interface ScheduleTemplate {
  id: string
  name: string
  days: boolean[]
  templates: TimeSlotTemplate[]
  createdAt: string
}

export interface BulkGeneratePayload {
  date_from: string
  date_to: string
  days_of_week: number[]
  templates: { start_time: string; end_time: string; base_price: number }[]
}

export type SlotStatus = "available" | "reserved" | "past"
