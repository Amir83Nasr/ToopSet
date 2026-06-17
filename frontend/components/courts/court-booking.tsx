"use client"

import { useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, CalendarDays, CheckCircle2 } from "lucide-react"
import { toPersianDigits } from "@/lib/utils"
import {
  formatTime,
  formatPrice,
  type TimeSlot,
} from "@/components/courts/court-shared"

interface CourtBookingProps {
  slots: TimeSlot[]
  slotsLoading: boolean
  selectedDate: string
  onDateSelect: (date: string) => void
  selectedSlot: TimeSlot | null
  onSlotSelect: (slot: TimeSlot) => void
  isAuthenticated: boolean
  onBook: (slot: TimeSlot) => void
}

const PERSIAN_DAY_NAMES = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
]

function getPersianDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  const dayOfWeek = d.getDay()
  const dayName = PERSIAN_DAY_NAMES[dayOfWeek === 6 ? 0 : dayOfWeek + 1] || ""
  const dayNum = d.toLocaleDateString("fa-IR", { day: "numeric" })
  const month = d.toLocaleDateString("fa-IR", { month: "short" })
  const isToday = dateStr === new Date().toLocaleDateString("en-CA")
  return { dayName, dayNum, month, isToday }
}

export function CourtBooking({
  slots,
  slotsLoading,
  selectedDate,
  onDateSelect,
  selectedSlot,
  onSlotSelect,
  isAuthenticated,
  onBook,
}: CourtBookingProps) {
  const dates = useMemo(() => {
    const result: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      result.push(d.toLocaleDateString("en-CA"))
    }
    return result
  }, [])

  return (
    <div className="rounded-2xl border bg-card/80 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md">
      <div className="border-b bg-gradient-to-r from-primary/5 via-transparent to-transparent px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Calendar className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">انتخاب سانس</h3>
            <p className="text-xs text-muted-foreground">
              تاریخ و ساعت مورد نظر را انتخاب کنید
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* Date selector */}
        <div className="mb-5">
          <p className="mb-2.5 text-xs font-medium text-muted-foreground">
            تاریخ
          </p>
          <div className="flex scrollbar-none gap-2 overflow-x-auto pb-1">
            {dates.map((date) => {
              const { dayName, dayNum, month, isToday } = getPersianDate(date)
              return (
                <button
                  key={date}
                  onClick={() => onDateSelect(date)}
                  className={`flex min-w-[84px] shrink-0 flex-col items-center gap-1 rounded-xl border-2 py-3 text-sm transition-all ${
                    selectedDate === date
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "border-border/50 bg-background/40 hover:border-primary/40 hover:bg-muted/30 hover:shadow-sm"
                  }`}
                >
                  <span
                    className={`text-[11px] font-medium ${
                      selectedDate === date
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    }`}
                  >
                    {dayName}
                  </span>
                  <span className="text-lg leading-none font-bold">
                    {dayNum}
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      selectedDate === date
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    }`}
                  >
                    {isToday ? "امروز" : month}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Slots */}
        {slotsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <CalendarDays className="size-7 opacity-50" />
            </div>
            <div>
              <p className="text-sm font-medium">سانسی موجود نیست</p>
              <p className="mt-1 text-xs opacity-70">تاریخ دیگری انتخاب کنید</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              {toPersianDigits(slots.length)} سانس موجود
            </p>
            <div className="space-y-3">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id
                return (
                  <button
                    key={slot.id}
                    onClick={() => !slot.is_reserved && onSlotSelect(slot)}
                    disabled={slot.is_reserved}
                    className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-right transition-all ${
                      slot.is_reserved
                        ? "border-destructive/30 bg-destructive/5 opacity-60 dark:border-destructive/20"
                        : isSelected
                          ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                          : "border-border/50 bg-background/40 hover:border-primary/40 hover:bg-muted/20 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex size-12 items-center justify-center rounded-xl ${
                          slot.is_reserved
                            ? "bg-red-100 text-red-500 dark:bg-red-900/20"
                            : isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-green-100 text-green-600 dark:bg-green-900/20"
                        }`}
                      >
                        <Clock className="size-5" />
                      </div>
                      <div className="text-right">
                        <p className="text-base leading-tight font-semibold">
                          {formatTime(slot.start_time)}
                          <span className="mx-1.5 text-muted-foreground/40">
                            —
                          </span>
                          {formatTime(slot.end_time)}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-primary">
                          {formatPrice(slot.base_price)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        slot.is_reserved
                          ? "secondary"
                          : isSelected
                            ? "default"
                            : "outline"
                      }
                      className={`shrink-0 px-3 py-1 text-[11px] ${
                        slot.is_reserved
                          ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          : isSelected
                            ? ""
                            : "border-primary/30 text-green-600 dark:border-primary/30"
                      }`}
                    >
                      {slot.is_reserved
                        ? "رزرو شده"
                        : isSelected
                          ? "انتخاب شد"
                          : "آزاد"}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Booking CTA */}
        {selectedSlot && !selectedSlot.is_reserved && (
          <div className="mt-6 space-y-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                مبلغ قابل پرداخت
              </span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(selectedSlot.base_price)}
              </span>
            </div>
            <Button
              className="h-12 w-full text-base font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
              size="lg"
              onClick={() => onBook(selectedSlot)}
            >
              <CheckCircle2 className="me-2 size-5" />
              {isAuthenticated ? "رزرو کن" : "ورود و رزرو"}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              پس از رزرو می‌توانید در صفحه رزروها وضعیت را پیگیری کنید
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
