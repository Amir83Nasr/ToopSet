"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { TimePicker } from "@/components/ui/time-picker"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/lib/toast"
import {
  ArrowRight,
  Pencil,
  CalendarPlus,
  MapPin,
  Star,
  Users,
  UserCircle,
  Phone,
  Loader2,
  Trash2,
  ToggleRight,
  Eye,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { PersianInput } from "@/components/ui/persian-input"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import type { DateRange } from "@daypicker/react"
import dynamic from "next/dynamic"
import { CourtImageGallery } from "@/components/courts/court-image-gallery"
import { CourtAmenities } from "@/components/courts/court-amenities"
import { CourtReviews } from "@/components/courts/court-reviews"
import {
  sportLabels,
  sportColors,
  Stars,
  formatTime,
  formatPrice,
  formatDate,
  type CourtData,
  type TimeSlot,
  type Review,
} from "@/components/courts/court-shared"

const CourtLocationMap = dynamic(
  () =>
    import("@/components/map/court-location-map").then(
      (m) => m.CourtLocationMap
    ),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full rounded-xl" /> }
)

export default function DashboardCourtDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const courtId = Number(params.id)

  const [court, setCourt] = useState<CourtData | null>(null)
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createCount, setCreateCount] = useState(0)
  const [createTotal, setCreateTotal] = useState(0)
  const [recentReviews, setRecentReviews] = useState<Review[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeDateIndex, setActiveDateIndex] = useState(0)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  const canManage = user?.role === "manager" || user?.role === "admin"
  const isAdmin = user?.role === "admin"

  const next7Days = useMemo(() => {
    const result: string[] = []
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      result.push(d.toLocaleDateString("en-CA"))
    }
    return result
  }, [])

  const activeDate = next7Days[activeDateIndex] || next7Days[0]

  const slotsForDate = useMemo(
    () => allSlots.filter((s) => s.start_time.startsWith(activeDate)),
    [allSlots, activeDate]
  )

  const totalAvailable = useMemo(
    () => allSlots.filter((s) => !s.is_reserved).length,
    [allSlots]
  )

  const totalReserved = useMemo(
    () => allSlots.filter((s) => s.is_reserved).length,
    [allSlots]
  )

  const fetchData = useCallback(async () => {
    try {
      const courtRes = await api<CourtData>(`/api/v1/courts/${courtId}`)
      setCourt(courtRes)
      // slots — independent; failure shouldn't block court data
      api<{ slots: TimeSlot[]; total: number }>(
        `/api/v1/courts/${courtId}/slots?limit=500`
      )
        .then((slotsRes) => setAllSlots(slotsRes.slots))
        .catch(() => {}) // slots optional
      // reviews — independent
      api<{ reviews: Review[]; total: number }>(
        `/api/v1/courts/${courtId}/reviews?limit=3`
      )
        .then((revRes) => setRecentReviews(revRes.reviews || []))
        .catch(() => {}) // reviews optional
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true)
      else toast.error("خطا در دریافت اطلاعات")
    } finally {
      setLoading(false)
    }
  }, [courtId])

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0)
    return () => clearTimeout(timer)
  }, [fetchData])

  async function handleCreateSlot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!dateRange?.from) {
      toast.error("لطفاً بازه تاریخ را انتخاب کنید")
      return
    }
    if (!startTime || !endTime) {
      toast.error("لطفاً ساعت شروع و پایان را وارد کنید")
      return
    }
    setCreating(true)
    const form = new FormData(e.currentTarget)
    const price = form.get("base_price") as string
    const dates: string[] = []
    const from = new Date(dateRange.from)
    const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from)
    const current = new Date(from)
    while (current <= to) {
      dates.push(current.toLocaleDateString("en-CA"))
      current.setDate(current.getDate() + 1)
    }
    setCreateCount(0)
    setCreateTotal(dates.length)
    let successCount = 0
    for (let i = 0; i < dates.length; i++) {
      try {
        await api(`/api/v1/courts/${courtId}/slots`, {
          method: "POST",
          body: JSON.stringify({
            date: dates[i],
            start_time: startTime,
            end_time: endTime,
            base_price: Number(price.replace(/,/g, "")),
          }),
        })
        successCount++
      } catch {} // skip failed
      setCreateCount(i + 1)
    }
    if (successCount > 0) {
      toast.success(`${toPersianDigits(successCount)} زمان با موفقیت ایجاد شد`)
      fetchData()
    } else {
      toast.error("هیچ زمانی ایجاد نشد")
    }
    setCreating(false)
    setDialogOpen(false)
    setDateRange(undefined)
  }

  const handleToggleActive = useCallback(async () => {
    if (!court) return
    try {
      await api(`/api/v1/courts/${courtId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !court.is_active }),
      })
      toast.success(court.is_active ? "مجموعه غیرفعال شد" : "مجموعه فعال شد")
      fetchData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا")
    }
  }, [court, courtId, fetchData])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await api(`/api/v1/courts/${courtId}`, { method: "DELETE" })
      toast.success("مجموعه حذف شد")
      router.push("/dashboard/courts")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در حذف")
    } finally {
      setDeleting(false)
    }
  }, [courtId, router])

  const handleDeleteSlot = useCallback(
    async (slot: TimeSlot) => {
      try {
        await api(`/api/v1/courts/${courtId}/slots/${slot.id}`, {
          method: "DELETE",
        })
        toast.success("زمان حذف شد")
        fetchData()
      } catch {
        toast.error("خطا در حذف زمان")
      }
    },
    [courtId, fetchData]
  )

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Skeleton className="h-[300px] w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !court) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-xl text-muted-foreground">
          مجموعه مورد نظر یافت نشد
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/courts")}
        >
          <ArrowRight className="ml-2 size-4" />
          بازگشت به لیست
        </Button>
      </div>
    )
  }

  const { dayName, dayNum, month } = formatDate(activeDate)
  const activeDateLabel = `${dayName} ${dayNum} ${month}`

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          className="w-fit"
          onClick={() => router.push("/dashboard/courts")}
        >
          <ArrowRight className="ml-2 size-4" />
          بازگشت به لیست
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToggleActive}>
            <ToggleRight data-icon="inline-start" />
            {court.is_active ? "غیرفعال‌سازی" : "فعال‌سازی"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/courts/${courtId}/edit`}>
              <Pencil className="ml-1.5 size-4" />
              ویرایش
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/courts/${courtId}`}>
              <Eye className="ml-1.5 size-4" />
              صفحه عمومی
            </Link>
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="ml-1.5 size-4" />
              حذف
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ====== Left column: Court info ====== */}
        <div className="space-y-6 lg:col-span-3">
          {/* Image Gallery */}
          <CourtImageGallery
            images={court.images || []}
            courtName={court.name}
          />

          {/* Court info card */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <CardTitle className="text-xl">{court.name}</CardTitle>
                <CardDescription className="mt-1">
                  <div className="flex flex-wrap gap-1.5">
                    {court.sport_types?.map((st) => (
                      <Badge
                        key={st}
                        className={sportColors[st] || ""}
                        variant="secondary"
                      >
                        {sportLabels[st] || st}
                      </Badge>
                    ))}
                  </div>
                </CardDescription>
              </div>
              <Stars rating={court.average_rating} size={16} />
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{court.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="size-4 shrink-0 text-muted-foreground" />
                  <span>ظرفیت {toPersianDigits(court.capacity)} نفر</span>
                </div>
                {court.manager_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserCircle className="size-4 shrink-0 text-muted-foreground" />
                    <span>مدیر: {court.manager_name}</span>
                  </div>
                )}
                {court.manager_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 shrink-0 text-muted-foreground" />
                    <a
                      href={`tel:${court.manager_phone}`}
                      className="text-primary hover:underline"
                    >
                      {court.manager_phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <span>
                    {toPersianDigits(court.average_rating.toFixed(1))}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={court.is_active ? "default" : "secondary"}>
                    {court.is_active ? "فعال" : "غیرفعال"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          {court.amenities && <CourtAmenities amenities={court.amenities} />}

          {/* Map */}
          {court.latitude != null && court.longitude != null && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">موقعیت روی نقشه</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <CourtLocationMap
                  latitude={court.latitude}
                  longitude={court.longitude}
                  name={court.name}
                  height="220px"
                />
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          {recentReviews.length > 0 && (
            <CourtReviews
              reviews={recentReviews}
              averageRating={court.average_rating}
              total={recentReviews.length}
            />
          )}
        </div>

        {/* ====== Right column: Time slots ====== */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:col-span-2 lg:self-start">
          {/* Stats bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-around text-center">
                <div>
                  <p className="text-2xl font-bold">
                    {toPersianDigits(allSlots.length)}
                  </p>
                  <p className="text-xs text-muted-foreground">کل زمان‌ها</p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {toPersianDigits(totalAvailable)}
                  </p>
                  <p className="text-xs text-muted-foreground">آزاد</p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div>
                  <p className="text-2xl font-bold text-red-500">
                    {toPersianDigits(totalReserved)}
                  </p>
                  <p className="text-xs text-muted-foreground">رزرو شده</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date navigation + Add button */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={activeDateIndex <= 0}
                    onClick={() =>
                      setActiveDateIndex((i) => Math.max(0, i - 1))
                    }
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <div className="min-w-0 text-center">
                    <p className="text-sm leading-tight font-semibold">
                      {activeDateLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {toPersianDigits(slotsForDate.length)} سانس
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={activeDateIndex >= next7Days.length - 1}
                    onClick={() =>
                      setActiveDateIndex((i) =>
                        Math.min(next7Days.length - 1, i + 1)
                      )
                    }
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>
                {canManage && (
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <CalendarPlus className="ml-1.5 size-4" />
                        افزودن
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      onOpenAutoFocus={() => {
                        setStartTime("")
                        setEndTime("")
                      }}
                    >
                      <DialogHeader>
                        <DialogTitle>افزودن زمان جدید</DialogTitle>
                        <DialogDescription>
                          برای مجموعه {court.name} زمان جدید ثبت کنید
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateSlot} className="space-y-4">
                        <div className="space-y-2">
                          <Label>بازه تاریخ</Label>
                          <DateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder="از تاریخ تا تاریخ"
                          />
                          {dateRange?.from && dateRange?.to && (
                            <p className="text-xs text-muted-foreground">
                              {dateRange.from.toLocaleDateString("fa-IR")} تا{" "}
                              {dateRange.to.toLocaleDateString("fa-IR")}
                              {dateRange.from.toLocaleDateString("en-CA") !==
                                dateRange.to.toLocaleDateString("en-CA") &&
                                ` (${toPersianDigits(
                                  Math.ceil(
                                    (dateRange.to.getTime() -
                                      dateRange.from.getTime()) /
                                      (1000 * 60 * 60 * 24) +
                                      1
                                  )
                                )} روز)`}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>ساعت شروع</Label>
                            <TimePicker
                              value={startTime}
                              onChange={setStartTime}
                              placeholder="--:--"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>ساعت پایان</Label>
                            <TimePicker
                              value={endTime}
                              onChange={setEndTime}
                              placeholder="--:--"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="base_price">قیمت (تومان)</Label>
                          <PersianInput
                            id="base_price"
                            name="base_price"
                            min="0"
                            placeholder="۵۰۰۰۰۰"
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={creating}>
                            {creating ? (
                              <>
                                <Loader2 className="ml-1.5 size-4 animate-spin" />
                                {toPersianDigits(createCount)}/
                                {toPersianDigits(createTotal)}
                              </>
                            ) : (
                              "ثبت زمان‌ها"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Slot cards */}
          <div className="space-y-2">
            {slotsForDate.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center text-muted-foreground">
                <CalendarDays className="size-10 opacity-30" />
                <div>
                  <p className="text-sm font-medium">
                    سانسی برای این تاریخ ثبت نشده
                  </p>
                  <p className="mt-1 text-xs opacity-70">
                    {canManage
                      ? "از دکمه افزودن استفاده کنید"
                      : "تاریخ دیگری انتخاب کنید"}
                  </p>
                </div>
              </div>
            ) : (
              slotsForDate.map((slot) => (
                <div
                  key={slot.id}
                  className={`group flex items-center justify-between rounded-xl border-2 p-4 transition-all ${
                    slot.is_reserved
                      ? "border-destructive/30 bg-destructive/5 dark:border-destructive/20"
                      : "border-border/50 bg-card hover:border-primary/30 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex size-12 items-center justify-center rounded-xl ${
                        slot.is_reserved
                          ? "bg-red-100 text-red-500 dark:bg-red-900/20"
                          : "bg-green-100 text-green-600 dark:bg-green-900/20"
                      }`}
                    >
                      {slot.is_reserved ? (
                        <XCircle className="size-6" />
                      ) : (
                        <CheckCircle2 className="size-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-base leading-tight font-bold">
                        {formatTime(slot.start_time)}
                        <span className="mx-1.5 text-muted-foreground/40">
                          —
                        </span>
                        {formatTime(slot.end_time)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatPrice(slot.base_price)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={slot.is_reserved ? "secondary" : "outline"}
                      className={`shrink-0 ${
                        slot.is_reserved
                          ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          : "border-primary/30 text-green-600 dark:border-primary/30"
                      }`}
                    >
                      {slot.is_reserved ? "رزرو شده" : "آزاد"}
                    </Badge>
                    {!slot.is_reserved && canManage && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleDeleteSlot(slot)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مجموعه</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف مجموعه «{court.name}» اطمینان دارید؟ این عمل قابل
              بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "در حال حذف..." : "حذف مجموعه"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
