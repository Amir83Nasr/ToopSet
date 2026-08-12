"use client"

import { useEffect, useMemo, useState } from "react"
import { toPersianDigits, toLocalDateStr } from "@/lib/utils"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import type { TimeSlot } from "@/components/vendors/vendor-shared"
import {
  type ManagerBooking,
  formatBookingDate,
  formatBookingTime,
  formatBookingWeekday,
  formatMoney,
  getPersianDayIndex,
  getTimeInputValue,
} from "@/components/vendors/dashboard/vendor-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"
import {
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Loader2,
  CalendarDays,
} from "lucide-react"

interface VendorBookingsTabProps {
  vendorId: number
  allSlots: TimeSlot[]
  bookings: ManagerBooking[]
  bookingsLoading: boolean
  weekLabel: string
  weekDays: Date[]
  onPrevWeek: () => void
  onNextWeek: () => void
  onThisWeek: () => void
  onRefresh: () => void
}

export function VendorBookingsTab({
  vendorId,
  allSlots,
  bookings,
  bookingsLoading,
  weekLabel,
  weekDays,
  onPrevWeek,
  onNextWeek,
  onThisWeek,
  onRefresh,
}: VendorBookingsTabProps) {
  const [selectedBookedSlot, setSelectedBookedSlot] = useState<TimeSlot | null>(
    null
  )
  const [selectedSlotHasStarted, setSelectedSlotHasStarted] = useState(false)
  const [cancellingBooking, setCancellingBooking] =
    useState<ManagerBooking | null>(null)
  const [cancellingLoading, setCancellingLoading] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [manualBookingSlot, setManualBookingSlot] = useState<TimeSlot | null>(
    null
  )
  const [managerBookingName, setManagerBookingName] = useState("")
  const [managerBookingPhone, setManagerBookingPhone] = useState("")
  const [managerBookingWeeks, setManagerBookingWeeks] = useState("1")
  const [manualBookingLoading, setManualBookingLoading] = useState(false)
  const [clock, setClock] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const bookingsBySlot = useMemo(() => {
    const map = new Map<number, ManagerBooking>()
    bookings.forEach((booking) => {
      if (booking.status !== "cancelled" && booking.status !== "expired") {
        map.set(booking.slot_id, booking)
      }
    })
    return map
  }, [bookings])

  const weekSlotsByDay = useMemo(() => {
    const groups = new Map<string, TimeSlot[]>()
    weekDays.forEach((day) => groups.set(toLocalDateStr(day), []))
    allSlots.forEach((slot) => {
      const key = toLocalDateStr(new Date(slot.start_time))
      const group = groups.get(key)
      if (group) group.push(slot)
    })
    groups.forEach((slots) =>
      slots.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    )
    return groups
  }, [allSlots, weekDays])

  function handleBookingSlotClick(slot: TimeSlot) {
    const booking = bookingsBySlot.get(slot.id)
    if (booking || slot.is_reserved || slot.status === "reserved") {
      setSelectedBookedSlot(slot)
      setSelectedSlotHasStarted(new Date(slot.start_time).getTime() <= clock)
      setCancellingBooking(booking ?? null)
      return
    }
    if (
      slot.status === "blocked" ||
      slot.status === "disabled" ||
      slot.status === "closed"
    ) {
      toast.error("این سانس قابل رزرو نیست")
      return
    }
    setManualBookingSlot(slot)
  }

  async function handleCancelBooking(bookingId: number, releaseSlot = true) {
    setCancellingLoading(true)
    try {
      await api(`/api/v1/manager/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          release_slot: releaseSlot,
          reason: cancelReason || undefined,
        }),
      })
      toast.success("رزرو لغو شد")
      setCancellingBooking(null)
      setSelectedBookedSlot(null)
      setCancelReason("")
      onRefresh()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در لغو رزرو"
      toast.error(msg)
    } finally {
      setCancellingLoading(false)
    }
  }

  async function handleManualSlotBooking() {
    if (!manualBookingSlot) return
    const weeks = Math.max(1, Number(managerBookingWeeks) || 1)
    const startDate = new Date(manualBookingSlot.start_time)
    const dateTo = new Date(startDate)
    dateTo.setDate(startDate.getDate() + (weeks - 1) * 7)

    setManualBookingLoading(true)
    try {
      await api("/api/v1/manager/bookings/recurring", {
        method: "POST",
        body: JSON.stringify({
          vendor_id: vendorId,
          full_name: managerBookingName,
          phone_number: managerBookingPhone,
          date_from: toLocalDateStr(startDate),
          date_to: toLocalDateStr(dateTo),
          days_of_week: [getPersianDayIndex(startDate)],
          start_time: getTimeInputValue(manualBookingSlot.start_time),
          end_time: getTimeInputValue(manualBookingSlot.end_time),
          allow_partial: true,
        }),
      })
      toast.success("رزرو سانس ثبت شد")
      setManualBookingSlot(null)
      setManagerBookingName("")
      setManagerBookingPhone("")
      setManagerBookingWeeks("1")
      onRefresh()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ثبت رزرو"
      toast.error(msg)
    } finally {
      setManualBookingLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button variant="outline" size="icon-sm" onClick={onPrevWeek}>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={onThisWeek}
          >
            این هفته
          </Button>
          <Button variant="outline" size="icon-sm" onClick={onNextWeek}>
            <ChevronLeft className="size-4" />
          </Button>
        </div>
        <div className="text-center text-sm font-medium sm:text-start">
          {weekLabel}
        </div>
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          onClick={onRefresh}
        >
          <RefreshCw className="me-1.5 size-4" />
          بروزرسانی
        </Button>
      </div>

      {/* Booking calendar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>رزروهای هفته</CardTitle>
          <CardDescription>
            روی سانس رزرو شده برای مشاهده اطلاعات و لغو کلیک کنید؛ روی سانس آزاد
            برای ثبت رزرو چند هفته‌ای کلیک کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          {bookingsLoading ? (
            <div className="grid gap-3 md:grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="-mx-2 overflow-x-auto px-2 pb-2 sm:mx-0 sm:px-0">
              <div className="grid snap-x snap-mandatory auto-cols-[minmax(16rem,88%)] grid-flow-col gap-3 md:min-w-280 md:grid-flow-row md:grid-cols-7">
                {weekDays.map((day) => {
                  const dayKey = toLocalDateStr(day)
                  const daySlots = weekSlotsByDay.get(dayKey) ?? []

                  return (
                    <section
                      key={dayKey}
                      className="flex min-h-105 snap-center flex-col rounded-lg border bg-muted/10"
                    >
                      <div className="border-b bg-card px-3 py-2">
                        <div className="text-sm font-semibold">
                          {day.toLocaleDateString("fa-IR", {
                            weekday: "long",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {toPersianDigits(
                            day.toLocaleDateString("fa-IR", {
                              month: "long",
                              day: "numeric",
                            })
                          )}
                        </div>
                      </div>

                      <div className="flex-1 space-y-2 p-2">
                        {daySlots.length === 0 ? (
                          <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-md border border-dashed px-3 text-center text-xs text-muted-foreground">
                            <CalendarDays className="size-5 text-muted-foreground/40" />
                            سانسی ثبت نشده
                          </div>
                        ) : (
                          daySlots.map((slot) => {
                            const booking = bookingsBySlot.get(slot.id)
                            const isBooked =
                              !!booking ||
                              slot.is_reserved ||
                              slot.status === "reserved" ||
                              slot.status === "reserving"
                            const blocked =
                              slot.status === "blocked" ||
                              slot.status === "disabled" ||
                              slot.status === "closed"
                            const statusLabel = blocked
                              ? "غیرفعال"
                              : isBooked
                                ? "رزرو شده"
                                : "آزاد"
                            const personName =
                              booking?.user_name ||
                              booking?.customer_full_name ||
                              "رزروکننده نامشخص"
                            const personPhone =
                              booking?.user_phone || booking?.customer_phone

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => handleBookingSlotClick(slot)}
                                className={`block w-full rounded-lg border p-3 text-right text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                  blocked
                                    ? "border-muted bg-muted/40 text-muted-foreground"
                                    : isBooked
                                      ? "border-destructive/30 bg-destructive/5"
                                      : "border-primary/30 bg-primary/5"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold whitespace-nowrap">
                                      {formatBookingTime(slot.start_time)} -{" "}
                                      {formatBookingTime(slot.end_time)}
                                    </div>
                                    <div className="mt-1 truncate text-muted-foreground">
                                      {isBooked && booking
                                        ? personName
                                        : formatMoney(slot.base_price)}
                                    </div>
                                  </div>
                                  <Badge
                                    variant={
                                      blocked
                                        ? "secondary"
                                        : isBooked
                                          ? "destructive"
                                          : "default"
                                    }
                                    className="shrink-0 text-[11px]"
                                  >
                                    {statusLabel}
                                  </Badge>
                                </div>

                                <div className="mt-3 grid gap-1 border-t pt-2 text-muted-foreground">
                                  {isBooked && booking ? (
                                    <>
                                      <div className="truncate">
                                        تماس:{" "}
                                        {personPhone
                                          ? toPersianDigits(personPhone)
                                          : "نامشخص"}
                                      </div>
                                      <div className="truncate">
                                        مبلغ: {formatMoney(booking.price_paid)}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div>
                                        قیمت سانس:{" "}
                                        {formatMoney(slot.base_price)}
                                      </div>
                                      {slot.ball_available && (
                                        <div>
                                          توپ: {formatMoney(slot.ball_price)}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking detail / cancel dialog */}
      <ResponsiveDialog
        open={!!selectedBookedSlot}
        mobileAsSheet={false}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBookedSlot(null)
            setCancellingBooking(null)
            setCancelReason("")
          }
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>جزئیات رزرو سانس</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              اطلاعات رزروکننده و عملیات لغو این سانس
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {selectedBookedSlot && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">تاریخ: </span>
                    {formatBookingDate(selectedBookedSlot.start_time)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">ساعت: </span>
                    {formatBookingTime(selectedBookedSlot.start_time)} -{" "}
                    {formatBookingTime(selectedBookedSlot.end_time)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">نام: </span>
                    {cancellingBooking?.user_name ||
                      cancellingBooking?.customer_full_name ||
                      "نامشخص"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">تماس: </span>
                    {cancellingBooking?.user_phone ||
                    cancellingBooking?.customer_phone
                      ? toPersianDigits(
                          cancellingBooking?.user_phone ||
                            cancellingBooking?.customer_phone ||
                            ""
                        )
                      : "نامشخص"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">نوع رزرو: </span>
                    {cancellingBooking?.source === "manager_manual"
                      ? "دستی سالندار"
                      : "آنلاین کاربر"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">مبلغ: </span>
                    {formatMoney(cancellingBooking?.price_paid ?? 0)}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">علت لغو</Label>
                <Textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="مثلاً تعمیرات، مشکل مجموعه، تعطیلی..."
                />
              </div>
              {selectedSlotHasStarted && (
                <p className="text-sm text-destructive">
                  زمان این سانس شروع شده یا گذشته است و دیگر قابل لغو نیست.
                </p>
              )}
            </div>
          )}
          <ResponsiveDialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedBookedSlot(null)
                setCancellingBooking(null)
              }}
            >
              بستن
            </Button>
            <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <Button
                variant="outline"
                disabled={
                  !cancellingBooking ||
                  cancellingLoading ||
                  selectedSlotHasStarted
                }
                onClick={() =>
                  cancellingBooking &&
                  handleCancelBooking(cancellingBooking.id, false)
                }
              >
                {cancellingLoading && (
                  <Loader2 className="me-1 size-4 animate-spin" />
                )}
                لغو بدون آزادسازی
              </Button>
              <Button
                variant="destructive"
                disabled={
                  !cancellingBooking ||
                  cancellingLoading ||
                  selectedSlotHasStarted
                }
                onClick={() =>
                  cancellingBooking &&
                  handleCancelBooking(cancellingBooking.id, true)
                }
              >
                {cancellingLoading && (
                  <Loader2 className="me-1 size-4 animate-spin" />
                )}
                لغو و آزادسازی
              </Button>
            </div>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Manual booking dialog */}
      <ResponsiveDialog
        open={!!manualBookingSlot}
        mobileAsSheet={false}
        onOpenChange={(open) => {
          if (!open) setManualBookingSlot(null)
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>رزرو سانس آزاد</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              رزرو توسط سالندار بدون پرداخت آنلاین ثبت می‌شود.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {manualBookingSlot && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className="font-medium">
                    {formatBookingWeekday(manualBookingSlot.start_time)}
                  </span>
                  <span className="text-muted-foreground">،</span>
                  <span>{formatBookingDate(manualBookingSlot.start_time)}</span>
                  <span className="text-muted-foreground">، ساعت</span>
                  <span dir="ltr">
                    {formatBookingTime(manualBookingSlot.start_time)} -{" "}
                    {formatBookingTime(manualBookingSlot.end_time)}
                  </span>
                </div>
                {(() => {
                  const weeks = Math.max(1, Number(managerBookingWeeks) || 1)
                  const start = new Date(manualBookingSlot.start_time)
                  const end = new Date(start)
                  end.setDate(start.getDate() + (weeks - 1) * 7)
                  return (
                    <div className="mt-1 text-xs text-muted-foreground">
                      بازه ثبت:{" "}
                      {toPersianDigits(start.toLocaleDateString("fa-IR"))} تا{" "}
                      {toPersianDigits(end.toLocaleDateString("fa-IR"))}
                    </div>
                  )
                })()}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manager-booking-name">نام کامل</Label>
                  <Input
                    id="manager-booking-name"
                    value={managerBookingName}
                    onChange={(e) => setManagerBookingName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager-booking-phone">شماره تماس</Label>
                  <Input
                    id="manager-booking-phone"
                    value={managerBookingPhone}
                    onChange={(e) => setManagerBookingPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager-booking-weeks">
                    تعداد هفته‌های رزرو
                  </Label>
                  <Input
                    id="manager-booking-weeks"
                    type="number"
                    min={1}
                    max={26}
                    value={managerBookingWeeks}
                    onChange={(e) => setManagerBookingWeeks(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              onClick={() => setManualBookingSlot(null)}
            >
              انصراف
            </Button>
            <Button
              disabled={
                manualBookingLoading ||
                !managerBookingName ||
                !managerBookingPhone
              }
              onClick={handleManualSlotBooking}
            >
              {manualBookingLoading && (
                <Loader2 className="me-1 size-4 animate-spin" />
              )}
              ثبت رزرو
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
