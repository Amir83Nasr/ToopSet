"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
  Building2,
  Phone,
  UserCircle,
  Pencil,
  LayoutDashboard,
  Users,
  X,
  MapPin,
  Clock,
} from "lucide-react"
import dynamic from "next/dynamic"
import { CourtHeroGallery } from "@/components/courts/court-image-gallery"
import { QuickStats } from "@/components/courts/court-hero"
import { CourtAmenities } from "@/components/courts/court-amenities"
import { CourtReviews } from "@/components/courts/court-reviews"
import { CourtBooking } from "@/components/courts/court-booking"
import { SectionHeading } from "@/components/courts/court-shared"
import type {
  CourtData,
  TimeSlot,
  Review,
} from "@/components/courts/court-shared"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import type { DateRange } from "@daypicker/react"

const CourtLocationMap = dynamic(
  () =>
    import("@/components/map/court-location-map").then(
      (m) => m.CourtLocationMap
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-56 w-full rounded-2xl" />,
  }
)

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Skeleton className="h-4 w-28 rounded-md" />
      <Skeleton className="mt-6 h-[400px] w-full rounded-3xl" />
      <Skeleton className="mt-6 h-20 w-full rounded-2xl" />
      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
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
  const [dateRange, setDateRange] = useState<DateRange>()

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

  /* Prices */
  const minPrice = useMemo(
    () =>
      slots.length > 0 ? Math.min(...slots.map((s) => s.base_price)) : null,
    [slots]
  )

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
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-6 pb-16">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">خانه</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>جزئیات مجموعه</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>{court.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Management link for manager/admin */}
        {canManage && (
          <div className="mb-4 flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/courts">
                <LayoutDashboard className="ml-1.5 size-4" />
                داشبورد مدیریت
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/courts/${courtId}/edit`}>
                <Pencil className="ml-1.5 size-4" />
                ویرایش
              </Link>
            </Button>
          </div>
        )}

        {/* Hero Gallery — combined hero + image carousel */}
        <CourtHeroGallery
          images={court.images || []}
          courtName={court.name}
          courtId={court.id}
          sportTypes={court.sport_types}
          averageRating={court.average_rating}
          reviewsTotal={reviewsTotal}
          minPrice={minPrice}
        />

        {/* QuickStats Bar */}
        <QuickStats court={court} reviewsTotal={reviewsTotal} />

        {/* Main Content + Sidebar */}
        <div className="grid gap-8 lg:grid-cols-5">
          {/* ── Left column: main content ── */}
          <div className="space-y-8 lg:col-span-3">
            {/* About Section */}
            <div className="rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md">
              <SectionHeading
                icon={<Building2 className="size-5" />}
                title="درباره مجموعه"
              />
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  مجموعه ورزشی <strong>{court.name}</strong> با دارا بودن{" "}
                  {court.sport_types.length > 0 && (
                    <>
                      <strong>
                        {toPersianDigits(court.sport_types.length)}
                      </strong>{" "}
                      رشته ورزشی مختلف (شامل{" "}
                      {court.sport_types
                        .map((s) => {
                          const labels: Record<string, string> = {
                            volleyball: "والیبال",
                            basketball: "بسکتبال",
                            futsal: "فوتسال",
                            handball: "هندبال",
                          }
                          return labels[s] || s
                        })
                        .join("، ")}
                      )
                    </>
                  )}{" "}
                  آماده ارائه خدمات به ورزش‌دوستان عزیز می‌باشد. این مجموعه با
                  ظرفیت <strong>{toPersianDigits(court.capacity)} نفر</strong> و
                  با بهترین امکانات در خدمت شماست.
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2.5">
                    <MapPin className="size-4 text-primary" />
                    <span className="text-muted-foreground">
                      {court.address}
                    </span>
                  </div>
                  {court.manager_name && (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2.5">
                      <UserCircle className="size-4 text-primary" />
                      <span className="text-muted-foreground">
                        مدیر: {court.manager_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Amenities */}
            {court.amenities && <CourtAmenities amenities={court.amenities} />}

            {/* Location & Map */}
            {court.latitude != null && court.longitude != null && (
              <div className="rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md">
                <SectionHeading
                  icon={<MapPin className="size-5" />}
                  title="موقعیت روی نقشه"
                />
                <p className="mb-3 text-sm text-muted-foreground">
                  {court.address}
                </p>
                <div className="overflow-hidden rounded-xl ring-1 ring-border/50">
                  <CourtLocationMap
                    latitude={court.latitude}
                    longitude={court.longitude}
                    name={court.name}
                    height="280px"
                    interactive
                  />
                </div>
              </div>
            )}

            {/* Reviews */}
            <CourtReviews
              reviews={reviews}
              averageRating={court.average_rating}
              total={reviewsTotal}
            />
          </div>

          {/* ── Right column: sidebar (sticky) ── */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
            {/* Manager Info */}
            {(court.manager_name || court.manager_phone) && (
              <div className="rounded-2xl border bg-card/80 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3 border-b px-6 py-5">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                    <UserCircle className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm leading-tight font-semibold">
                      {court.manager_name || "مدیر مجموعه"}
                    </p>
                    <p className="text-xs text-muted-foreground">مدیر مجموعه</p>
                  </div>
                </div>
                <div className="divide-y">
                  {court.manager_phone && (
                    <div className="flex items-center gap-3 px-6 py-3.5 text-sm transition-colors hover:bg-muted/20">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Phone className="size-4 text-primary" />
                      </div>
                      <a
                        href={`tel:${court.manager_phone}`}
                        className="font-medium text-primary hover:underline"
                        dir="ltr"
                      >
                        {toPersianDigits(court.manager_phone)}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-3 px-6 py-3.5 text-sm text-muted-foreground transition-colors hover:bg-muted/20">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <MapPin className="size-4" />
                    </div>
                    <span className="truncate">{court.address}</span>
                  </div>
                  <div className="flex items-center gap-3 px-6 py-3.5 text-sm text-muted-foreground transition-colors hover:bg-muted/20">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Users className="size-4" />
                    </div>
                    <span>ظرفیت {toPersianDigits(court.capacity)} نفر</span>
                  </div>
                </div>
              </div>
            )}

            {/* Date Range Picker */}
            <div className="rounded-2xl border bg-card/80 shadow-sm backdrop-blur-md">
              <div className="border-b px-6 py-5">
                <h3 className="text-sm font-semibold">انتخاب بازه تاریخ</h3>
              </div>
              <div className="space-y-3 p-5">
                <span className="block text-xs text-muted-foreground">
                  بازه مد نظر خود را انتخاب کنید
                </span>
                <div className="flex items-center gap-2">
                  <DateRangePicker
                    value={dateRange}
                    onChange={(range) => {
                      setDateRange(range)
                      if (range?.from) {
                        setSelectedDate(range.from.toLocaleDateString("en-CA"))
                      } else {
                        setSelectedDate(today)
                      }
                    }}
                    placeholder="از تاریخ تا تاریخ"
                  />
                  {dateRange?.from && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setDateRange(undefined)
                        setSelectedDate(today)
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Booking */}
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
          </div>
        </div>
      </div>
    </div>
  )
}
