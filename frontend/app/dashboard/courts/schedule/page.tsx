"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/lib/toast"
import {
  CalendarPlus,
  Trash2,
  CalendarDays,
  RefreshCw,
  ShieldAlert,
  Clock,
  Building2,
  Plus,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  WandSparkles,
} from "lucide-react"
import { PersianInput } from "@/components/ui/persian-input"
import { TimePicker } from "@/components/ui/time-picker"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { toLocalDateStr } from "@/lib/utils"
import type { DateRange } from "@daypicker/react"

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Court {
  id: number
  name: string
}

interface TimeSlot {
  id: number
  court_id: number
  start_time: string
  end_time: string
  base_price: number
  is_reserved: boolean
  version: number
}

interface TimeSlotTemplate {
  start_time: string
  end_time: string
  base_price: string
}

/* ------------------------------------------------------------------ */
/*  Persian helpers                                                   */
/* ------------------------------------------------------------------ */

const PERSIAN_DAY_NAMES = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
]

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان"
}

function formatPersianDate(date: Date): string {
  return date.toLocaleDateString("fa-IR", {
    month: "long",
    day: "numeric",
  })
}

function getDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA")
}

function getSlotDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA")
}

function getWeekDays(): Date[] {
  const today = new Date()
  const daysSinceSaturday = (today.getDay() + 1) % 7
  const saturday = new Date(today)
  saturday.setDate(today.getDate() - daysSinceSaturday)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(saturday)
    d.setDate(saturday.getDate() + i)
    return d
  })
}

function isSlotPast(slot: TimeSlot): boolean {
  return new Date(slot.end_time) < new Date()
}

function getThisWeekRange(): DateRange {
  const today = new Date()
  const daysSinceSaturday = (today.getDay() + 1) % 7
  const saturday = new Date(today)
  saturday.setDate(today.getDate() - daysSinceSaturday)
  const friday = new Date(saturday)
  friday.setDate(saturday.getDate() + 6)
  return { from: saturday, to: friday }
}

function getNextWeekRange(): DateRange {
  const thisWeek = getThisWeekRange()
  const nextSaturday = new Date(thisWeek.from!)
  nextSaturday.setDate(nextSaturday.getDate() + 7)
  const nextFriday = new Date(nextSaturday)
  nextFriday.setDate(nextSaturday.getDate() + 6)
  return { from: nextSaturday, to: nextFriday }
}

function getThirtyDayRange(): DateRange {
  const today = new Date()
  const end = new Date(today)
  end.setDate(today.getDate() + 30)
  return { from: today, to: end }
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export default function SchedulePage() {
  const { user } = useAuth()
  const canManage = user?.role === "manager" || user?.role === "admin"

  /* state --------------------------------------------------------- */
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsTotal, setSlotsTotal] = useState(0)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slotToDelete, setSlotToDelete] = useState<TimeSlot | null>(null)

  /* generate form state ------------------------------------------- */
  const [showGenerate, setShowGenerate] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    getThisWeekRange
  )
  const [selectedDays, setSelectedDays] = useState<boolean[]>(
    Array.from({ length: 7 }, () => true)
  )
  const [templates, setTemplates] = useState<TimeSlotTemplate[]>([
    { start_time: "08:00", end_time: "10:00", base_price: "" },
  ])
  const [generating, setGenerating] = useState(false)

  const weekDays = useMemo(() => getWeekDays(), [])

  /* preview count ------------------------------------------------- */
  const previewCount = useMemo(() => {
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
  }, [selectedDays, dateRange, templates])

  /* fetch courts -------------------------------------------------- */
  const fetchCourts = useCallback(async () => {
    try {
      const res = await api<{ courts: Court[]; total: number }>(
        "/api/v1/courts?skip=0&limit=100"
      )
      setCourts(res.courts)
    } catch {
      toast.error("خطا در دریافت لیست مجموعه‌ها")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchCourts(), 0)
    return () => clearTimeout(timer)
  }, [fetchCourts])

  /* auto-select first court when list loads ----------------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (courts.length > 0 && selectedCourtId === null) {
        setSelectedCourtId(courts[0].id)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [courts, selectedCourtId])

  /* fetch slots for the selected court ---------------------------- */
  const fetchSlots = useCallback(async () => {
    if (!selectedCourtId) return
    setSlotsLoading(true)
    setError(null)
    try {
      const res = await api<{ slots: TimeSlot[]; total: number }>(
        `/api/v1/courts/${selectedCourtId}/slots?skip=0&limit=100`
      )
      setSlots(res.slots)
      setSlotsTotal(res.total)
    } catch {
      setError("خطا در دریافت زمان‌بندی")
    } finally {
      setSlotsLoading(false)
    }
  }, [selectedCourtId])

  useEffect(() => {
    const timer = setTimeout(() => fetchSlots(), 0)
    return () => clearTimeout(timer)
  }, [fetchSlots])

  /* group slots by day -------------------------------------------- */
  const groupedSlots = useMemo(() => {
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
  }, [slots, weekDays])

  /* generate handler ---------------------------------------------- */
  async function handleGenerate() {
    if (!selectedCourtId) return

    const selectedDayIndices = selectedDays
      .map((checked, i) => (checked ? i : -1))
      .filter((i) => i !== -1)

    if (selectedDayIndices.length === 0) {
      toast.error("حداقل یک روز هفته را انتخاب کنید")
      return
    }

    const validTemplates = templates.filter(
      (t) => t.start_time && t.end_time && t.base_price
    )
    if (validTemplates.length === 0) {
      toast.error("حداقل یک بازه زمانی وارد کنید")
      return
    }

    if (!dateRange?.from || !dateRange?.to) {
      toast.error("بازه تاریخ را مشخص کنید")
      return
    }

    if (dateRange.to < dateRange.from) {
      toast.error("تاریخ پایان باید بعد از تاریخ شروع باشد")
      return
    }

    setGenerating(true)
    try {
      const res = await api<{
        created: number
        skipped: number
        total: number
      }>(`/api/v1/courts/${selectedCourtId}/slots/generate`, {
        method: "POST",
        body: JSON.stringify({
          date_from: toLocalDateStr(dateRange.from),
          date_to: toLocalDateStr(dateRange.to),
          days_of_week: selectedDayIndices,
          templates: validTemplates.map((t) => ({
            start_time: t.start_time,
            end_time: t.end_time,
            base_price: parseFloat(t.base_price),
          })),
        }),
      })
      if (res.created > 0) {
        toast.success(`${res.created} زمان با موفقیت ایجاد شد`)
        if (res.skipped > 0) {
          toast.info(`${res.skipped} زمان تکراری نادیده گرفته شد`)
        }
      } else {
        toast.info("زمان جدیدی ایجاد نشد (تکرار یا تداخل)")
      }
      fetchSlots()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ایجاد زمان‌ها"
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  /* delete handler ------------------------------------------------ */
  async function handleDelete() {
    if (!slotToDelete || !selectedCourtId) return

    try {
      await api(`/api/v1/courts/${selectedCourtId}/slots/${slotToDelete.id}`, {
        method: "DELETE",
      })
      toast.success("زمان با موفقیت حذف شد")
      setSlotToDelete(null)
      fetchSlots()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در حذف زمان"
      toast.error(msg)
    }
  }

  /* template helpers ---------------------------------------------- */
  function addTemplate() {
    setTemplates((prev) => [
      ...prev,
      { start_time: "", end_time: "", base_price: "" },
    ])
  }

  function removeTemplate(index: number) {
    setTemplates((prev) => prev.filter((_, i) => i !== index))
  }

  function updateTemplate(
    index: number,
    field: keyof TimeSlotTemplate,
    value: string
  ) {
    setTemplates((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  /* --------------------------------------------------------------- */
  /*  Render: manager guard                                          */
  /* --------------------------------------------------------------- */
  if (!canManage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <ShieldAlert className="size-12 text-muted-foreground" />
        <p className="text-xl text-muted-foreground">دسترسی محدود</p>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          فقط مدیران و اپراتورها می‌توانند زمان‌بندی مجموعه‌ها را مدیریت کنند
        </p>
      </div>
    )
  }

  /* --------------------------------------------------------------- */
  /*  Render: loading                                                */
  /* --------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-60" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  /* --------------------------------------------------------------- */
  /*  Render: no courts                                              */
  /* --------------------------------------------------------------- */
  if (courts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <Building2 className="size-12 text-muted-foreground" />
        <p className="text-xl text-muted-foreground">
          هنوز مجموعه‌ای ثبت نشده است
        </p>
        <Button asChild>
          <Link href="/dashboard/courts/create">
            <Plus className="ml-2 size-4" />
            ثبت مجموعه جدید
          </Link>
        </Button>
      </div>
    )
  }

  /* --------------------------------------------------------------- */
  /*  Main render                                                    */
  /* --------------------------------------------------------------- */
  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            مدیریت زمان‌بندی
          </h1>
          <p className="text-muted-foreground">
            مشاهده و مدیریت زمان‌های مجموعه‌ها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedCourtId?.toString() ?? ""}
            onValueChange={(v) => setSelectedCourtId(Number(v))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="انتخاب مجموعه" />
            </SelectTrigger>
            <SelectContent>
              {courts.map((court) => (
                <SelectItem key={court.id} value={court.id.toString()}>
                  {court.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ---- Generate form ---- */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setShowGenerate(!showGenerate)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WandSparkles className="size-5 text-primary" />
              <CardTitle>ایجاد زمان‌بندی گروهی</CardTitle>
            </div>
            <Button variant="ghost" size="sm">
              {showGenerate ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
          <CardDescription>
            با مشخص کردن بازه تاریخ، روزهای هفته و بازه‌های زمانی، به صورت
            خودکار زمان‌های مجموعه را ایجاد کنید
          </CardDescription>
        </CardHeader>

        {showGenerate && (
          <CardContent className="space-y-6 border-t pt-6">
            {/* Date range */}
            <div className="space-y-2">
              <Label>بازه تاریخ (شمسی)</Label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="انتخاب بازه تاریخ"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(getThisWeekRange())}
                >
                  این هفته
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(getNextWeekRange())}
                >
                  هفته آینده
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(getThirtyDayRange())}
                >
                  ۳۰ روز آینده
                </Button>
              </div>
            </div>

            {/* Days of week */}
            <div className="space-y-2">
              <Label>روزهای هفته</Label>
              <div className="flex flex-wrap gap-2">
                {PERSIAN_DAY_NAMES.map((name, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const next = [...selectedDays]
                      next[index] = !next[index]
                      setSelectedDays(next)
                    }}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                      selectedDays[index]
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Time templates */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>بازه‌های زمانی</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTemplate}
                >
                  <Plus className="ml-1 size-3.5" />
                  افزودن بازه
                </Button>
              </div>

              <div className="space-y-2">
                {templates.map((tpl, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-end gap-2 rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">شروع</Label>
                      <TimePicker
                        value={tpl.start_time}
                        onChange={(val) =>
                          updateTemplate(index, "start_time", val)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">پایان</Label>
                      <TimePicker
                        value={tpl.end_time}
                        onChange={(val) =>
                          updateTemplate(index, "end_time", val)
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">قیمت (تومان)</Label>
                      <PersianInput
                        value={tpl.base_price}
                        onChange={(e) =>
                          updateTemplate(index, "base_price", e.target.value)
                        }
                        placeholder="۵۰۰۰۰۰"
                        className="w-full"
                      />
                    </div>
                    {templates.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeTemplate(index)}
                      >
                        <X className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview + submit */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/50 p-4">
              <div className="text-sm text-muted-foreground">
                {previewCount > 0 ? (
                  <>
                    <span className="font-semibold text-foreground">
                      {previewCount.toLocaleString("fa-IR")}
                    </span>{" "}
                    زمان برای ایجاد آماده است
                  </>
                ) : (
                  "لطفاً روزها و بازه‌های زمانی را مشخص کنید"
                )}
              </div>
              <Button
                onClick={handleGenerate}
                disabled={generating || previewCount === 0}
              >
                <Save className="ml-2 size-4" />
                {generating ? "در حال ایجاد..." : "ایجاد زمان‌ها"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ---- Error state ---- */}
      {error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-8">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={fetchSlots}>
              <RefreshCw className="ml-2 size-4" />
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ---- Weekly grid ---- */}
      {!error && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>جدول هفتگی</CardTitle>
                <CardDescription>
                  {slotsTotal > 0
                    ? `${slotsTotal} زمان ثبت شده`
                    : "این مجموعه هنوز زمانی ندارد"}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchSlots}
                disabled={slotsLoading}
              >
                <RefreshCw
                  className={`size-4 ${slotsLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {slotsLoading ? (
              <div className="grid grid-cols-7 gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-16 w-full rounded-lg" />
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Skeleton key={j} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <CalendarDays className="size-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  هیچ زمانی برای این مجموعه تعریف نشده
                </p>
                <Button variant="outline" onClick={() => setShowGenerate(true)}>
                  <CalendarPlus className="ml-2 size-4" />
                  ایجاد زمان
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid min-w-[700px] grid-cols-7 gap-3">
                  {weekDays.map((day, dayIndex) => {
                    const dateKey = getDateKey(day)
                    const daySlots = groupedSlots[dateKey] ?? []
                    const todayKey = getDateKey(new Date())
                    const isToday = todayKey === dateKey

                    return (
                      <div key={dayIndex} className="space-y-2">
                        {/* Day header */}
                        <div
                          className={`rounded-lg border p-3 text-center ${
                            isToday
                              ? "border-primary/20 bg-primary/5"
                              : "bg-muted/30"
                          }`}
                        >
                          <div className="text-sm font-medium">
                            {PERSIAN_DAY_NAMES[dayIndex]}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {formatPersianDate(day)}
                          </div>
                        </div>

                        {/* Slot cards */}
                        <div className="min-h-[120px] space-y-2">
                          {daySlots.length === 0 ? (
                            <div className="flex items-center justify-center rounded-lg border border-dashed py-6 text-xs text-muted-foreground">
                              بدون زمان
                            </div>
                          ) : (
                            daySlots.map((slot) => {
                              const past = isSlotPast(slot)
                              return (
                                <div
                                  key={slot.id}
                                  className={`group relative rounded-lg border p-2.5 transition-all hover:shadow-sm ${
                                    past
                                      ? "border-muted bg-muted/20 opacity-60"
                                      : slot.is_reserved
                                        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                                        : "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
                                  }`}
                                >
                                  {/* Time */}
                                  <div className="mb-1 flex items-center gap-1 text-xs font-medium">
                                    <Clock className="size-3 shrink-0" />
                                    <span>
                                      {formatTime(slot.start_time)} &ndash;{" "}
                                      {formatTime(slot.end_time)}
                                    </span>
                                  </div>

                                  {/* Price */}
                                  <div className="mb-1.5 text-xs text-muted-foreground">
                                    {formatPrice(slot.base_price)}
                                  </div>

                                  {/* Status + actions */}
                                  <div className="flex items-center justify-between">
                                    <Badge
                                      variant={
                                        past
                                          ? "secondary"
                                          : slot.is_reserved
                                            ? "secondary"
                                            : "outline"
                                      }
                                      className="px-1.5 py-0 text-[10px]"
                                    >
                                      {past
                                        ? "گذشته"
                                        : slot.is_reserved
                                          ? "رزرو شده"
                                          : "آزاد"}
                                    </Badge>

                                    {!slot.is_reserved && !past && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={() => setSlotToDelete(slot)}
                                      >
                                        <Trash2 className="size-3 text-destructive" />
                                      </Button>
                                    )}
                                  </div>

                                  {/* Tooltip overlay for reserved slots */}
                                  {slot.is_reserved && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="absolute inset-0 cursor-help rounded-lg" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>
                                            این زمان توسط کاربر رزرو شده است
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---- Delete confirmation ---- */}
      <AlertDialog
        open={!!slotToDelete}
        onOpenChange={(open) => {
          if (!open) setSlotToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف زمان</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این زمان اطمینان دارید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
