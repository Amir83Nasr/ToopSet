"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FavoriteButton } from "@/components/courts/favorite-button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  ArrowLeft,
  MapPin,
  Star,
  Users,
  Clock,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Wifi,
  Car,
  ShowerHead,
  Thermometer,
  Sofa,
  Building2,
} from "lucide-react"
import dynamic from "next/dynamic"

const CourtLocationMap = dynamic(
  () =>
    import("@/components/map/court-location-map").then(
      (m) => m.CourtLocationMap
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-56 w-full rounded-xl" />,
  }
)

/* ── Types ── */
interface Court {
  id: number
  name: string
  sport_types: string[]
  address: string
  latitude: number
  longitude: number
  capacity: number
  is_active: boolean
  average_rating: number
  amenities?: Record<string, boolean>
  images?: string[]
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

interface Review {
  id: number
  user_name?: string
  rating: number
  comment?: string
  response?: string
}

/* ── Constants ── */
const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
}

const amenityIcons: Record<string, React.ReactNode> = {
  toilet: <ShowerHead className="size-4" />,
  water_cooler: <Wifi className="size-4" />,
  standard_flooring: <Building2 className="size-4" />,
  spectator_seating: <Sofa className="size-4" />,
  air_conditioning: <Thermometer className="size-4" />,
  parking: <Car className="size-4" />,
  locker_room: <Building2 className="size-4" />,
}

const amenityLabels: Record<string, string> = {
  toilet: "سرویس بهداشتی",
  water_cooler: "آبسردکن",
  standard_flooring: "کفپوش استاندارد",
  spectator_seating: "جایگاه تماشاگر",
  air_conditioning: "تهویه مطبوع",
  parking: "پارکینگ",
  locker_room: "رختکن",
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان"
}

function formatDate(dateStr: string): { dayName: string; dayNum: string; month: string } {
  const d = new Date(dateStr + "T12:00:00")
  return {
    dayName: d.toLocaleDateString("fa-IR", { weekday: "short" }),
    dayNum: d.toLocaleDateString("fa-IR", { day: "numeric" }),
    month: d.toLocaleDateString("fa-IR", { month: "short" }),
  }
}

/* ── Stars Component ── */
function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/20"
          }
        />
      ))}
    </div>
  )
}

/* ── Section Heading ── */
function SectionHeading({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      {icon && <span className="text-primary">{icon}</span>}
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mr-auto h-px flex-1 bg-gradient-to-l from-border/60 to-transparent" />
    </div>
  )
}

/* ── Loading State ── */
function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Skeleton className="h-4 w-28 rounded-md" />
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
      <div className="mt-8 space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function PublicCourtDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const courtId = Number(params.id)

  const [court, setCourt] = useState<Court | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [recentReviews, setRecentReviews] = useState<Review[]>([])
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  const getDates = useCallback(() => {
    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      dates.push(d.toISOString().split("T")[0])
    }
    return dates
  }, [])

  const today = new Date().toISOString().split("T")[0]
  const dates = getDates()

  // Fetch court + reviews
  useEffect(() => {
    async function init() {
      try {
        const courtRes = await api<Court>(`/api/v1/courts/${courtId}`)
        setCourt(courtRes)
        setSelectedDate(today)
        try {
          const revRes = await api<{ reviews: Review[]; total: number }>(
            `/api/v1/courts/${courtId}/reviews?limit=5`
          )
          setRecentReviews(revRes.reviews || [])
        } catch {
          // reviews may not be available
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [courtId, today])

  // Fetch slots
  const fetchSlots = useCallback(
    async (date: string) => {
      setSlotsLoading(true)
      setSelectedSlot(null)
      try {
        const res = await api<{ slots: TimeSlot[]; total: number }>(
          `/api/v1/courts/${courtId}/slots?date=${date}&limit=50`
        )
        setSlots(res.slots)
      } catch {
        setSlots([])
      } finally {
        setSlotsLoading(false)
      }
    },
    [courtId]
  )

  useEffect(() => {
    if (!selectedDate) return
    const timer = setTimeout(() => fetchSlots(selectedDate), 0)
    return () => clearTimeout(timer)
  }, [selectedDate, fetchSlots])

  function handleBookSlot(slot: TimeSlot) {
    if (!isAuthenticated) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/book?slot_id=${slot.id}&court_id=${courtId}`)}`
      )
      return
    }
    router.push(`/book?slot_id=${slot.id}&court_id=${courtId}`)
  }

  if (loading) return <LoadingSkeleton />

  if (notFound || !court) {
    return (
      <div className="relative flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <Building2 className="size-12 text-muted-foreground/40" />
          <p className="text-lg text-muted-foreground">زمین مورد نظر یافت نشد</p>
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="ml-2 size-4" />
            بازگشت به صفحه اصلی
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        {/* ── Breadcrumb ── */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">خانه</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{court.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* ── Hero Section ── */}
        <div className="relative mb-10 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-chart-1/5">
          {/* Subtle background pattern */}
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.03]" />

          <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              {/* Sport badges + Favorite */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {court.sport_types?.map((st) => {
                  const colorMap: Record<string, string> = {
                    volleyball: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
                    basketball: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
                    futsal: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
                    handball: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
                  }
                  return (
                    <Badge
                      key={st}
                      variant="outline"
                      className={`border px-3 py-1 text-xs font-medium ${colorMap[st] || ""}`}
                    >
                      {sportLabels[st] || st}
                    </Badge>
                  )
                })}
                <FavoriteButton courtId={court.id} size="sm" />
              </div>

              {/* Court name */}
              <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                {court.name}
              </h1>

              {/* Quick stats row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 text-primary/60" />
                  <span className="truncate max-w-[260px]">{court.address}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="size-4 shrink-0 text-primary/60" />
                  <span>ظرفیت {toPersianDigits(court.capacity)} نفر</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="size-4 shrink-0 text-amber-400" />
                  <span className="font-semibold text-foreground">
                    {toPersianDigits(court.average_rating.toFixed(1))}
                  </span>
                  <Stars rating={court.average_rating} size={14} />
                </div>
              </div>
            </div>

            {/* Price range badge */}
            <div className="flex shrink-0 items-center gap-3 self-start lg:self-auto">
              <div className="rounded-xl border bg-background/60 px-4 py-2.5 text-center backdrop-blur-sm">
                <p className="text-xs text-muted-foreground">قیمت هر سانس از</p>
                <p className="text-lg font-bold text-primary">
                  {slots.length > 0
                    ? formatPrice(Math.min(...slots.map((s) => s.base_price)))
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content + Sidebar ── */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* ── Main Content ── */}
          <div className="space-y-8 lg:col-span-2">
            {/* Images */}
            {court.images && court.images.length > 0 && (
              <div className="overflow-hidden rounded-xl border">
                <div className="relative aspect-[21/9]">
                  <Image
                    src={court.images[0]}
                    alt={court.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {/* Gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                </div>
                {court.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto border-t bg-muted/30 p-2">
                    {court.images.slice(1, 5).map((img, i) => (
                      <div
                        key={i}
                        className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg"
                      >
                        <Image
                          src={img}
                          alt={`${court.name} - ${i + 2}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                    {court.images.length > 5 && (
                      <div className="flex aspect-video w-24 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                        +{court.images.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Map */}
            {court.latitude != null && court.longitude != null && (
              <div className="rounded-xl border bg-card p-5">
                <SectionHeading icon={<MapPin className="size-5" />} title="موقعیت روی نقشه" />
                <CourtLocationMap
                  latitude={court.latitude}
                  longitude={court.longitude}
                  name={court.name}
                  height="280px"
                  interactive
                />
              </div>
            )}

            {/* Amenities */}
            {court.amenities && Object.keys(court.amenities).length > 0 && (
              <div className="rounded-xl border bg-card p-5">
                <SectionHeading icon={<Building2 className="size-5" />} title="امکانات" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Object.entries(court.amenities).map(([key, val]) => (
                    <div
                      key={key}
                      className={`flex items-center gap-2.5 rounded-lg border p-3 text-sm transition-colors ${
                        val
                          ? "border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/10"
                          : "border-border/50 bg-muted/20 text-muted-foreground/50"
                      }`}
                    >
                      {val ? (
                        <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                      ) : (
                        <XCircle className="size-4 shrink-0 text-muted-foreground/30" />
                      )}
                      <span className={val ? "font-medium" : "line-through"}>
                        {amenityLabels[key] || key}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {recentReviews.length > 0 && (
              <div className="rounded-xl border bg-card p-5">
                <SectionHeading
                  icon={<Star className="size-5 text-amber-400" />}
                  title="نظرات کاربران"
                />
                <div className="space-y-4">
                  {recentReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {(rev.user_name || "ک")[0]}
                          </div>
                          <span className="text-sm font-medium">
                            {rev.user_name || "کاربر"}
                          </span>
                        </div>
                        <Stars rating={rev.rating} size={14} />
                      </div>
                      {rev.comment && (
                        <p className="pr-10 text-sm leading-relaxed text-muted-foreground">
                          {rev.comment}
                        </p>
                      )}
                      {rev.response && (
                        <div className="mr-10 mt-3 rounded-lg border-r-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                          <span className="mb-1 block text-xs font-medium text-muted-foreground">
                            پاسخ مدیر:
                          </span>
                          {rev.response}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="mt-4 w-full" asChild>
                  <Link href={`/courts/${courtId}/reviews`}>
                    مشاهده همه نظرات
                    <ChevronLeft className="mr-2 size-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* ── Sidebar — Booking ── */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <Calendar className="size-5 text-primary" />
                  <h3 className="font-semibold">سانس‌های موجود</h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  تاریخ مورد نظر را انتخاب کنید
                </p>
              </div>

              <div className="p-5">
                {/* Date picker */}
                <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
                  {dates.map((date) => {
                    const { dayName, dayNum } = formatDate(date)
                    const isToday = date === today
                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`flex min-w-[64px] shrink-0 flex-col items-center gap-0.5 rounded-lg border py-2.5 text-sm transition-all ${
                          selectedDate === date
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border/60 bg-background/40 hover:border-muted-foreground/30 hover:bg-muted/30"
                        }`}
                      >
                        <span className="text-[10px] font-medium opacity-70">
                          {dayName}
                        </span>
                        <span className="text-base font-bold">{dayNum}</span>
                        {isToday && (
                          <span className="text-[9px] font-medium opacity-70">
                            امروز
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Slots */}
                {slotsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
                    <Calendar className="size-8 opacity-40" />
                    <p className="text-sm">سانسی موجود نیست</p>
                    <p className="text-xs">تاریخ دیگری انتخاب کنید</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id
                      return (
                        <button
                          key={slot.id}
                          onClick={() =>
                            !slot.is_reserved && setSelectedSlot(slot)
                          }
                          disabled={slot.is_reserved}
                          className={`flex w-full items-center justify-between rounded-lg border p-3 text-right transition-all ${
                            slot.is_reserved
                              ? "border-red-200/50 bg-red-50/30 opacity-60 dark:border-red-900/20 dark:bg-red-950/5"
                              : isSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border/60 bg-background/40 hover:border-primary/30 hover:bg-muted/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex size-10 items-center justify-center rounded-lg ${
                                slot.is_reserved
                                  ? "bg-muted"
                                  : isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-primary/10 text-primary"
                              }`}
                            >
                              <Clock className="size-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {formatTime(slot.start_time)} —{" "}
                                {formatTime(slot.end_time)}
                              </p>
                              <p className="text-xs text-muted-foreground">
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
                            className="shrink-0 text-[10px]"
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
                )}

                {/* Book button */}
                {selectedSlot && !selectedSlot.is_reserved && (
                  <div className="mt-5 space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">مبلغ قابل پرداخت</span>
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(selectedSlot.base_price)}
                      </span>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleBookSlot(selectedSlot)}
                    >
                      رزرو کن
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
