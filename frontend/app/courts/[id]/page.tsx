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
import { FavoriteButton } from "@/components/courts/favorite-button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  MapPin,
  Star,
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Car,
  ShowerHead,
  Thermometer,
  Sofa,
  Building2,
  X,
  Phone,
  UserCircle,
  CalendarDays,
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
  manager_name?: string
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
  created_at: string
}

/* ── Constants ── */
const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
}

const sportColors: Record<string, string> = {
  volleyball: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  basketball: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  futsal: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  handball: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
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

const PERSIAN_DAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"]

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان"
}

function formatDate(dateStr: string): { dayName: string; dayNum: string; month: string; full: string } {
  const d = new Date(dateStr + "T12:00:00")
  return {
    dayName: d.toLocaleDateString("fa-IR", { weekday: "short" }),
    dayNum: d.toLocaleDateString("fa-IR", { day: "numeric" }),
    month: d.toLocaleDateString("fa-IR", { month: "short" }),
    full: d.toLocaleDateString("fa-IR"),
  }
}

function formatPersianDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
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
function SectionHeading({ icon, title, action }: { icon?: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      {icon && <span className="text-primary">{icon}</span>}
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mr-auto h-px flex-1 bg-gradient-to-l from-border/60 to-transparent" />
      {action}
    </div>
  )
}

/* ── Loading State ── */
function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Skeleton className="h-4 w-28 rounded-md" />
      <Skeleton className="mt-6 h-[320px] w-full rounded-2xl" />
      <div className="mt-8 space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
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
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const dates = useMemo(() => {
    const result: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      result.push(d.toLocaleDateString("en-CA"))
    }
    return result
  }, [])

  const today = dates[0]

  /* Fetch court + reviews */
  useEffect(() => {
    async function init() {
      try {
        const [courtRes, revRes] = await Promise.all([
          api<Court>(`/api/v1/courts/${courtId}`),
          api<{ reviews: Review[]; total: number }>(
            `/api/v1/courts/${courtId}/reviews?limit=5`
          ).catch(() => ({ reviews: [], total: 0 })),
        ])
        setCourt(courtRes)
        setSelectedDate(today)
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
  }, [courtId, today])

  /* Fetch slots */
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

  /* Prices */
  const minPrice = useMemo(
    () => (slots.length > 0 ? Math.min(...slots.map((s) => s.base_price)) : null),
    [slots]
  )

  /* Reviews stats */
  const reviewDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0]
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++
    })
    return dist
  }, [reviews])

  /* Actions */
  function handleBookSlot(slot: TimeSlot) {
    if (!isAuthenticated) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/book?slot_id=${slot.id}&court_id=${courtId}`)}`
      )
      return
    }
    router.push(`/book?slot_id=${slot.id}&court_id=${courtId}`)
  }

  function openLightbox(index: number) {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  if (loading) return <LoadingSkeleton />

  if (notFound || !court) {
    return (
      <div className="relative flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <Building2 className="size-12 text-muted-foreground/40" />
          <p className="text-lg text-muted-foreground">
            مجموعه مورد نظر یافت نشد
          </p>
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
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-16">
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

        {/* ── Image Gallery Carousel ── */}
        {court.images && court.images.length > 0 && (
          <div className="group relative mb-8 overflow-hidden rounded-2xl border">
            <Carousel className="w-full">
              <CarouselContent>
                {court.images.map((img, i) => (
                  <CarouselItem key={i}>
                    <div
                      className="relative aspect-[21/9] cursor-pointer"
                      onClick={() => openLightbox(i)}
                    >
                      <Image
                        src={img}
                        alt={`${court.name} - ${i + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                        priority={i === 0}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {court.images.length > 1 && (
                <>
                  <CarouselPrevious className="absolute right-4 top-1/2 size-10 -translate-y-1/2 border-0 bg-white/20 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-white/30 group-hover:opacity-100" />
                  <CarouselNext className="absolute left-4 top-1/2 size-10 -translate-y-1/2 border-0 bg-white/20 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-white/30 group-hover:opacity-100" />
                </>
              )}
              {/* Image counter */}
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                {court.images.map((_, i) => (
                  <div
                    key={i}
                    className="size-1.5 rounded-full bg-white/60 transition-all data-[active=true]:w-4 data-[active=true]:bg-white"
                    data-active={i === lightboxIndex}
                  />
                ))}
              </div>
            </Carousel>
          </div>
        )}

        {/* ── Court Info Hero ── */}
        <div className="mb-10">
          {/* Sport badges + Favorite */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {court.sport_types?.map((st) => (
              <Badge
                key={st}
                className={sportColors[st] || ""}
                variant="secondary"
              >
                {sportLabels[st] || st}
              </Badge>
            ))}
            <div className="mr-auto">
              <FavoriteButton courtId={court.id} size="sm" />
            </div>
          </div>

          {/* Court name + rating */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {court.name}
              </h1>
              <div className="mt-2 flex items-center gap-3">
                <Stars rating={court.average_rating} size={16} />
                <span className="text-sm font-semibold">
                  {toPersianDigits(court.average_rating.toFixed(1))}
                </span>
                {reviewsTotal > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({toPersianDigits(reviewsTotal)} نظر)
                  </span>
                )}
              </div>
            </div>

            {minPrice && (
              <div className="shrink-0 rounded-xl border bg-background/60 px-5 py-3 text-center backdrop-blur-sm">
                <p className="text-xs text-muted-foreground">قیمت هر سانس از</p>
                <p className="text-xl font-bold text-primary">
                  {formatPrice(minPrice)}
                </p>
              </div>
            )}
          </div>

          {/* Quick info strip */}
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0 text-primary/60" />
              <span className="max-w-[300px] truncate">{court.address}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="size-4 shrink-0 text-primary/60" />
              <span>ظرفیت {toPersianDigits(court.capacity)} نفر</span>
            </div>
            {court.manager_name && (
              <div className="flex items-center gap-1.5">
                <UserCircle className="size-4 shrink-0 text-primary/60" />
                <span>مدیر: {court.manager_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Main Content + Sidebar ── */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* ── Main Content ── */}
          <div className="space-y-8 lg:col-span-2">
            {/* Lightbox */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
              <DialogContent
                className="max-w-[90vw] border-0 bg-black/95 p-0 sm:max-w-4xl"
                showCloseButton={false}
              >
                <DialogTitle className="sr-only">تصاویر {court.name}</DialogTitle>
                <div className="relative flex aspect-video items-center justify-center">
                  {court.images && court.images[lightboxIndex] && (
                    <Image
                      src={court.images[lightboxIndex]}
                      alt={`${court.name} - ${lightboxIndex + 1}`}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  )}
                  <DialogClose asChild>
                    <button className="absolute top-3 left-3 flex size-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white">
                      <X className="size-4" />
                    </button>
                  </DialogClose>
                  {court.images && lightboxIndex > 0 && (
                    <button
                      onClick={() => setLightboxIndex(lightboxIndex - 1)}
                      className="absolute right-3 flex size-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  )}
                  {court.images && lightboxIndex < court.images.length - 1 && (
                    <button
                      onClick={() => setLightboxIndex(lightboxIndex + 1)}
                      className="absolute left-3 flex size-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                  )}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs text-white/80 backdrop-blur-xs">
                    {toPersianDigits(lightboxIndex + 1)} / {toPersianDigits(court.images?.length || 0)}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Location & Map */}
            {court.latitude != null && court.longitude != null && (
              <div className="rounded-xl border bg-card p-5">
                <SectionHeading
                  icon={<MapPin className="size-5" />}
                  title="موقعیت روی نقشه"
                />
                <p className="mb-3 text-sm text-muted-foreground">
                  {court.address}
                </p>
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
                <SectionHeading
                  icon={<Building2 className="size-5" />}
                  title="امکانات"
                />
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
            {reviews.length > 0 && (
              <div className="rounded-xl border bg-card p-5">
                <SectionHeading
                  icon={<Star className="size-5 text-amber-400" />}
                  title="نظرات کاربران"
                />

                {/* Rating summary */}
                <div className="mb-6 flex flex-wrap items-start gap-6 rounded-lg bg-muted/30 p-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-4xl font-bold">
                      {toPersianDigits(court.average_rating.toFixed(1))}
                    </span>
                    <Stars rating={court.average_rating} size={14} />
                    <span className="text-xs text-muted-foreground">
                      {toPersianDigits(reviewsTotal)} نظر
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviewDistribution[star - 1]
                      const pct = reviewsTotal > 0 ? (count / reviewsTotal) * 100 : 0
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-4 text-left font-medium">{toPersianDigits(star)}</span>
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted-foreground/20">
                            <div
                              className="h-full rounded-full bg-amber-400 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-5 text-muted-foreground">{toPersianDigits(count)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Review list */}
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {(rev.user_name || "ک")[0]}
                          </div>
                          <div>
                            <span className="text-sm font-medium">
                              {rev.user_name || "کارگر"}
                            </span>
                            <span className="mr-2 text-xs text-muted-foreground">
                              {formatPersianDate(rev.created_at)}
                            </span>
                          </div>
                        </div>
                        <Stars rating={rev.rating} size={14} />
                      </div>
                      {rev.comment && (
                        <p className="pr-11 text-sm leading-relaxed text-muted-foreground">
                          {rev.comment}
                        </p>
                      )}
                      {rev.response && (
                        <div className="mt-3 mr-11 rounded-lg border-r-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                          <span className="mb-1 block text-xs font-medium text-muted-foreground">
                            پاسخ مدیریت:
                          </span>
                          {rev.response}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {reviewsTotal > 5 && (
                  <Button variant="outline" className="mt-4 w-full" asChild>
                    <Link href={`/courts/${courtId}/reviews`}>
                      مشاهده همه {toPersianDigits(reviewsTotal)} نظر
                      <ChevronLeft className="mr-2 size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            {/* Sidebar — Manager Info */}
            {court.manager_name && (
              <div className="rounded-xl border bg-card shadow-sm">
                <div className="flex items-center gap-3 border-b px-5 py-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <UserCircle className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight truncate">
                      {court.manager_name}
                    </p>
                    <p className="text-xs text-muted-foreground">مدیر مجموعه</p>
                  </div>
                </div>
                <div className="divide-y">
                  <div className="flex items-center gap-3 px-5 py-3 text-sm text-muted-foreground">
                    <Phone className="size-4 shrink-0" />
                    <span>برای هماهنگی با مجموعه تماس بگیرید</span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-3 text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0" />
                    <span className="truncate">{court.address}</span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-3 text-sm text-muted-foreground">
                    <Users className="size-4 shrink-0" />
                    <span>ظرفیت {toPersianDigits(court.capacity)} نفر</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sidebar — Booking */}
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
                {/* Date picker strip */}
                <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {dates.map((date) => {
                    const { dayName, dayNum, month } = formatDate(date)
                    const isToday = date === today
                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`flex min-w-[68px] shrink-0 flex-col items-center gap-0.5 rounded-lg border py-2.5 text-sm transition-all ${
                          selectedDate === date
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border/60 bg-background/40 hover:border-muted-foreground/30 hover:bg-muted/30"
                        }`}
                      >
                        <span className="text-[10px] font-medium opacity-70">
                          {dayName}
                        </span>
                        <span className="text-base font-bold">{dayNum}</span>
                        <span className="text-[9px] font-medium opacity-70">
                          {isToday ? "امروز" : month}
                        </span>
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
                    <CalendarDays className="size-8 opacity-40" />
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
                                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                                : "border-border/60 bg-background/40 hover:border-primary/30 hover:bg-muted/20 hover:shadow-sm"
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
