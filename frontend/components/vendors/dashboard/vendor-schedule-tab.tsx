"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { TimeSlot } from "@/components/vendors/vendor-shared"
import { formatPrice, formatTime } from "@/components/vendors/vendor-shared"
import {
  type ManagerBooking,
  formatBookingDate,
  formatBookingTime,
  formatMoney,
  getPersianDayIndex,
  getTimeInputValue,
} from "@/components/vendors/dashboard/vendor-utils"
import { api, ApiError } from "@/lib/api"
import { toEnglishDigits, toLocalDateStr, toPersianDigits } from "@/lib/utils"
import { toast } from "@/lib/toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogDescription as DialogDescription,
  ResponsiveDialogFooter as DialogFooter,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from "@/components/ui/responsive-dialog"
import {
  formatWeekday,
  getDateKey,
  getWeekDays,
  PERSIAN_DAY_NAMES,
} from "@/components/dashboard/schedule/utils"
import { WeeklyScheduleEditor } from "@/components/dashboard/schedule/weekly-schedule-editor"
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Pencil,
  Power,
  RefreshCw,
  UserPlus,
  XCircle,
} from "lucide-react"

interface WeeklyScheduleItem {
  day_of_week: number
  start_time: string
  end_time: string
  base_price: number | string
  gender: "male" | "female"
}

interface WeeklyTemplateResponse {
  source: "saved_version" | "upcoming_week"
  version_id?: number
  effective_from?: string
  effective_until?: string
  minimum_effective_date: string
  last_online_booking_date?: string | null
  items: WeeklyScheduleItem[]
}

interface DaySlotsResponse {
  slots: TimeSlot[]
  total: number
}

interface VendorScheduleTabProps {
  vendorId: number
  weekStart: Date
  weekLabel: string
  canManage: boolean
  onPrevWeek: () => void
  onNextWeek: () => void
  onThisWeek: () => void
  onRefresh: () => void
}

function isBlockedStatus(slot: TimeSlot): boolean {
  return (
    slot.status === "blocked" ||
    slot.status === "disabled" ||
    slot.status === "closed"
  )
}

function isBooked(slot: TimeSlot): boolean {
  if (isBlockedStatus(slot)) return false
  return (
    slot.is_reserved ||
    slot.status === "reserved" ||
    slot.status === "reserving" ||
    slot.status === "pending_cancellation"
  )
}

function SlotStatusBadge({ slot, now }: { slot: TimeSlot; now: number }) {
  const past = new Date(slot.start_time).getTime() <= now
  if (past) {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[10px] font-semibold text-muted-foreground">
        گذشته
      </span>
    )
  }
  if (isBlockedStatus(slot)) {
    return (
      <Badge
        variant="destructive"
        className="h-6 px-2.5 text-[10px] font-semibold"
      >
        غیرفعال
      </Badge>
    )
  }
  if (isBooked(slot)) {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[10px] font-semibold text-muted-foreground">
        رزرو شده
      </span>
    )
  }
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-emerald-200 bg-emerald-50/60 px-2.5 text-[10px] font-semibold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
      آزاد
    </span>
  )
}

export function VendorScheduleTab({
  vendorId,
  weekStart,
  weekLabel,
  canManage,
  onPrevWeek,
  onNextWeek,
  onThisWeek,
  onRefresh,
}: VendorScheduleTabProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [template, setTemplate] = useState<WeeklyTemplateResponse | null>(null)
  const [templateLoading, setTemplateLoading] = useState(true)
  const [templateError, setTemplateError] = useState(false)

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const weekKeys = useMemo(() => weekDays.map((d) => getDateKey(d)), [weekDays])
  const [clock, setClock] = useState(() => Date.now())
  const todayKey = getDateKey(new Date(clock))

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const [selectedDate, setSelectedDate] = useState<string>(todayKey)
  const effectiveDate = weekKeys.includes(selectedDate)
    ? selectedDate
    : weekKeys.includes(todayKey)
      ? todayKey
      : (weekKeys[0] ?? todayKey)

  const [daySlots, setDaySlots] = useState<TimeSlot[]>([])
  const [dayLoading, setDayLoading] = useState(false)

  const [manualSlot, setManualSlot] = useState<TimeSlot | null>(null)
  const [manualName, setManualName] = useState("")
  const [manualPhone, setManualPhone] = useState("")
  const [manualWeeks, setManualWeeks] = useState("1")
  const [manualLoading, setManualLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [cancelSlot, setCancelSlot] = useState<TimeSlot | null>(null)
  const [cancelBooking, setCancelBooking] = useState<ManagerBooking | null>(
    null
  )
  const [cancelReason, setCancelReason] = useState("")
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelLookupLoading, setCancelLookupLoading] = useState(false)

  const loadTemplate = useCallback(async () => {
    setTemplateLoading(true)
    setTemplateError(false)
    try {
      const response = await api<WeeklyTemplateResponse>(
        `/api/v1/vendors/${vendorId}/slots/weekly-schedule-template`
      )
      setTemplate(response)
    } catch (error) {
      setTemplate(null)
      setTemplateError(true)
      toast.error(
        error instanceof ApiError ? error.message : "خطا در دریافت برنامه هفتگی"
      )
    } finally {
      setTemplateLoading(false)
    }
  }, [vendorId])

  const loadDaySlots = useCallback(async () => {
    if (!effectiveDate) return
    setDayLoading(true)
    try {
      const response = await api<DaySlotsResponse>(
        `/api/v1/vendors/${vendorId}/slots?date=${effectiveDate}&limit=50`
      )
      setDaySlots(response.slots)
    } catch {
      setDaySlots([])
    } finally {
      setDayLoading(false)
    }
  }, [vendorId, effectiveDate])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTemplate()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadTemplate])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDaySlots()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadDaySlots])

  const refreshAll = useCallback(() => {
    onRefresh()
    void loadTemplate()
    void loadDaySlots()
  }, [loadTemplate, loadDaySlots, onRefresh])

  const [weekSlotCount, setWeekSlotCount] = useState<number | null>(null)

  // ponytail: 7 light total-only requests per week; add a week-count endpoint if slow.
  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        const counts = await Promise.all(
          weekKeys.map(async (dateKey) => {
            try {
              const response = await api<DaySlotsResponse>(
                `/api/v1/vendors/${vendorId}/slots?date=${dateKey}&limit=1`
              )
              return typeof response?.total === "number" ? response.total : 0
            } catch {
              return 0
            }
          })
        )
        if (!cancelled) setWeekSlotCount(counts.reduce((sum, n) => sum + n, 0))
      })()
    }, 0)
    return () => {
      window.clearTimeout(timer)
      cancelled = true
    }
  }, [vendorId, weekKeys])

  async function toggleSlotStatus(slot: TimeSlot) {
    const next = isBlockedStatus(slot) ? "open" : "closed"
    setTogglingId(slot.id)
    try {
      await api(`/api/v1/vendors/${vendorId}/slots/${slot.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      })
      toast.success(next === "open" ? "سانس فعال شد" : "سانس غیرفعال شد")
      void loadDaySlots()
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "خطا در تغییر وضعیت سانس"
      )
    } finally {
      setTogglingId(null)
    }
  }

  function closeCancelDialog() {
    setCancelSlot(null)
    setCancelBooking(null)
    setCancelReason("")
  }

  async function openCancelDialog(slot: TimeSlot) {
    setCancelSlot(slot)
    setCancelBooking(null)
    setCancelReason("")
    setCancelLookupLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("vendor_id", String(vendorId))
      params.set("date_from", toLocalDateStr(new Date(slot.start_time)))
      params.set("date_to", toLocalDateStr(new Date(slot.start_time)))
      params.set("limit", "100")
      const res = await api<{ bookings: ManagerBooking[] }>(
        `/api/v1/manager/bookings?${params}`
      )
      const match = res.bookings.find(
        (booking) =>
          booking.slot_id === slot.id &&
          booking.status !== "cancelled" &&
          booking.status !== "expired"
      )
      setCancelBooking(match ?? null)
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "خطا در دریافت اطلاعات رزرو"
      )
      setCancelSlot(null)
    } finally {
      setCancelLookupLoading(false)
    }
  }

  async function handleCancelBooking(releaseSlot: boolean) {
    if (!cancelBooking) return
    setCancelLoading(true)
    try {
      await api(`/api/v1/manager/bookings/${cancelBooking.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          release_slot: releaseSlot,
          reason: cancelReason || undefined,
        }),
      })
      toast.success("رزرو لغو شد")
      closeCancelDialog()
      void loadDaySlots()
      onRefresh()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "خطا در لغو رزرو")
    } finally {
      setCancelLoading(false)
    }
  }

  async function submitManualBooking() {
    if (!manualSlot) return
    const weeksNum = Number(manualWeeks)
    if (!manualWeeks || weeksNum < 1) return
    const weeks = Math.min(26, weeksNum)
    const startDate = new Date(manualSlot.start_time)
    const dateTo = new Date(startDate)
    dateTo.setDate(startDate.getDate() + (weeks - 1) * 7)
    setManualLoading(true)
    try {
      await api("/api/v1/manager/bookings/recurring", {
        method: "POST",
        body: JSON.stringify({
          vendor_id: vendorId,
          full_name: manualName,
          phone_number: manualPhone,
          date_from: toLocalDateStr(startDate),
          date_to: toLocalDateStr(dateTo),
          days_of_week: [getPersianDayIndex(startDate)],
          start_time: getTimeInputValue(manualSlot.start_time),
          end_time: getTimeInputValue(manualSlot.end_time),
          allow_partial: true,
        }),
      })
      toast.success("رزرو سانس ثبت شد")
      setManualSlot(null)
      setManualName("")
      setManualPhone("")
      setManualWeeks("1")
      void loadDaySlots()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "خطا در ثبت رزرو")
    } finally {
      setManualLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle
                role="heading"
                aria-level={2}
                className="flex flex-wrap items-center gap-x-2 gap-y-1.5"
              >
                <CalendarDays className="size-5 shrink-0 text-primary" />
                برنامه هفتگی
                {weekSlotCount !== null && weekSlotCount > 0 && (
                  <Badge variant="secondary">
                    {toPersianDigits(weekSlotCount)} سانس
                  </Badge>
                )}
              </CardTitle>
              {(templateLoading ||
                templateError ||
                template?.source === "saved_version") && (
                <CardDescription>
                  {templateLoading
                    ? "در حال دریافت برنامه هفتگی…"
                    : templateError
                      ? "دریافت برنامه هفتگی با خطا مواجه شد."
                      : "نسخه فعال برنامه هفتگی"}
                </CardDescription>
              )}
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button variant="outline" size="sm" onClick={refreshAll}>
                <RefreshCw
                  className={`size-4 ${templateLoading ? "animate-spin" : ""}`}
                />
                بروزرسانی
              </Button>
              {canManage && (
                <Button
                  size="sm"
                  className="w-fit"
                  onClick={() => setEditorOpen(true)}
                >
                  <Pencil className="size-4 shrink-0 sm:me-1.5" />
                  ویرایش برنامه هفتگی
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {templateError && (
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              دریافت برنامه هفتگی با خطا مواجه شد.
            </p>
            <Button variant="outline" size="sm" onClick={loadTemplate}>
              تلاش دوباره
            </Button>
          </CardContent>
        )}
      </Card>

      <div className="rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b px-4 py-3.5 sm:px-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold sm:text-base">جدول سانس‌ها</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onThisWeek()
                setSelectedDate(todayKey)
              }}
              disabled={effectiveDate === todayKey}
            >
              <CalendarDays />
              <span>مشاهده امروز</span>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={onPrevWeek}
            >
              <ChevronRight />
              <span>هفته قبل</span>
            </Button>
            <button
              type="button"
              onClick={onThisWeek}
              className="min-w-28 text-center text-sm font-medium text-foreground sm:px-2"
              title="بازگشت به هفته جاری"
            >
              {weekLabel}
            </button>
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={onNextWeek}
            >
              <span>هفته بعد</span>
              <ChevronLeft />
            </Button>
          </div>
        </div>

        <div className="flex border-b">
          {weekDays.map((day, index) => {
            const dateKey = weekKeys[index]
            const isActive = dateKey === effectiveDate
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-center transition-colors ${
                  isActive
                    ? "border-b-2 border-primary text-foreground"
                    : "border-b-2 border-transparent text-muted-foreground hover:border-muted-foreground/20 hover:text-foreground"
                }`}
              >
                <span className="text-[10px] leading-none font-medium">
                  {formatWeekday(day)}
                </span>
                <span className="text-base leading-tight font-bold">
                  {toPersianDigits(
                    day.toLocaleDateString("fa-IR", { day: "numeric" })
                  )}
                </span>
                <span className="text-[9px] leading-none text-muted-foreground">
                  {day.toLocaleDateString("fa-IR", { month: "short" })}
                </span>
                {dateKey === todayKey && (
                  <span className="mt-0.5 rounded-full bg-primary/10 px-1.5 py-px text-[7px] leading-none font-semibold text-primary">
                    امروز
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {dayLoading ? (
          <div className="space-y-px p-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : daySlots.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Clock className="size-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium">
                سانسی برای این روز موجود نیست
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                روز دیگری از همین هفته را انتخاب کنید
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[11rem_12rem_1fr_auto] items-center gap-x-6 border-b bg-muted/30 px-5 py-3 sm:grid">
              <span className="text-start text-xs font-semibold text-muted-foreground">
                زمان
              </span>
              <span className="text-start text-xs font-semibold text-muted-foreground">
                قیمت
              </span>
              <span className="text-start text-xs font-semibold text-muted-foreground">
                وضعیت
              </span>
              <span className="text-start text-xs font-semibold text-muted-foreground">
                عملیات
              </span>
            </div>
            <div className="divide-y divide-border">
              {daySlots.map((slot) => {
                const past = new Date(slot.start_time).getTime() <= clock
                const blocked = isBlockedStatus(slot)
                const booked = isBooked(slot)
                const free = !past && !blocked && !booked
                const toggling = togglingId === slot.id
                const showActions =
                  canManage && (free || (!past && (blocked || booked)))
                return (
                  <div
                    key={slot.id}
                    className={`grid grid-cols-2 items-center gap-x-3 gap-y-2.5 px-4 py-3 sm:grid-cols-[11rem_12rem_1fr_auto] sm:gap-x-6 sm:px-5 sm:py-3.5 ${
                      past ? "opacity-35" : ""
                    }`}
                  >
                    <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2.5 sm:col-auto sm:row-auto">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                          blocked
                            ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                            : past || booked
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary"
                        }`}
                      >
                        <Clock className="size-4" />
                      </div>
                      <p
                        dir="ltr"
                        className="text-sm font-semibold whitespace-nowrap text-foreground"
                      >
                        {formatTime(slot.start_time)}
                        <span className="mx-1.5 text-muted-foreground/30">
                          —
                        </span>
                        {formatTime(slot.end_time)}
                      </p>
                    </div>
                    <div className="col-start-1 row-start-2 min-w-0 ps-10.5 sm:col-auto sm:row-auto sm:ps-0">
                      <span className="text-sm font-bold whitespace-nowrap text-primary">
                        {formatPrice(slot.base_price)}
                      </span>
                    </div>
                    <div className="col-start-2 row-start-1 flex items-center justify-end gap-1.5 sm:col-auto sm:row-auto sm:justify-start">
                      <Badge
                        variant={
                          slot.gender === "female" ? "outline" : "secondary"
                        }
                      >
                        {slot.gender === "female" ? "بانوان" : "آقایان"}
                      </Badge>
                      <SlotStatusBadge slot={slot} now={clock} />
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 pt-1 sm:col-auto sm:row-auto sm:justify-start sm:pt-0">
                      {showActions ? (
                        free ? (
                          <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
                            <Button
                              variant="destructive"
                              className="h-10 w-fit shrink-0 text-sm sm:h-7 sm:px-3 sm:text-xs"
                              disabled={toggling}
                              title="غیرفعال کردن سانس"
                              onClick={() => void toggleSlotStatus(slot)}
                            >
                              {toggling ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Ban className="size-3.5" />
                              )}
                              غیرفعال
                            </Button>
                            <Button
                              variant="outline"
                              className="h-10 w-fit shrink-0 text-sm sm:h-7 sm:px-3 sm:text-xs"
                              onClick={() => {
                                setManualSlot(slot)
                                setManualName("")
                                setManualPhone("")
                                setManualWeeks("1")
                              }}
                            >
                              <UserPlus className="size-3.5" />
                              رزرو دستی
                            </Button>
                          </div>
                        ) : booked ? (
                          <Button
                            variant="destructive"
                            className="h-10 w-fit shrink-0 text-sm sm:h-7 sm:px-3 sm:text-xs"
                            onClick={() => void openCancelDialog(slot)}
                          >
                            <XCircle className="size-3.5" />
                            لغو رزرو
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="h-10 w-fit shrink-0 text-sm sm:h-7 sm:px-3 sm:text-xs"
                            disabled={toggling}
                            onClick={() => void toggleSlotStatus(slot)}
                          >
                            {toggling ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Power className="size-3.5" />
                            )}
                            فعال‌سازی
                          </Button>
                        )
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <WeeklyScheduleEditor
        vendorId={vendorId}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onApplied={refreshAll}
      />

      <Dialog
        open={manualSlot !== null}
        onOpenChange={(value) => !value && setManualSlot(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>رزرو دستی سانس</DialogTitle>
            <DialogDescription>
              رزرو توسط سالن‌دار بدون پرداخت آنلاین ثبت می‌شود.
              {manualSlot && (
                <>
                  {" "}
                  {
                    PERSIAN_DAY_NAMES[
                      getPersianDayIndex(new Date(manualSlot.start_time))
                    ]
                  }{" "}
                  ساعت{" "}
                  <span>
                    {toPersianDigits(getTimeInputValue(manualSlot.start_time))}{" "}
                    - {toPersianDigits(getTimeInputValue(manualSlot.end_time))}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="schedule-manual-name">نام کامل</Label>
              <Input
                id="schedule-manual-name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-manual-phone">شماره تماس</Label>
              <Input
                id="schedule-manual-phone"
                type="tel"
                dir="ltr"
                placeholder="مثلاً ۰۹۱۲۰۰۰۰۰۰۰"
                maxLength={11}
                className="bg-background text-left"
                autoComplete="tel"
                value={toPersianDigits(manualPhone)}
                onChange={(e) =>
                  setManualPhone(toEnglishDigits(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-manual-weeks">تعداد هفته‌های رزرو</Label>
              <Input
                id="schedule-manual-weeks"
                type="tel"
                dir="ltr"
                inputMode="numeric"
                placeholder="مثلاً برای ۴ هفته متوالی، عدد ۴ را وارد کنید"
                maxLength={2}
                className="bg-background text-left"
                value={toPersianDigits(manualWeeks)}
                onChange={(e) =>
                  setManualWeeks(
                    toEnglishDigits(e.target.value).replace(/[^0-9]/g, "")
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualSlot(null)}>
              انصراف
            </Button>
            <Button
              disabled={
                manualLoading ||
                !manualName ||
                !manualPhone ||
                !manualWeeks ||
                Number(manualWeeks) < 1
              }
              onClick={() => void submitManualBooking()}
            >
              {manualLoading && (
                <Loader2 className="me-1 size-4 animate-spin" />
              )}
              ثبت رزرو
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelSlot !== null}
        onOpenChange={(value) => !value && closeCancelDialog()}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>جزئیات رزرو سانس</DialogTitle>
            <DialogDescription>
              اطلاعات رزروکننده و عملیات لغو این سانس
            </DialogDescription>
          </DialogHeader>
          {cancelLookupLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            cancelSlot && (
              <div className="space-y-4">
                <div className="rounded-lg border p-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">تاریخ: </span>
                      {formatBookingDate(cancelSlot.start_time)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">ساعت: </span>
                      {formatBookingTime(cancelSlot.start_time)} -{" "}
                      {formatBookingTime(cancelSlot.end_time)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">نام: </span>
                      {cancelBooking?.user_name ||
                        cancelBooking?.customer_full_name ||
                        "نامشخص"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">تماس: </span>
                      {cancelBooking?.user_phone ||
                      cancelBooking?.customer_phone
                        ? toPersianDigits(
                            cancelBooking?.user_phone ||
                              cancelBooking?.customer_phone ||
                              ""
                          )
                        : "نامشخص"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">نوع رزرو: </span>
                      {cancelBooking?.source === "manager_manual"
                        ? "دستی سالندار"
                        : "آنلاین کاربر"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">مبلغ: </span>
                      {formatMoney(cancelBooking?.price_paid ?? 0)}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule-cancel-reason">علت لغو</Label>
                  <Textarea
                    id="schedule-cancel-reason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="مثلاً تعمیرات، مشکل مجموعه، تعطیلی..."
                  />
                </div>
                {new Date(cancelSlot.start_time).getTime() <= clock && (
                  <p className="text-sm text-destructive">
                    زمان این سانس شروع شده یا گذشته است و دیگر قابل لغو نیست.
                  </p>
                )}
                {!cancelBooking && (
                  <p className="text-sm text-destructive">
                    رزرو فعال این سانس پیدا نشد.
                  </p>
                )}
              </div>
            )
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={closeCancelDialog}>
              بستن
            </Button>
            <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <Button
                variant="outline"
                disabled={
                  !cancelBooking ||
                  cancelLoading ||
                  cancelLookupLoading ||
                  (!!cancelSlot &&
                    new Date(cancelSlot.start_time).getTime() <= clock)
                }
                onClick={() => void handleCancelBooking(false)}
              >
                {cancelLoading && (
                  <Loader2 className="me-1 size-4 animate-spin" />
                )}
                لغو بدون آزادسازی
              </Button>
              <Button
                variant="destructive"
                disabled={
                  !cancelBooking ||
                  cancelLoading ||
                  cancelLookupLoading ||
                  (!!cancelSlot &&
                    new Date(cancelSlot.start_time).getTime() <= clock)
                }
                onClick={() => void handleCancelBooking(true)}
              >
                {cancelLoading && (
                  <Loader2 className="me-1 size-4 animate-spin" />
                )}
                لغو و آزادسازی
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
