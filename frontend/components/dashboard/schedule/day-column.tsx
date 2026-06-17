"use client"

import { PERSIAN_DAY_NAMES, formatPersianDate } from "./utils"
import { SlotCard } from "./slot-card"
import type { TimeSlot } from "./types"
import { CalendarDays } from "lucide-react"

interface DayColumnProps {
  day: Date
  dayIndex: number
  slots: TimeSlot[]
  isToday: boolean
  onSlotDelete: (slot: TimeSlot) => void
  onCellClick?: (day: Date) => void
}

export function DayColumn({
  day,
  dayIndex,
  slots,
  isToday,
  onSlotDelete,
  onCellClick,
}: DayColumnProps) {
  return (
    <div className="space-y-2">
      {/* Day header */}
      <div
        className={`rounded-lg border p-3 text-center ${
          isToday ? "border-primary/20 bg-primary/5" : "bg-muted/30"
        }`}
      >
        <div className="text-sm font-medium">{PERSIAN_DAY_NAMES[dayIndex]}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {formatPersianDate(day)}
        </div>
      </div>

      {/* Slot list */}
      <div className="min-h-32 space-y-2">
        {slots.length === 0 ? (
          <button
            onClick={() => onCellClick?.(day)}
            className="flex w-full items-center justify-center rounded-lg border border-dashed py-6 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            <CalendarDays className="ml-1 size-3.5" />
            بدون زمان
          </button>
        ) : (
          slots.map((slot) => (
            <SlotCard key={slot.id} slot={slot} onDelete={onSlotDelete} />
          ))
        )}
      </div>
    </div>
  )
}
