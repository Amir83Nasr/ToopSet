"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SlotCard } from "./slot-card"
import {
  PERSIAN_DAY_NAMES,
  getWeekDays,
  getDateKey,
  groupSlotsByDateKey,
} from "./utils"
import type { TimeSlot } from "./types"

interface MobileDayViewProps {
  slots: TimeSlot[]
  weekStart?: Date
  onSlotDelete: (slot: TimeSlot) => void
  onSlotEdit?: (slot: TimeSlot) => void
  onAddSlot?: (date: Date) => void
}

export function MobileDayView({
  slots,
  weekStart,
  onSlotDelete,
  onSlotEdit,
  onAddSlot,
}: MobileDayViewProps) {
  const days = useMemo(() => getWeekDays(weekStart), [weekStart])
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date()
    return days.findIndex((d) => getDateKey(d) === getDateKey(today))
  })

  const currentIndex = selectedDayIndex === -1 ? 0 : selectedDayIndex
  const currentDay = days[currentIndex]
  const dateKey = getDateKey(currentDay)
  const grouped = useMemo(() => groupSlotsByDateKey(slots, days), [slots, days])
  const daySlots = grouped[dateKey] ?? []
  const todayKey = getDateKey(new Date())

  const goPrev = () => setSelectedDayIndex((i) => Math.max(0, i - 1))
  const goNext = () =>
    setSelectedDayIndex((i) => Math.min(days.length - 1, i + 1))

  // Convert days to swipe-friendly format
  const dayOptions = days.map((d, i) => ({
    index: i,
    label: `${PERSIAN_DAY_NAMES[i]} ${d.toLocaleDateString("fa-IR", { day: "numeric" })}`,
    isToday: getDateKey(d) === todayKey,
  }))

  return (
    <div className="space-y-3">
      {/* Day selector */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <ChevronRight className="size-5" />
        </Button>

        <div className="flex gap-1">
          {dayOptions.map((opt) => (
            <button
              key={opt.index}
              onClick={() => setSelectedDayIndex(opt.index)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                opt.index === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : opt.isToday
                    ? "text-primary"
                    : "text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={goNext}
          disabled={currentIndex === days.length - 1}
        >
          <ChevronLeft className="size-5" />
        </Button>
      </div>

      {/* Slots for selected day */}
      <div className="space-y-2">
        {daySlots.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <CalendarDays className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              هیچ زمانی برای این روز تعریف نشده
            </p>
            {onAddSlot && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddSlot(currentDay)}
              >
                <Plus className="ml-1 size-3.5" />
                افزودن زمان
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {daySlots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                onDelete={onSlotDelete}
                onEdit={onSlotEdit}
                compact
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
