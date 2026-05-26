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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { toast } from "sonner"
import {
  CalendarPlus,
  Trash2,
  CalendarDays,
  RefreshCw,
  ShieldAlert,
  Clock,
  Building2,
  Plus,
} from "lucide-react"

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
  return date.toLocaleDateString("en-CA") // YYYY-MM-DD
}

function getSlotDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA")
}

/** Returns Sat–Fri of the current week. */
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [slotToDelete, setSlotToDelete] = useState<TimeSlot | null>(null)
  const [selectedDays, setSelectedDays] = useState<boolean[]>(
    Array.from({ length: 7 }, () => false),
  )

  const weekDays = useMemo(() => getWeekDays(), [])

  /* fetch courts -------------------------------------------------- */
  const fetchCourts = useCallback(async () => {
    try {
      const res = await api<{ courts: Court[]; total: number }>(
        "/api/v1/courts?skip=0&limit=100",
      )
      setCourts(res.courts)
    } catch {
      toast.error("خطا در دریافت لیست زمین‌ها")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCourts()
  }, [fetchCourts])

  /* auto-select first court when list loads ----------------------- */
  useEffect(() => {
    if (courts.length > 0 && selectedCourtId === null) {
      setSelectedCourtId(courts[0].id)
    }
  }, [courts, selectedCourtId])

  /* fetch slots for the selected court ---------------------------- */
  const fetchSlots = useCallback(async () => {
    if (!selectedCourtId) return
    setSlotsLoading(true)
    setError(null)
    try {
      const res = await api<{ slots: TimeSlot[]; total: number }>(
        `/api/v1/courts/${selectedCourtId}/slots?skip=0&limit=100`,
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
    fetchSlots()
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
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      )
    })
    return groups
  }, [slots, weekDays])

  /* batch create handler ------------------------------------------ */
  async function handleBatchCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedCourtId) return
    setCreating(true)

    const form = new FormData(e.currentTarget)
    const startTime = form.get("start_time") as string
    const endTime = form.get("end_time") as string
    const price = form.get("base_price") as string

    const selectedDayIndices = selectedDays
      .map((checked, i) => (checked ? i : -1))
      .filter((i) => i !== -1)

    if (selectedDayIndices.length === 0) {
      toast.error("حداقل یک روز را انتخاب کنید")
      setCreating(false)
      return
    }

    let created = 0
    const errors: string[] = []

    for (const dayIndex of selectedDayIndices) {
      const dayDate = weekDays[dayIndex]

      const startDateTime = new Date(dayDate)
      const [sh, sm] = startTime.split(":").map(Number)
      startDateTime.setHours(sh, sm, 0, 0)

      const endDateTime = new Date(dayDate)
      const [eh, em] = endTime.split(":").map(Number)
      endDateTime.setHours(eh, em, 0, 0)

      if (endDateTime <= startDateTime) {
        errors.push(
          `${PERSIAN_DAY_NAMES[dayIndex]}: زمان پایان باید بعد از شروع باشد`,
        )
        continue
      }

      try {
        await api(`/api/v1/courts/${selectedCourtId}/slots`, {
          method: "POST",
          body: JSON.stringify({
            court_id: selectedCourtId,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            base_price: parseFloat(price),
          }),
        })
        created++
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "خطا در ایجاد زمان"
        errors.push(`${PERSIAN_DAY_NAMES[dayIndex]}: ${msg}`)
      }
    }

    if (created > 0) {
      toast.success(`${created} زمان با موفقیت ایجاد شد`)
      setDialogOpen(false)
      fetchSlots()
    }

    if (errors.length > 0) {
      toast.error(errors[0])
    }

    setCreating(false)
  }

  /* delete handler ------------------------------------------------ */
  async function handleDelete() {
    if (!slotToDelete || !selectedCourtId) return

    try {
      await api(
        `/api/v1/courts/${selectedCourtId}/slots/${slotToDelete.id}`,
        { method: "DELETE" },
      )
      toast.success("زمان با موفقیت حذف شد")
      setSlotToDelete(null)
      fetchSlots()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در حذف زمان"
      toast.error(msg)
    }
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
          فقط مدیران و اپراتورها می‌توانند زمان‌بندی زمین‌ها را مدیریت کنند
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
        <p className="text-xl text-muted-foreground">هنوز زمینی ثبت نشده است</p>
        <Button asChild>
          <Link href="/dashboard/courts/create">
            <Plus className="ml-2 size-4" />
            ثبت زمین جدید
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
            مشاهده و مدیریت زمان‌های زمین‌ها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedCourtId?.toString() ?? ""}
            onValueChange={(v) => setSelectedCourtId(Number(v))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="انتخاب زمین" />
            </SelectTrigger>
            <SelectContent>
              {courts.map((court) => (
                <SelectItem key={court.id} value={court.id.toString()}>
                  {court.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open)
                setSelectedDays(Array.from({ length: 7 }, () => false))
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <CalendarPlus className="ml-2 size-4" />
                ایجاد زمان جدید
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>ایجاد زمان جدید</DialogTitle>
                <DialogDescription>
                  برای روزهای انتخاب‌شده در هفته جاری، زمان ثبت کنید
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleBatchCreate} className="space-y-4">
                {/* day selection */}
                <div className="space-y-2">
                  <Label>روزهای هفته</Label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                    {weekDays.map((day, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Checkbox
                          id={`day_${index}`}
                          checked={selectedDays[index]}
                          onCheckedChange={(checked) => {
                            const next = [...selectedDays]
                            next[index] = !!checked
                            setSelectedDays(next)
                          }}
                          className="mt-0.5"
                        />
                        <Label
                          htmlFor={`day_${index}`}
                          className="cursor-pointer text-sm leading-tight"
                        >
                          {PERSIAN_DAY_NAMES[index]}
                          <span className="block text-xs text-muted-foreground">
                            {formatPersianDate(day)}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* time range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">ساعت شروع</Label>
                    <Input
                      id="start_time"
                      name="start_time"
                      type="time"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">ساعت پایان</Label>
                    <Input
                      id="end_time"
                      name="end_time"
                      type="time"
                      required
                    />
                  </div>
                </div>

                {/* price */}
                <div className="space-y-2">
                  <Label htmlFor="base_price">قیمت پایه (تومان)</Label>
                  <Input
                    id="base_price"
                    name="base_price"
                    type="number"
                    min="0"
                    placeholder="۵۰۰۰۰۰"
                    required
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? "در حال ایجاد..." : "ایجاد زمان‌ها"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                    : "این زمین هنوز زمانی ندارد"}
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
                  هیچ زمانی برای این زمین تعریف نشده
                </p>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                >
                  <CalendarPlus className="ml-2 size-4" />
                  ایجاد زمان جدید
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
                                          <p>این زمان توسط کاربر رزرو شده است</p>
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
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
