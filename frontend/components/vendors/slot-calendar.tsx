"use client"

import { useMemo, useState } from "react"
import { formatTime, formatPrice, type TimeSlot } from "./vendor-shared"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { toPersianDigits } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  CalendarDays,
  Calendar,
  Clock,
} from "lucide-react"

/* ── Helpers ── */

/** Get the Saturday (start of Persian week) for a given date */
function saturdayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun … 6=Sat
  d.setDate(d.getDate() - ((day + 1) % 7))
  return d
}

/** Check if a date string matches today in local time */
function isToday(dateStr: string): boolean {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, "0")
  const d = String(today.getDate()).padStart(2, "0")
  return dateStr === `${y}-${m}-${d}`
}

/** Format a date to Persian day+number+month */
function formatDayTab(dateStr: string): {
  dayName: string
  dayNum: string
  month: string
} {
  const d = new Date(dateStr + "T12:00:00")
  return {
    dayName: d.toLocaleDateString("fa-IR", { weekday: "short" }),
    dayNum: d.toLocaleDateString("fa-IR", { day: "numeric" }),
    month: d.toLocaleDateString("fa-IR", { month: "short" }),
  }
}

interface DayTab {
  dateStr: string
  dayName: string
  dayNum: string
  month: string
  today: boolean
}

/* ── Props ── */

export interface SlotCalendarProps {
  slots: TimeSlot[]
  loading?: boolean
  canManage?: boolean
  onSlotClick?: (slot: TimeSlot) => void
  onSlotDelete?: (slot: TimeSlot) => void
  title?: string
  className?: string
}

/* ── Component ── */

export function SlotCalendar({
  slots,
  loading = false,
  canManage = false,
  onSlotClick,
  onSlotDelete,
  title,
  className,
}: SlotCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [now] = useState(Date.now)
  // Default to today's date so visitors see current day slots on first load
  const [selectedDate, setSelectedDate] = useState(() => {
    const t = new Date()
    const y = t.getFullYear()
    const m = String(t.getMonth() + 1).padStart(2, "0")
    const d = String(t.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  })

  // ── Compute the 7 days of the current week ──

  const weekStart = useMemo(() => {
    const base = new Date()
    base.setDate(base.getDate() + weekOffset * 7)
    return saturdayOfWeek(base)
  }, [weekOffset])

  const weekDays: DayTab[] = useMemo(() => {
    const days: DayTab[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      const dateStr = `${y}-${m}-${dd}`
      const h = formatDayTab(dateStr)
      days.push({
        dateStr,
        dayName: h.dayName,
        dayNum: h.dayNum,
        month: h.month,
        today: isToday(dateStr),
      })
    }
    return days
  }, [weekStart])

  // Derived selected date — falls back to first day when selection is invalid
  const effectiveDate =
    selectedDate && weekDays.find((d) => d.dateStr === selectedDate)
      ? selectedDate
      : weekDays[0]?.dateStr || ""

  // ── Slots for the selected day ──

  const slotsForDay = useMemo(() => {
    return slots
      .filter((s) => s.start_time.startsWith(effectiveDate))
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [slots, effectiveDate])

  const totalSlots = slots.length

  // ── Week label ──

  const weekLabel = useMemo(() => {
    if (weekDays.length < 7) return ""
    const first = weekDays[0]
    const last = weekDays[6]
    if (first.month === last.month) {
      return `${first.dayNum} ${first.month} — ${last.dayNum} ${last.month}`
    }
    return `${first.dayNum} ${first.month} — ${last.dayNum} ${last.month}`
  }, [weekDays])

  // ── Loading skeleton ──

  if (loading) {
    return (
      <div className={`rounded-xl border bg-card shadow-sm ${className || ""}`}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex border-b">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-1 flex-col items-center gap-1 px-2 py-3"
            >
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-5 w-6" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
        <div className="space-y-2 p-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  // ── Empty state ──

  if (!loading && slots.length === 0) {
    return (
      <div
        className={`flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card py-14 text-center shadow-sm ${className || ""}`}
      >
        <div className="rounded-full bg-muted/40 p-4">
          <CalendarDays className="size-8 text-muted-foreground/40" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground/80">
            هیچ سانسی ثبت نشده
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {canManage
              ? "از دکمه افزودن سانس استفاده کنید"
              : "برای این مجموعه هنوز سانسی تعریف نشده"}
          </p>
        </div>
      </div>
    )
  }

  // ── Render ──

  const selectedTabInfo = weekDays.find((d) => d.dateStr === effectiveDate)

  return (
    <div className={`rounded-xl border bg-card shadow-sm ${className || ""}`}>
      {/* ── Navigation header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 shrink-0 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground/90">
            {title && <span className="ml-1">{title}</span>}
            هفته · {weekLabel}
          </h4>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="gap-1.5 px-2.5 text-xs font-normal"
          >
            <span className="text-muted-foreground">
              {toPersianDigits(totalSlots)}
            </span>
            <span className="text-muted-foreground/60">سانس</span>
          </Badge>
          <div className="flex items-center gap-0.5">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => setWeekOffset((o) => o - 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => setWeekOffset((o) => o + 1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Day tab bar ── */}
      <div className="flex border-b">
        {weekDays.map((day) => {
          const active = day.dateStr === effectiveDate
          return (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDate(day.dateStr)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-center transition-colors ${
                active
                  ? "border-b-2 border-primary text-foreground"
                  : "border-b-2 border-transparent text-muted-foreground hover:border-muted-foreground/20 hover:text-foreground"
              }`}
            >
              <span className="text-[10px] leading-none font-medium">
                {day.dayName}
              </span>
              <span className="text-base leading-tight font-bold">
                {day.dayNum}
              </span>
              <span className="text-[9px] leading-none text-muted-foreground">
                {day.month}
              </span>
              {day.today && (
                <span className="mt-0.5 rounded-full bg-primary/10 px-1.5 py-px text-[7px] leading-none font-semibold text-primary">
                  امروز
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Slots table ── */}
      {slotsForDay.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-muted">
            <Clock className="size-5 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/80">
              سانسی برای این روز موجود نیست
            </p>
            {selectedTabInfo && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                روز {selectedTabInfo.dayName} {selectedTabInfo.dayNum}{" "}
                {selectedTabInfo.month} سانسی ندارد
              </p>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Table header */}
          <div className="flex items-center border-b bg-muted/20 px-4 py-2.5">
            <span className="w-20 text-xs font-medium text-muted-foreground">
              روز
            </span>
            <span className="flex-1 text-xs font-medium text-muted-foreground">
              زمان
            </span>
            {(canManage || onSlotClick) && (
              <span className="w-28 text-center text-xs font-medium text-muted-foreground">
                قیمت
              </span>
            )}
            <span className="w-24 text-center text-xs font-medium text-muted-foreground">
              وضعیت
            </span>
            {canManage && onSlotDelete && (
              <span className="w-12 text-center text-xs font-medium text-muted-foreground" />
            )}
          </div>

          {/* Slot rows */}
          <div className="divide-y">
            {slotsForDay.map((slot) => {
              const reserved = slot.is_reserved
              const past = new Date(slot.start_time).getTime() <= now
              const disabled = reserved || past
              const slotDay = new Date(slot.start_time).toLocaleDateString(
                "fa-IR",
                { weekday: "long" }
              )
              return (
                <div
                  key={slot.id}
                  onClick={() => !disabled && onSlotClick?.(slot)}
                  className={`flex items-center px-4 py-3 text-right transition-colors ${
                    disabled
                      ? "opacity-40"
                      : onSlotClick
                        ? "cursor-pointer hover:bg-muted/10"
                        : ""
                  }`}
                >
                  <div className="w-20 text-xs font-medium text-muted-foreground">
                    {slotDay}
                  </div>
                  {/* Time */}
                  <div className="flex flex-1 items-center gap-3">
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        disabled
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Clock className="size-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatTime(slot.start_time)}
                      <span className="mx-1.5 text-muted-foreground/20">—</span>
                      {formatTime(slot.end_time)}
                    </p>
                  </div>

                  {/* Price */}
                  {(canManage || onSlotClick) && (
                    <div className="w-28 text-center">
                      <span
                        className={`text-sm font-bold ${
                          disabled ? "text-muted-foreground" : "text-primary"
                        }`}
                      >
                        {formatPrice(slot.base_price)}
                      </span>
                    </div>
                  )}

                  {/* Status */}
                  <div className="w-24 text-center">
                    {past ? (
                      <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[10px] font-semibold text-muted-foreground">
                        گذشته
                      </span>
                    ) : reserved ? (
                      <span className="inline-flex h-6 items-center rounded-full bg-red-50 px-2.5 text-[10px] font-semibold text-red-600 dark:bg-red-950 dark:text-red-400">
                        رزرو شده
                      </span>
                    ) : (
                      <span className="inline-flex h-6 items-center rounded-full border border-emerald-200 bg-emerald-50/60 px-2.5 text-[10px] font-semibold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                        آزاد
                      </span>
                    )}
                  </div>

                  {/* Delete (managers only) */}
                  {canManage && onSlotDelete && !disabled && (
                    <div className="w-12 text-center">
                      <Button
                        variant="destructive"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSlotDelete(slot)
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
