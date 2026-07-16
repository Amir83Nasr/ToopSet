"use client"

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { api, ApiError, buildVendorImageUrl } from "@/lib/api"
import { toast } from "@/lib/toast"
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
  Share2,
} from "lucide-react"
import dynamic from "next/dynamic"
import { ImageLightbox } from "@/components/ui/image-lightbox"
import {
  Stars,
  sportLabels,
  sportColors,
  amenityLabels,
  formatPrice,
  formatTime,
  isSlotBookable,
  type VendorData,
  type TimeSlot,
  type Review,
} from "@/components/vendors/vendor-shared"

const VendorLocationMap = dynamic(
  () =>
    import("@/components/map/vendor-location-map").then(
      (m) => m.VendorLocationMap
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

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
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

// ── Gallery image with error fallback ──

const GalleryImage = memo(function GalleryImage({
  img,
  name,
  index,
  onClick,
}: {
  img: string
  name: string
  index: number
  onClick: () => void
}) {
  const [error, setError] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-4/3 cursor-pointer overflow-hidden rounded-lg bg-muted"
    >
      {error ? (
        <div className="flex h-full items-center justify-center">
          <ImagePlus className="size-8 text-muted-foreground/30" />
        </div>
      ) : (
        <Image
          src={buildVendorImageUrl(img)}
          alt={`${name} - ${index + 1}`}
          fill
          sizes="(max-width: 1024px) 50vw, 220px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={index === 0}
          onError={() => setError(true)}
        />
      )}
    </button>
  )
})

// ── Share location via Web Share API with fallback ──

async function shareLocation(
  name: string,
  address: string,
  lat: number,
  lng: number
) {
  // geo: URI opens system map-app chooser on Android (Balad, Neshan, Google Maps, etc.)
  const geoUri = `geo:${lat},${lng}`
  // Google Maps URL as desktop fallback
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: name,
        text: `${name}\n${address}`,
        url: geoUri,
      })
      return
    } catch {
      // User dismissed or error — fall through to URL open
    }
  }

  window.open(mapsUrl, "_blank", "noopener,noreferrer")
}

// Frozen timestamp for slot expiry checks — computed once at module load so the
// React Compiler does not flag a mutable ref or an impure render-time call.
const NOW = Date.now()

export default function PublicVendorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const vendorId = Number(params.id)

  const [vendor, setVendor] = useState<VendorData | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [weekOffset, setWeekOffset] = useState(0)
  // Default to today so visitors see current day slots on first load
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const t = new Date()
    const y = t.getFullYear()
    const m = String(t.getMonth() + 1).padStart(2, "0")
    const d = String(t.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  })
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showMap, setShowMap] = useState(false)
  const mapSectionRef = useRef<HTMLDivElement>(null)

  const canManage = user?.role === "manager" || user?.role === "admin"

  // ── Week calculation ──

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset])
  const publicMinDate = useMemo(() => enCa(new Date()), [])
  const publicMaxDate = useMemo(() => enCa(addDays(new Date(), 14)), [])

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

  const canGoPrevWeek = weekOffset > 0
  const canGoNextWeek = useMemo(() => {
    const nextWeekStart = getWeekStart(weekOffset + 1)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(nextWeekStart)
      d.setDate(nextWeekStart.getDate() + i)
      return enCa(d)
    }).some((dateStr) => dateStr >= publicMinDate && dateStr <= publicMaxDate)
  }, [publicMaxDate, publicMinDate, weekOffset])

  // Effective selected date — falls back to first day when selection is invalid
  const effectiveDate = useMemo(() => {
    if (
      selectedDate &&
      weekDays.find(
        (d) =>
          d.date === selectedDate &&
          d.date >= publicMinDate &&
          d.date <= publicMaxDate
      )
    ) {
      return selectedDate
    }
    return (
      weekDays.find((d) => d.date >= publicMinDate && d.date <= publicMaxDate)
        ?.date || ""
    )
  }, [selectedDate, weekDays, publicMinDate, publicMaxDate])

  // ── Fetch vendor + reviews ──

  useEffect(() => {
    async function init() {
      try {
        const [vendorRes, revRes] = await Promise.all([
          api<VendorData>(`/api/v1/vendors/${vendorId}`),
          api<{ reviews: Review[]; total: number }>(
            `/api/v1/vendors/${vendorId}/reviews?limit=5`
          ).catch(() => ({ reviews: [], total: 0 })),
        ])
        setVendor(vendorRes)
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
  }, [vendorId])

  // ── Fetch slots ──

  const fetchSlots = useCallback(
    async (date: string) => {
      if (!date) return
      setSlotsLoading(true)
      setSelectedSlot(null)
      try {
        const res = await api<{ slots: TimeSlot[]; total: number }>(
          `/api/v1/vendors/${vendorId}/slots?date=${date}&limit=50`
        )
        setSlots(res.slots)
      } catch (err) {
        console.error(
          "fetchSlots error:",
          err,
          "date:",
          date,
          "vendorId:",
          vendorId
        )
        setSlots([])
      } finally {
        setSlotsLoading(false)
      }
    },
    [vendorId]
  )

  useEffect(() => {
    if (!effectiveDate || !vendorId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSlots(effectiveDate)
  }, [effectiveDate, vendorId, fetchSlots])

  function handleBookSlot(slot: TimeSlot) {
    if (new Date(slot.start_time).getTime() <= NOW) {
      toast.error("زمان این سانس گذشته و دیگر قابل رزرو نیست")
      return
    }
    if (!isAuthenticated) {
      toast.info("برای رزرو سانس باید اول وارد شوید", {
        description: "بعد از ورود، همین سانس برای ادامه رزرو باز می‌شود.",
      })
      router.push(
        `/login?reason=login_required&redirect=${encodeURIComponent(`/book?slot_id=${slot.id}&vendor_id=${vendorId}`)}`
      )
      return
    }
    router.push(`/book?slot_id=${slot.id}&vendor_id=${vendorId}`)
  }

  function goPrevWeek() {
    setWeekOffset((prev) => Math.max(0, prev - 1))
  }

  function goNextWeek() {
    if (canGoNextWeek) setWeekOffset((prev) => prev + 1)
  }

  // ── Render ──

  if (loading) return <LoadingSkeleton />

  if (notFound || !vendor) {
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
               Vendor Hero Card
               ═══════════════════════════════════ */}
          <div className="mb-10 overflow-hidden rounded-xl border bg-card">
            <div className="flex items-start justify-between gap-4 p-5 md:p-6">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {vendor.sport_types.map((st) => (
                    <Badge
                      key={st}
                      variant="secondary"
                      className={sportColors[st] || ""}
                    >
                      {sportLabels[st] || st}
                    </Badge>
                  ))}
                </div>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {vendor.name}
                </h1>
                <div className="flex items-center gap-1.5 text-sm">
                  <Stars rating={vendor.average_rating} size={15} />
                  <span className="font-semibold text-foreground">
                    {toPersianDigits(vendor.average_rating.toFixed(1))}
                  </span>
                  {reviewsTotal > 0 && (
                    <span className="text-muted-foreground">
                      ({toPersianDigits(reviewsTotal)} نظر)
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="shrink-0"
                >
                  <Link href={`/dashboard/vendors/${vendorId}`}>
                    <LayoutDashboard className="ms-1.5 size-3.5" />
                    مدیریت
                  </Link>
                </Button>
              )}
            </div>

            {/* Info grid */}
            <div className="border-t bg-muted/30 px-5 py-4 md:px-6">
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="flex items-start gap-3 max-sm:flex-col">
                    <div className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 md:flex">
                      <MapPin className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 self-stretch">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        آدرس
                      </p>
                      <p className="text-sm font-medium break-words text-foreground">
                        {vendor.address}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2 max-sm:w-full max-sm:flex-col">
                      <Button
                        size={"sm"}
                        variant={"outline"}
                        className="whitespace-nowrap max-sm:w-full max-sm:justify-center"
                        onClick={() =>
                          shareLocation(
                            vendor.name,
                            vendor.address,
                            vendor.latitude,
                            vendor.longitude
                          )
                        }
                      >
                        <Share2 className="size-3.5" />
                        اشتراک گذاری موقعیت
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground">
                      ظرفیت
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {toPersianDigits(vendor.capacity)} نفر
                    </p>
                  </div>
                </div>
                {vendor.manager_phone && (
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Phone className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground">
                        شماره تماس
                      </p>
                      <a
                        href={`tel:${vendor.manager_phone}`}
                        className="text-sm font-medium text-primary hover:underline"
                        dir="ltr"
                      >
                        {toPersianDigits(vendor.manager_phone)}
                      </a>
                    </div>
                  </div>
                )}
                {vendor.manager_name && (
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Info className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground">
                        مدیر مجموعه
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {vendor.manager_name}
                      </p>
                    </div>
                  </div>
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
                      disabled={!canGoPrevWeek}
                      className="inline-flex size-7 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card disabled:hover:text-muted-foreground"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                    <span className="min-w-32 text-center text-xs font-semibold text-foreground">
                      {weekRange}
                    </span>
                    <button
                      onClick={goNextWeek}
                      disabled={!canGoNextWeek}
                      className="inline-flex size-7 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card disabled:hover:text-muted-foreground"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                  </div>
                </div>

                {/* ── Day tabs ── */}
                <div className="flex border-b">
                  {weekDays.map((day) => {
                    const isActive = day.date === selectedDate
                    const isOutsideWindow =
                      day.date < publicMinDate || day.date > publicMaxDate
                    return (
                      <button
                        key={day.date}
                        disabled={isOutsideWindow}
                        onClick={() => {
                          if (isOutsideWindow) return
                          setSelectedDate(day.date)
                          setSelectedSlot(null)
                        }}
                        className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-center transition-colors ${
                          isOutsideWindow
                            ? "cursor-not-allowed border-b-2 border-transparent text-muted-foreground/35"
                            : isActive
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
                      {/* Header row — hidden on mobile (card layout is self-describing) */}
                      <div className="hidden items-center border-b bg-muted/30 px-4 py-2.5 sm:flex">
                        <span className="w-20 text-xs font-medium text-muted-foreground">
                          روز
                        </span>
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
                          const isPast =
                            new Date(slot.start_time).getTime() <= NOW
                          const bookable = isSlotBookable(slot)
                          const disabled = !bookable || isPast
                          const slotDay = new Date(
                            slot.start_time
                          ).toLocaleDateString("fa-IR", { weekday: "long" })
                          return (
                            <button
                              key={slot.id}
                              onClick={() =>
                                !disabled &&
                                setSelectedSlot((prev) =>
                                  prev?.id === slot.id ? null : slot
                                )
                              }
                              disabled={disabled}
                              className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-b px-4 py-3.5 text-right transition-colors sm:flex ${
                                disabled
                                  ? "cursor-not-allowed opacity-35"
                                  : isSelected
                                    ? "bg-primary/5"
                                    : "cursor-pointer hover:bg-muted/20"
                              }`}
                            >
                              <div className="order-3 text-xs font-medium text-muted-foreground sm:order-none sm:w-20">
                                {slotDay}
                              </div>
                              <div className="order-1 col-span-2 flex flex-1 items-center gap-3 sm:order-none sm:col-span-1">
                                <div
                                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                    disabled
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
                              <div className="order-4 text-left sm:order-none sm:w-28 sm:text-center">
                                <span
                                  className={`text-sm font-bold ${
                                    disabled
                                      ? "text-muted-foreground"
                                      : "text-primary"
                                  }`}
                                >
                                  {formatPrice(slot.base_price)}
                                </span>
                              </div>
                              <div className="order-2 flex justify-end sm:order-none sm:w-24 sm:justify-center">
                                {isPast ? (
                                  <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[10px] font-semibold text-muted-foreground">
                                    گذشته
                                  </span>
                                ) : slot.is_reserved ? (
                                  <span className="inline-flex h-6 items-center rounded-full border border-emerald-200 bg-emerald-50/60 px-2.5 text-[10px] font-semibold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                                    آزاد
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
                    {selectedSlot &&
                      isSlotBookable(selectedSlot) &&
                      new Date(selectedSlot.start_time).getTime() > NOW && (
                        <div className="pb-safe sticky bottom-0 z-20 border-t bg-card/95 backdrop-blur-sm lg:static lg:z-auto lg:bg-transparent lg:backdrop-blur-none">
                          <div className="px-5 py-4">
                            {/* Slot info + pricing combined */}
                            <div className="rounded-lg bg-primary/5 px-4 py-3.5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <Clock className="size-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground">
                                      {selectedDayInfo?.fullPersian ||
                                        selectedDate}
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
                                <div className="text-left">
                                  <p className="text-[10px] font-medium text-muted-foreground">
                                    مبلغ قابل پرداخت
                                  </p>
                                  <p className="text-base font-bold text-primary">
                                    {formatPrice(selectedSlot.base_price)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <Button
                              size="md"
                              className="mt-3 w-full font-semibold shadow-xs"
                              onClick={() => handleBookSlot(selectedSlot)}
                            >
                              <CheckCircle2 className="ms-1.5 size-4" />
                              {isAuthenticated ? "تکمیل رزرو" : "ورود و رزرو"}
                            </Button>
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>

            {/* ====== Right: Sidebar ====== */}
            <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
              {/* ── Map (lazy, hidden by default) ── */}
              {vendor.latitude != null && vendor.longitude != null && (
                <div className="rounded-xl border bg-card" ref={mapSectionRef}>
                  {!showMap ? (
                    <button
                      onClick={() => setShowMap(true)}
                      className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-muted/20"
                    >
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <MapPin className="size-4 shrink-0 text-primary" />
                        موقعیت مکانی
                      </span>
                      <span className="text-xs text-primary">
                        نمایش روی نقشه
                      </span>
                    </button>
                  ) : (
                    <>
                      <div className="flex items-center justify-between border-b px-5 py-3">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                          <MapPin className="size-4 shrink-0 text-primary" />
                          موقعیت مکانی
                        </h3>
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://www.google.com/maps?q=${vendor.latitude},${vendor.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            باز کردن در گوگل مپ
                          </a>
                          <button
                            onClick={() => setShowMap(false)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                            aria-label="بستن نقشه"
                          >
                            بستن
                          </button>
                        </div>
                      </div>
                      <VendorLocationMap
                        latitude={vendor.latitude}
                        longitude={vendor.longitude}
                        name={vendor.name}
                        height="200px"
                        interactive={true}
                      />
                    </>
                  )}
                </div>
              )}

              {/* ── Images ── */}
              <div className="rounded-xl border bg-card p-5">
                <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
                  <ImagePlus className="size-4 shrink-0 text-primary" />
                  گالری تصاویر
                  {vendor.images && vendor.images.length > 0 && (
                    <span className="mr-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {toPersianDigits(vendor.images.length)}
                    </span>
                  )}
                </h3>
                {vendor.images && vendor.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {vendor.images.map((img, i) => (
                      <GalleryImage
                        key={i}
                        img={img}
                        name={vendor.name}
                        index={i}
                        onClick={() => {
                          setLightboxIndex(i)
                          setLightboxOpen(true)
                        }}
                      />
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
                {vendor.amenities &&
                Object.values(vendor.amenities).some((v) => v === true) ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(vendor.amenities)
                      .filter(([, val]) => val === true)
                      .map(([key]) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors"
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
                    {toPersianDigits(vendor.average_rating.toFixed(1))}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <Stars rating={vendor.average_rating} size={14} />
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
          <ImageLightbox
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            images={vendor.images ?? []}
            vendorName={vendor?.name ?? ""}
            lightboxIndex={lightboxIndex}
            setLightboxIndex={setLightboxIndex}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
