import type { DateRange } from "@daypicker/react"

import {
  formatPrice as libFormatPrice,
  type TimeSlot,
} from "@/components/vendors/vendor-shared"

export type { TimeSlot }

export const PERSIAN_DAY_NAMES = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
]

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatPrice(price: number): string {
  return libFormatPrice(price)
}

export function formatPersianDate(date: Date): string {
  return date.toLocaleDateString("fa-IR", {
    month: "long",
    day: "numeric",
  })
}

export function getDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA")
}

export function getPersianDayIndex(date: Date): number {
  return (date.getDay() + 1) % 7
}

export function formatWeekday(date: Date): string {
  return PERSIAN_DAY_NAMES[getPersianDayIndex(date)]
}

export function getWeekDays(from?: Date): Date[] {
  const today = from ?? new Date()
  const daysSinceSaturday = (today.getDay() + 1) % 7
  const saturday = new Date(today)
  saturday.setDate(today.getDate() - daysSinceSaturday)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(saturday)
    d.setDate(saturday.getDate() + i)
    return d
  })
}

export function getThisWeekRange(): DateRange {
  const today = new Date()
  const daysSinceSaturday = (today.getDay() + 1) % 7
  const saturday = new Date(today)
  saturday.setDate(today.getDate() - daysSinceSaturday)
  const friday = new Date(saturday)
  friday.setDate(saturday.getDate() + 6)
  return { from: saturday, to: friday }
}

// ── Weekly schedule item semantics (mirrors backend app/core/schedule.py) ──
// A slot belongs to the day whose night it opens: items starting before 03:00
// are the tail of the same row day's night, and end <= start means the slot
// crosses midnight into the next day.

export const SLOT_DAY_CUTOFF_MINUTES = 3 * 60
const DAY_MINUTES = 24 * 60

export function timeToMinutes(value: string): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5))
}

/** Items with a night start (before 03:00) sort last on their day row. */
export function nightSortRank(startTime: string): number {
  return timeToMinutes(startTime) < SLOT_DAY_CUTOFF_MINUTES ? 1 : 0
}

/** Slot duration in minutes; end <= start wraps past midnight. */
export function slotSpanMinutes(start: string, end: string): number {
  return (timeToMinutes(end) - timeToMinutes(start) + DAY_MINUTES) % DAY_MINUTES
}

/** Minutes after 03:00 — true start order across night items and wraps. */
export function slotOffsetMinutes(start: string): number {
  return (
    (timeToMinutes(start) - SLOT_DAY_CUTOFF_MINUTES + DAY_MINUTES) % DAY_MINUTES
  )
}

/** Whether two items on the same day row overlap on the 03:00-anchored timeline. */
export function slotRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const offsetA =
    (timeToMinutes(startA) - SLOT_DAY_CUTOFF_MINUTES + DAY_MINUTES) %
    DAY_MINUTES
  const offsetB =
    (timeToMinutes(startB) - SLOT_DAY_CUTOFF_MINUTES + DAY_MINUTES) %
    DAY_MINUTES
  return (
    offsetA < offsetB + slotSpanMinutes(startB, endB) &&
    offsetB < offsetA + slotSpanMinutes(startA, endA)
  )
}

/** True when the item happens after midnight of its row day. */
export function isAfterMidnightItem(start: string, end: string): boolean {
  return timeToMinutes(start) < SLOT_DAY_CUTOFF_MINUTES || end <= start
}
