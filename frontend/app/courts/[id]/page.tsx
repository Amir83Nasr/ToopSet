"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Phone,
  Clock,
  LayoutDashboard,
  CheckCircle2,
  Users,
  Award,
  MessageSquareText,
  Info,
  ImagePlus,
  X,
} from "lucide-react"
import dynamic from "next/dynamic"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  Stars,
  sportLabels,
  sportColors,
  amenityLabels,
  formatPrice,
  formatTime,
  type CourtData,
  type TimeSlot,
  type Review,
} from "@/components/courts/court-shared"

const CourtLocationMap = dynamic(
  () =>
    import("@/components/map/court-location-map").then(
      (m) => m.CourtLocationMap
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-44 w-full rounded-xl" />,
  }
)

// ── Persian week helpers ──

const PERSIAN_DAY_NAMES = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const

function getJsDayToPersian(jsDay: number): string {
  return PERSIAN_DAY_NAMES[jsDay === 6 ? 0 : jsDay + 1]
}

function getWeekStart(offset: number): Date {
  const now = new Date()
  const jsDay = now.getDay()
  const daysToSat = jsDay === 6 ? 0 : jsDay + 1
  const d = new Date(now)
  d.setDate(now.getDate() - daysToSat + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function enCa(d: Date): string {
  return d.toLocaleDateString("en-CA")
}

function isToday(dateStr: string): boolean {
  return dateStr === enCa(new Date())
}

// ── Loading skeleton ──

function LoadingSkeleton() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="relative flex-1 pt-16">
        <div className="mx-auto max-w-7xl px-4 pt-8 pb-20">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="mt-8 h-8 w-40" />
          <Skeleton className="mt-6 h-64 w-full rounded-lg" />
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <Skeleton className="h-48 rounded-lg lg:col-span-2" />
            <div className="space-y-6">
              <Skeleton className="h-44 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default function PublicCourtDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const courtId = Number(params.id)

  const [court, setCourt] = useState<CourtData | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const canManage = user?.role === "manager" || user?.role === "admin"

  // ── Week calculation ──

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset])

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      const dateStr = enCa(d)
      return {
        date: dateStr,
        dayName: getJsDayToPersian(d.getDay()),
        dayNum: d.toLocaleDateString("fa-IR", { day: "numeric" }),
        month: d.toLocaleDateString("fa-IR", { month: "short" }),
        fullPersian: d.toLocaleDateString("fa-IR"),
        today: isToday(dateStr),
      }
    })
  }, [weekStart])

  const weekRange = useMemo(() => {
    if (weekDays.length < 7) return ""
    const from = `${weekDays[0].dayNum} ${weekDays[0].month}`
    const to = `${weekDays[6].dayNum} ${weekDays[6].month}`
    if (weekDays[0].month === weekDays[6].month) {
      return `${weekDays[0].dayNum} ${weekDays[0].month} — ${weekDays[6].dayNum}`
    }
    return `${from} — ${to}`
  }, [weekDays])

  const selectedDayInfo = useMemo(
    () => weekDays.find((d) => d.date === selectedDate),
    [weekDays, selectedDate]
  )

  // Effective selected date — falls back to first day when selection is invalid
  const effectiveDate =
    selectedDate && weekDays.find((d) => d.date === selectedDate)
      ? selectedDate
      : weekDays[0]?.date || ""

  // ── Fetch court + reviews ──

  useEffect(() => {
    async function init() {
      try {
        const [courtRes, revRes] = await Promise.all([
          api<CourtData>(`/api/v1/courts/${courtId}`),
          api<{ reviews: Review[]; total: number }>(
            `/api/v1/courts/${courtId}/reviews?limit=5`
          ).catch(() => ({ reviews: [], total: 0 })),
        ])
        setCourt(courtRes)
        setReviews(revRes.reviews || [])
        setReviewsTotal(revRes.total || 0)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [courtId])

  // ── Fetch slots ──

  const fetchSlots = useCallback(
    async (date: string) => {
      if (!date) return
      setSlotsLoading(true)
      setSelectedSlot(null)
      try {
        const res = await api<{ slots: TimeSlot[]; total: number }>(
          `/api/v1/courts/${courtId}/slots?date=${date}&limit=50`
        )
        setSlots(res.slots)
      } catch (err) {
        console.error(
          "fetchSlots error:",
          err,
          "date:",
          date,
          "courtId:",
          courtId
        )
        setSlots([])
      } finally {
        setSlotsLoading(false)
      }
    },
    [courtId]
  )

  useEffect(() => {
    if (!effectiveDate || !courtId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlotsLoading(true)

    setSelectedSlot(null)
    fetchSlots(effectiveDate)
  }, [effectiveDate, courtId, fetchSlots])

  function handleBookSlot(slot: TimeSlot) {
    if (!isAuthenticated) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/book?slot_id=${slot.id}&court_id=${courtId}`)}`
      )
      return
    }
    router.push(`/book?slot_id=${slot.id}&court_id=${courtId}`)
  }

  function goPrevWeek() {
    setWeekOffset((prev) => prev - 1)
  }

  function goNextWeek() {
    setWeekOffset((prev) => prev + 1)
  }

  // ── Render ──

  if (loading) return <LoadingSkeleton />

  if (notFound || !court) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="relative flex-1 pt-16">
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <MapPin className="size-8 text-muted-foreground/50" />
            </div>
            <p className="text-base text-muted-foreground">
              مجموعه مورد نظر یافت نشد
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/")}
            >
              بازگشت
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="relative flex-1 pt-16">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-20">
          {/* ═══════════════════════════════════
               Court Hero Card
               ═══════════════════════════════════ */}
          <div className="mb-10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {court.name}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {court.sport_types.map((st) => (
                    <Badge
                      key={st}
                      variant="secondary"
                      className={sportColors[st] || ""}
                    >
                      {sportLabels[st] || st}
                    </Badge>
                  ))}
                  <div className="flex items-center gap-1.5 text-sm">
                    <Stars rating={court.average_rating} size={15} />
                    <span className="font-semibold text-foreground">
                      {toPersianDigits(court.average_rating.toFixed(1))}
                    </span>
                    {reviewsTotal > 0 && (
                      <span className="text-muted-foreground">
                        ({toPersianDigits(reviewsTotal)} نظر)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="shrink-0"
                >
                  <Link href={`/dashboard/courts/${courtId}`}>
                    <LayoutDashboard className="ms-1.5 size-3.5" />
                    مدیریت
                  </Link>
                </Button>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-0 gap-y-0 border-t pt-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  <span>{court.address}</span>
                </span>
                {court.manager_phone && (
                  <a
                    href={`tel:${court.manager_phone}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    dir="ltr"
                  >
                    <Phone className="size-3.5 shrink-0" />
                    <span>{toPersianDigits(court.manager_phone)}</span>
                  </a>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5 shrink-0" />
                  <span>{toPersianDigits(court.capacity)} نفر</span>
                </span>
                {court.manager_name && (
                  <span className="inline-flex items-center gap-1.5">
                    <Info className="size-3.5 shrink-0" />
                    <span>مدیر: {court.manager_name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════
               Schedule + Sidebar Grid
               ═══════════════════════════════════ */}
          <div className="grid gap-12 lg:grid-cols-3">
            {/* ====== Left: Schedule ====== */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border bg-card">
                {/* ── Week nav ── */}
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <h2 className="text-base font-semibold">برنامه هفتگی</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goPrevWeek}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                    <span className="min-w-32 text-center text-xs font-medium text-muted-foreground">
                      {weekRange}
                    </span>
                    <button
                      onClick={goNextWeek}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                  </div>
                </div>

                {/* ── Day tabs ── */}
                <div className="flex border-b">
                  {weekDays.map((day) => {
                    const isActive = day.date === selectedDate
                    return (
                      <button
                        key={day.date}
                        onClick={() => {
                          setSelectedDate(day.date)
                          setSelectedSlot(null)
                        }}
                        className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-center transition-colors ${
                          isActive
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

                {/* ── Slots ── */}
                {slotsLoading ? (
                  <div className="space-y-px p-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
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
                  <>
                    {/* Table */}
                    <div>
                      {/* Header row */}
                      <div className="flex items-center border-b bg-muted/30 px-4 py-2.5">
                        <span className="flex-1 text-xs font-medium text-muted-foreground">
                          زمان
                        </span>
                        <span className="w-28 text-center text-xs font-medium text-muted-foreground">
                          قیمت
                        </span>
                        <span className="w-24 text-center text-xs font-medium text-muted-foreground">
                          وضعیت
                        </span>
                      </div>

                      {/* Slot rows */}
                      <div className="*:last:border-b-0">
                        {slots.map((slot) => {
                          const isSelected = selectedSlot?.id === slot.id
                          return (
                            <button
                              key={slot.id}
                              onClick={() =>
                                !slot.is_reserved && setSelectedSlot(slot)
                              }
                              disabled={slot.is_reserved}
                              className={`flex w-full items-center border-b px-4 py-3.5 text-right transition-colors ${
                                slot.is_reserved
                                  ? "cursor-not-allowed opacity-35"
                                  : isSelected
                                    ? "bg-primary/5"
                                    : "cursor-pointer hover:bg-muted/20"
                              }`}
                            >
                              <div className="flex flex-1 items-center gap-3">
                                <div
                                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                    slot.is_reserved
                                      ? "bg-muted text-muted-foreground"
                                      : isSelected
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-primary/10 text-primary"
                                  }`}
                                >
                                  <Clock className="size-4" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">
                                  {formatTime(slot.start_time)}
                                  <span className="mx-1.5 text-muted-foreground/20">
                                    —
                                  </span>
                                  {formatTime(slot.end_time)}
                                </p>
                              </div>
                              <div className="w-28 text-center">
                                <span
                                  className={`text-sm font-bold ${
                                    slot.is_reserved
                                      ? "text-muted-foreground"
                                      : "text-primary"
                                  }`}
                                >
                                  {formatPrice(slot.base_price)}
                                </span>
                              </div>
                              <div className="w-24 text-center">
                                {slot.is_reserved ? (
                                  <span className="inline-flex h-6 items-center rounded-full bg-red-50 px-2.5 text-[10px] font-semibold text-red-600 dark:bg-red-950 dark:text-red-400">
                                    رزرو شده
                                  </span>
                                ) : isSelected ? (
                                  <span className="inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-[10px] font-semibold text-primary-foreground">
                                    انتخاب شد
                                  </span>
                                ) : (
                                  <span className="inline-flex h-6 items-center rounded-full border border-emerald-200 bg-emerald-50/60 px-2.5 text-[10px] font-semibold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                                    آزاد
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Booking CTA */}
                    {selectedSlot && !selectedSlot.is_reserved && (
                      <div className="border-t">
                        <div className="px-5 py-4">
                          {/* Slot info summary */}
                          <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted/50 px-3.5 py-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Clock className="size-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground">
                                {selectedDayInfo?.fullPersian || selectedDate}
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {formatTime(selectedSlot.start_time)}
                                <span className="mx-1.5 text-muted-foreground/30">
                                  —
                                </span>
                                {formatTime(selectedSlot.end_time)}
                              </p>
                            </div>
                          </div>

                          {/* Price + action */}
                          <div className="flex items-center justify-between gap-4 rounded-xl bg-primary/5 px-4 py-3.5">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">
                                مبلغ قابل پرداخت
                              </p>
                              <p className="text-xl font-bold tracking-tight text-primary">
                                {formatPrice(selectedSlot.base_price)}
                              </p>
                            </div>
                            <Button
                              size="lg"
                              className="shrink-0 px-7 font-semibold shadow-xs"
                              onClick={() => handleBookSlot(selectedSlot)}
                            >
                              <CheckCircle2 className="ms-1.5 size-4" />
                              {isAuthenticated ? "تکمیل رزرو" : "ورود و رزرو"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ====== Right: Sidebar ====== */}
            <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
              {/* ── Map ── */}
              {court.latitude != null && court.longitude != null && (
                <div className="rounded-xl border bg-card">
                  <div className="flex items-center justify-between border-b px-5 py-3">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                      <MapPin className="size-4 shrink-0 text-primary" />
                      موقعیت مکانی
                    </h3>
                    <a
                      href={`https://www.google.com/maps?q=${court.latitude},${court.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      بزرگ‌نمایی
                    </a>
                  </div>
                  <CourtLocationMap
                    latitude={court.latitude}
                    longitude={court.longitude}
                    name={court.name}
                    height="200px"
                    interactive={false}
                  />
                </div>
              )}

              {/* ── Images ── */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
                  <ImagePlus className="size-4 shrink-0 text-primary" />
                  گالری تصاویر
                  {court.images && court.images.length > 0 && (
                    <span className="mr-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {toPersianDigits(court.images.length)}
                    </span>
                  )}
                </h3>
                {court.images && court.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {court.images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setLightboxIndex(i)
                          setLightboxOpen(true)
                        }}
                        className="group relative aspect-4/3 cursor-pointer overflow-hidden rounded-lg bg-muted"
                      >
                        <Image
                          src={img}
                          alt={`${court.name} - ${i + 1}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="py-1 text-xs text-muted-foreground/60">
                    تصویری برای این مجموعه ثبت نشده است
                  </p>
                )}
              </div>

              {/* ── Amenities ── */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
                  <Award className="size-4 shrink-0 text-primary" />
                  امکانات مجموعه
                </h3>
                {court.amenities && Object.keys(court.amenities).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(court.amenities).map(([key, val]) => (
                      <span
                        key={key}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
                          val
                            ? "bg-primary/10 font-medium text-primary"
                            : "bg-muted text-muted-foreground/50"
                        }`}
                      >
                        {amenityLabels[key] || key}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="py-1 text-xs text-muted-foreground/60">
                    امکاناتی برای این مجموعه ثبت نشده است
                  </p>
                )}
              </div>

              {/* ── Reviews ── */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
                  <MessageSquareText className="size-4 shrink-0 text-primary" />
                  نظرات کاربران
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {toPersianDigits(court.average_rating.toFixed(1))}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <Stars rating={court.average_rating} size={14} />
                    <span className="text-xs text-muted-foreground">
                      از {toPersianDigits(reviewsTotal)} نظر
                    </span>
                  </div>
                </div>
                {reviews.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-lg bg-muted/40 px-3.5 py-2.5"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {review.user_name || "کاربر"}
                          </span>
                          <Stars rating={review.rating} size={10} />
                        </div>
                        {review.comment && (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground/60">
                    هنوز نظری برای این مجموعه ثبت نشده است
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════
               Image Lightbox Dialog
               ═══════════════════════════════════ */}
          <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
            <DialogContent
              showCloseButton={false}
              className="max-w-[95vw] border-none bg-black/95 p-0 md:max-w-[85vw]"
            >
              <div className="relative flex h-[80vh] items-center justify-center">
                {/* Close button */}
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="absolute top-3 right-3 z-20 flex size-8 items-center justify-center rounded-full bg-black/60 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
                  aria-label="بستن"
                >
                  <X className="size-4" />
                </button>

                {/* Counter */}
                <span className="absolute top-3 left-3 z-20 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white/70">
                  {toPersianDigits(lightboxIndex + 1)} /{" "}
                  {toPersianDigits(court.images?.length ?? 0)}
                </span>

                {/* Previous */}
                {(court.images?.length ?? 0) > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setLightboxIndex((i) =>
                        i > 0 ? i - 1 : (court.images?.length ?? 1) - 1
                      )
                    }}
                    className="absolute left-3 z-20 flex size-10 items-center justify-center rounded-full bg-black/60 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
                    aria-label="قبلی"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                )}

                {/* Next */}
                {(court.images?.length ?? 0) > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setLightboxIndex((i) =>
                        i < (court.images?.length ?? 1) - 1 ? i + 1 : 0
                      )
                    }}
                    className="absolute right-3 z-20 flex size-10 items-center justify-center rounded-full bg-black/60 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
                    aria-label="بعدی"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                )}

                {/* Image */}
                <div className="relative h-full w-full p-8">
                  {court.images?.[lightboxIndex] && (
                    <Image
                      src={court.images[lightboxIndex]}
                      alt={`${court.name} - ${lightboxIndex + 1}`}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
