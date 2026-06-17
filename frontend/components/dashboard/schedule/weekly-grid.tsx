"use client"

import { useMemo } from "react"
import { DayColumn } from "./day-column"
import { MobileDayView } from "./mobile-day-view"
import { getWeekDays, getDateKey, groupSlotsByDateKey } from "./utils"
import type { TimeSlot } from "./types"

interface WeeklyGridProps {
  slots: TimeSlot[]
  weekStart?: Date
  onSlotDelete: (slot: TimeSlot) => void
  onCellClick?: (day: Date) => void
  onAddSlot?: (date: Date) => void
}

export function WeeklyGrid({
  slots,
  weekStart,
  onSlotDelete,
  onCellClick,
  onAddSlot,
}: WeeklyGridProps) {
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const groupedSlots = useMemo(
    () => groupSlotsByDateKey(slots, weekDays),
    [slots, weekDays]
  )
  const todayKey = getDateKey(new Date())

  return (
    <>
      {/* Desktop: 7-column grid */}
      <div className="hidden overflow-x-auto md:block">
        <div className="grid min-w-175 grid-cols-7 gap-3">
          {weekDays.map((day, dayIndex) => {
            const dateKey = getDateKey(day)
            return (
              <DayColumn
                key={dayIndex}
                day={day}
                dayIndex={dayIndex}
                slots={groupedSlots[dateKey] ?? []}
                isToday={todayKey === dateKey}
                onSlotDelete={onSlotDelete}
                onCellClick={onCellClick}
              />
            )
          })}
        </div>
      </div>

      {/* Mobile: day-centric view */}
      <div className="md:hidden">
        <MobileDayView
          slots={slots}
          weekStart={weekStart}
          onSlotDelete={onSlotDelete}
          onAddSlot={onAddSlot}
        />
      </div>
    </>
  )
}
