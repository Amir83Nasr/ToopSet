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
