"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { Star, MapPin, Phone, LayoutDashboard } from "lucide-react"
import dynamic from "next/dynamic"
import { CourtAmenities } from "@/components/courts/court-amenities"
import { CourtReviews } from "@/components/courts/court-reviews"
import { CourtBooking } from "@/components/courts/court-booking"
import {
  Stars,
  sportLabels,
  sportColors,
  formatPrice,
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
    loading: () => <Skeleton className="h-56 w-full rounded-xl" />,
  }
)

// ── Loading skeleton ──

function LoadingSkeleton() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="relative flex-1 pt-16">
        <div className="mx-auto max-w-7xl px-4 pt-8 pb-20">
          <Skeleton className="h-12 w-64 rounded-lg" />
          <Skeleton className="mt-3 h-6 w-48 rounded-md" />
          <Skeleton className="mt-8 h-40 rounded-xl" />
          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-96 rounded-xl" />
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
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

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
  const canManage = user?.role === "manager" || user?.role === "admin"

  /* Fetch court + reviews */
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

  const minPrice = useMemo(
    () =>
      slots.length > 0 ? Math.min(...slots.map((s) => s.base_price)) : null,
    [slots]
  )

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
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="relative flex-1 pt-16">
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <MapPin className="size-12 text-muted-foreground/40" />
              <p className="text-lg text-muted-foreground">
                مجموعه مورد نظر یافت نشد
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/")}
              >
                بازگشت به صفحه اصلی
              </Button>
            </div>
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
        <div className="mx-auto max-w-7xl px-4 pt-8 pb-20">
          {/* ── Court Header ── */}
          <div className="mb-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {court.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Sport badges */}
                  {court.sport_types.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {court.sport_types.map((st) => (
                        <Badge
                          key={st}
                          variant="secondary"
                          className={sportColors[st] || ""}
                        >
                          {sportLabels[st] || st}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 text-sm">
                    <Stars rating={court.average_rating} size={14} />
                    <span className="font-semibold">
                      {toPersianDigits(court.average_rating.toFixed(1))}
                    </span>
                    {reviewsTotal > 0 && (
                      <span className="text-muted-foreground">
                        ({toPersianDigits(reviewsTotal)} نظر)
                      </span>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span>{court.address}</span>
                </div>
              </div>

              {/* Min price badge */}
              {minPrice != null && (
                <div className="shrink-0 rounded-xl border bg-card px-5 py-3 text-center shadow-xs">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    قیمت هر سانس از
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {formatPrice(minPrice)}
                  </p>
                </div>
              )}
            </div>

            {/* Management links */}
            {canManage && (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/courts/${courtId}`}>
                    <LayoutDashboard className="ms-1.5 size-4" />
                    مدیریت {court.name}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* ── Main Grid ── */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* ====== Left: main content ====== */}
            <div className="space-y-8 lg:col-span-2">
              {/* ── About ── */}
              <div className="rounded-xl border bg-card p-6">
                <div className="mb-5 flex items-center gap-2.5">
                  <h2 className="text-lg font-semibold">درباره مجموعه</h2>
                  <div className="mr-auto h-px flex-1 bg-linear-to-l from-border/60 to-transparent" />
                </div>
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    مجموعه ورزشی{" "}
                    <strong className="text-foreground">{court.name}</strong> با
                    ظرفیت{" "}
                    <strong className="text-foreground">
                      {toPersianDigits(court.capacity)} نفر
                    </strong>{" "}
                    و{" "}
                    {court.sport_types.length > 0 && (
                      <>
                        <strong className="text-foreground">
                          {toPersianDigits(court.sport_types.length)}
                        </strong>{" "}
                        رشته ورزشی شامل{" "}
                        {court.sport_types
                          .map((s) => sportLabels[s] || s)
                          .join("، ")}{" "}
                      </>
                    )}
                    آماده ارائه خدمات می‌باشد.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4 text-primary" />
                      <span>{court.address}</span>
                    </div>
                    {court.manager_name && (
                      <div className="inline-flex items-center gap-1.5">
                        <Star className="size-4 text-primary" />
                        <span>مدیر: {court.manager_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Amenities ── */}
              {court.amenities && (
                <CourtAmenities amenities={court.amenities} />
              )}

              {/* ── Reviews ── */}
              <CourtReviews
                reviews={reviews}
                averageRating={court.average_rating}
                total={reviewsTotal}
              />
            </div>

            {/* ====== Right: sidebar ====== */}
            <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
              {/* ── Booking ── */}
              <CourtBooking
                slots={slots}
                slotsLoading={slotsLoading}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                selectedSlot={selectedSlot}
                onSlotSelect={setSelectedSlot}
                isAuthenticated={isAuthenticated}
                onBook={handleBookSlot}
              />

              {/* ── Map ── */}
              {court.latitude != null && court.longitude != null && (
                <div className="overflow-hidden rounded-xl border">
                  <CourtLocationMap
                    latitude={court.latitude}
                    longitude={court.longitude}
                    name={court.name}
                    height="200px"
                    interactive={false}
                  />
                </div>
              )}

              {/* ── Manager contact ── */}
              {court.manager_phone && (
                <div className="rounded-xl border bg-card p-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    ارتباط با مجموعه
                  </p>
                  <a
                    href={`tel:${court.manager_phone}`}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    dir="ltr"
                  >
                    <Phone className="size-4" />
                    {toPersianDigits(court.manager_phone)}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
