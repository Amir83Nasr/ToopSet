import type { DateRange } from "@daypicker/react"
import type { TimeSlot, TimeSlotTemplate } from "./types"

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
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان"
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

export function getSlotDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA")
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

export function isSlotPast(slot: TimeSlot): boolean {
  return new Date(slot.end_time) < new Date()
}

export function getSlotStatus(
  slot: TimeSlot
): "available" | "reserved" | "past" {
  if (isSlotPast(slot)) return "past"
  if (slot.is_reserved) return "reserved"
  return "available"
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

export function getNextWeekRange(): DateRange {
  const thisWeek = getThisWeekRange()
  const nextSaturday = new Date(thisWeek.from!)
  nextSaturday.setDate(nextSaturday.getDate() + 7)
  const nextFriday = new Date(nextSaturday)
  nextFriday.setDate(nextSaturday.getDate() + 6)
  return { from: nextSaturday, to: nextFriday }
}

export function getThirtyDayRange(): DateRange {
  const today = new Date()
  const end = new Date(today)
  end.setDate(today.getDate() + 30)
  return { from: today, to: end }
}

export function groupSlotsByDateKey(
  slots: TimeSlot[],
  weekDays: Date[]
): Record<string, TimeSlot[]> {
  const groups: Record<string, TimeSlot[]> = {}
  weekDays.forEach((d) => {
    groups[getDateKey(d)] = []
  })
  slots.forEach((slot) => {
    const key = getSlotDateKey(slot.start_time)
    if (groups[key]) groups[key].push(slot)
  })
  Object.values(groups).forEach((daySlots) => {
    daySlots.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
  })
  return groups
}

export function calculatePreviewCount(
  selectedDays: boolean[],
  dateRange: DateRange | undefined,
  templates: TimeSlotTemplate[]
): number {
  const selectedDayCount = selectedDays.filter(Boolean).length
  if (selectedDayCount === 0 || !dateRange?.from || !dateRange?.to) return 0

  const from = dateRange.from
  const to = dateRange.to
  if (to < from) return 0
  const diffDays =
    Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1

  const totalDays = new Array(diffDays).fill(0).filter((_, i) => {
    const d = new Date(from)
    d.setDate(from.getDate() + i)
    const jsDay = d.getDay()
    const persianIdx = (jsDay + 1) % 7
    return selectedDays[persianIdx]
  }).length

  const validTemplates = templates.filter(
    (t) => t.start_time && t.end_time && t.base_price
  ).length
  return totalDays * validTemplates
}

// Generate a template from existing slots (for "تمدید خودکار هفته")
export function extractTemplateFromSlots(slots: TimeSlot[]): {
  days: boolean[]
  templates: TimeSlotTemplate[]
} {
  // Group slots by day of week
  const daySets: Record<number, Set<string>> = {}
  const templateMap = new Map<string, TimeSlotTemplate>()

  slots.forEach((slot) => {
    const d = new Date(slot.start_time)
    const jsDay = d.getDay()
    const persianIdx = (jsDay + 1) % 7
    if (!daySets[persianIdx]) daySets[persianIdx] = new Set()
    daySets[persianIdx].add("x")

    const start = slot.start_time.slice(11, 16)
    const end = slot.end_time.slice(11, 16)
    const key = `${start}-${end}-${slot.base_price}`
    if (!templateMap.has(key)) {
      templateMap.set(key, {
        start_time: start,
        end_time: end,
        base_price: slot.base_price.toString(),
      })
    }
  })

  const days = Array.from({ length: 7 }, (_, i) => !!daySets[i])
  const templates = Array.from(templateMap.values())
  return { days, templates }
}
