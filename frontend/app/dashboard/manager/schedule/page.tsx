"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  ShieldAlert,
  Building2,
  Plus,
  Trash2,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/lib/toast"
import { WeeklyGrid } from "@/components/dashboard/schedule/weekly-grid"
import { BulkGenerator } from "@/components/dashboard/schedule/bulk-generator"
import { QuickSlotForm } from "@/components/dashboard/schedule/quick-slot-form"
import {
  getWeekDays,
  formatPersianDate,
} from "@/components/dashboard/schedule/utils"
import type {
  Court,
  TimeSlot,
  TimeSlotTemplate,
} from "@/components/dashboard/schedule/types"
import type { DateRange } from "@daypicker/react"
import { toLocalDateStr } from "@/lib/utils"

export default function ManagerSchedulePage() {
  const { user } = useAuth()
  const canManage = user?.role === "manager" || user?.role === "admin"

  // Data state
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date()
    const daysSinceSaturday = (today.getDay() + 1) % 7
    const saturday = new Date(today)
    saturday.setDate(today.getDate() - daysSinceSaturday)
    return saturday
  })
  const [showBulkGen, setShowBulkGen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [slotToDelete, setSlotToDelete] = useState<TimeSlot | null>(null)
  const [quickSlotDate, setQuickSlotDate] = useState<Date | null>(null)
  const [quickSlotSubmitting, setQuickSlotSubmitting] = useState(false)

  // Week navigation
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const weekLabel = useMemo(() => {
    if (weekDays.length === 0) return ""
    const from = formatPersianDate(weekDays[0])
    const to = formatPersianDate(weekDays[6])
    return `${from} — ${to}`
  }, [weekDays])

  function goNextWeek() {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + 7)
    setWeekStart(next)
  }

  function goPrevWeek() {
    const prev = new Date(weekStart)
    prev.setDate(prev.getDate() - 7)
    setWeekStart(prev)
  }

  function goThisWeek() {
    const today = new Date()
    const daysSinceSaturday = (today.getDay() + 1) % 7
    const saturday = new Date(today)
    saturday.setDate(today.getDate() - daysSinceSaturday)
    setWeekStart(saturday)
  }

  // Fetch courts
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
    fetchCourts()
  }, [fetchCourts])

  // Auto-select first court
  useEffect(() => {
    if (courts.length > 0 && selectedCourtId === null) {
      setSelectedCourtId(courts[0].id)
    }
  }, [courts, selectedCourtId])

  // Fetch slots
  const fetchSlots = useCallback(async () => {
    if (!selectedCourtId) return
    setSlotsLoading(true)
    setError(null)
    try {
      const res = await api<{ slots: TimeSlot[]; total: number }>(
        `/api/v1/courts/${selectedCourtId}/slots?skip=0&limit=100`
      )
      setSlots(res.slots)
    } catch {
      setError("خطا در دریافت زمان‌بندی")
    } finally {
      setSlotsLoading(false)
    }
  }, [selectedCourtId])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  // Handlers
  async function handleBulkGenerate(payload: {
    date_range: DateRange
    days: boolean[]
    templates: TimeSlotTemplate[]
  }) {
    if (!selectedCourtId) return

    const selectedDayIndices = payload.days
      .map((checked, i) => (checked ? i : -1))
      .filter((i) => i !== -1)

    if (selectedDayIndices.length === 0) {
      toast.error("حداقل یک روز هفته را انتخاب کنید")
      return
    }

    const validTemplates = payload.templates.filter(
      (t) => t.start_time && t.end_time && t.base_price
    )
    if (validTemplates.length === 0) {
      toast.error("حداقل یک بازه زمانی وارد کنید")
      return
    }

    if (!payload.date_range?.from || !payload.date_range?.to) {
      toast.error("بازه تاریخ را مشخص کنید")
      return
    }

    setGenerating(true)
    try {
      const res = await api<{ created: number; skipped: number; total: number }>(
        `/api/v1/courts/${selectedCourtId}/slots/generate`,
        {
          method: "POST",
          body: JSON.stringify({
            date_from: toLocalDateStr(payload.date_range.from),
            date_to: toLocalDateStr(payload.date_range.to),
            days_of_week: selectedDayIndices,
            templates: validTemplates.map((t) => ({
              start_time: t.start_time,
              end_time: t.end_time,
              base_price: parseFloat(t.base_price),
            })),
          }),
        }
      )
      if (res.created > 0) {
        toast.success(`${res.created} زمان با موفقیت ایجاد شد`)
        if (res.skipped > 0) {
          toast.info(`${res.skipped} زمان تکراری نادیده گرفته شد`)
        }
      } else {
        toast.info("زمان جدیدی ایجاد نشد (تکرار یا تداخل)")
      }
      setShowBulkGen(false)
      fetchSlots()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ایجاد زمان‌ها"
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  async function handleDeleteSlot() {
    if (!slotToDelete || !selectedCourtId) return
    try {
      await api(
        `/api/v1/courts/${selectedCourtId}/slots/${slotToDelete.id}`,
        { method: "DELETE" }
      )
      toast.success("زمان با موفقیت حذف شد")
      setSlotToDelete(null)
      fetchSlots()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در حذف زمان"
      toast.error(msg)
    }
  }

  async function handleQuickCreate(data: {
    start_time: string
    end_time: string
    base_price: number
  }) {
    if (!selectedCourtId || !quickSlotDate) return
    setQuickSlotSubmitting(true)
    try {
      await api(`/api/v1/courts/${selectedCourtId}/slots`, {
        method: "POST",
        body: JSON.stringify({
          court_id: selectedCourtId,
          start_time: `${toLocalDateStr(quickSlotDate)}T${data.start_time}:00`,
          end_time: `${toLocalDateStr(quickSlotDate)}T${data.end_time}:00`,
          base_price: data.base_price,
        }),
      })
      toast.success("سانس با موفقیت ایجاد شد")
      setQuickSlotDate(null)
      fetchSlots()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ایجاد سانس"
      toast.error(msg)
    } finally {
      setQuickSlotSubmitting(false)
    }
  }

  async function handleDeletePastSlots() {
    if (!selectedCourtId) return
    const now = new Date()
    const pastSlots = slots.filter((s) => new Date(s.end_time) < now && !s.is_reserved)
    if (pastSlots.length === 0) {
      toast.info("سانس گذشته‌ای برای حذف وجود ندارد")
      return
    }
    let deleted = 0
    for (const slot of pastSlots) {
      try {
        await api(`/api/v1/courts/${selectedCourtId}/slots/${slot.id}`, {
          method: "DELETE",
        })
        deleted++
      } catch {
        // skip
      }
    }
    toast.success(`${deleted} سانس گذشته حذف شد`)
    fetchSlots()
  }

  // Guard: not authorized
  if (!canManage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <ShieldAlert className="size-12 text-muted-foreground" />
        <p className="text-xl text-muted-foreground">دسترسی محدود</p>
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          فقط مدیران می‌توانند زمان‌بندی مجموعه‌ها را مدیریت کنند
        </p>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  // No courts state
  if (courts.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <Building2 className="size-12 text-muted-foreground" />
        <p className="text-xl text-muted-foreground">هنوز مجموعه‌ای ثبت نشده است</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">مدیریت زمان‌بندی</h1>
          <p className="text-muted-foreground">
            مشاهده و مدیریت زمان‌های مجموعه
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedCourtId?.toString() ?? ""}
            onValueChange={(v) => setSelectedCourtId(Number(v))}
          >
            <SelectTrigger className="w-50">
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

      {/* Week navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={goPrevWeek}>
                <ChevronRight className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>هفته قبل</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={goThisWeek}>
                امروز
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>هفته جاری</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={goNextWeek}>
                <ChevronLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>هفته بعد</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="text-sm font-medium">{weekLabel}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkGen(true)}
          >
            <Plus className="ml-1 size-3.5" />
            ایجاد گروهی
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeletePastSlots}
          >
            <Trash2 className="ml-1 size-3.5 text-destructive" />
            پاکسازی گذشته
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchSlots}
            disabled={slotsLoading}
          >
            <RefreshCw className={`size-4 ${slotsLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={fetchSlots}>
              <RefreshCw className="ml-2 size-4" />
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick slot form */}
      {quickSlotDate && (
        <div className="max-w-sm">
          <QuickSlotForm
            date={quickSlotDate}
            onClose={() => setQuickSlotDate(null)}
            onSubmit={handleQuickCreate}
            submitting={quickSlotSubmitting}
          />
        </div>
      )}

      {/* Weekly grid */}
      {!error && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>جدول هفتگی</CardTitle>
            <CardDescription>
              {slots.length > 0
                ? `${slots.length} زمان ثبت شده`
                : "این مجموعه هنوز زمانی ندارد"}
            </CardDescription>
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
            ) : (
              <WeeklyGrid
                slots={slots}
                weekStart={weekStart}
                onSlotDelete={setSlotToDelete}
                onCellClick={(day) => setQuickSlotDate(day)}
                onAddSlot={(day) => setQuickSlotDate(day)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk generator drawer */}
      <BulkGenerator
        open={showBulkGen}
        onOpenChange={setShowBulkGen}
        onGenerate={handleBulkGenerate}
        generating={generating}
        currentSlots={slots}
      />

      {/* Delete confirmation */}
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
            <AlertDialogAction variant="destructive" onClick={handleDeleteSlot}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
