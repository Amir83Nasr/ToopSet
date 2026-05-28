"use client"

import { useCallback, useEffect, useState } from "react"
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
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  ArrowRight,
  MapPin,
  Star,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Loader2,
} from "lucide-react"

interface Court {
  id: number
  name: string
  sport_type: string
  address: string
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

const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
}

const sportColors: Record<string, string> = {
  volleyball: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  basketball: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  futsal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  handball: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
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

export default function PublicCourtDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const courtId = Number(params.id)

  const [court, setCourt] = useState<Court | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [recentReviews, setRecentReviews] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string>("")

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

  // Fetch court + reviews once on mount
  useEffect(() => {
    async function init() {
      try {
        const courtRes = await api<Court>(`/api/v1/courts/${courtId}`)
        setCourt(courtRes)
        setSelectedDate(today)
        // Fetch recent reviews
        try {
          const revRes = await api<{ reviews: any[]; total: number }>(
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

  // Fetch slots per selected date
  const fetchSlots = useCallback(async (date: string) => {
    setSlotsLoading(true)
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
  }, [courtId])

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate)
    }
  }, [selectedDate, fetchSlots])

  function handleSelectDate(date: string) {
    setSelectedDate(date)
  }

  function handleBookSlot(slot: TimeSlot) {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/book?slot_id=${slot.id}&court_id=${courtId}`)}`)
      return
    }
    router.push(`/book?slot_id=${slot.id}&court_id=${courtId}`)
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">خانه</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>...</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !court) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-xl text-muted-foreground">زمین مورد نظر یافت نشد</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowRight className="ml-2 size-4" />
          بازگشت به صفحه اصلی
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb className="mb-4">
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
      {/* Back button */}
      <Button variant="ghost" className="mb-4 w-fit" asChild>
        <Link href="/">
          <ArrowRight className="ml-2 size-4" />
          بازگشت به صفحه اصلی
        </Link>
      </Button>

      {/* Image gallery */}
      {court.images && court.images.length > 0 && (
        <div className="mb-8">
          <Carousel className="mx-auto max-w-3xl">
            <CarouselContent>
              {court.images.map((img: string, i: number) => (
                <CarouselItem key={i}>
                  <div className="relative aspect-video overflow-hidden rounded-xl border">
                    <img
                      src={img}
                      alt={`${court.name} - ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {court.images.length > 1 && (
              <>
                <CarouselPrevious />
                <CarouselNext />
              </>
            )}
          </Carousel>
        </div>
      )}

      {/* Court header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{court.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Badge className={sportColors[court.sport_type] || ""} variant="secondary">
                {sportLabels[court.sport_type] || court.sport_type}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                <span>{court.address}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="size-4" />
                <span>ظرفیت: {toPersianDigits(court.capacity)} نفر</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5" dir="ltr">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={20}
                  className={
                    star <= Math.round(court.average_rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }
                />
              ))}
            </div>
            <span className="text-lg font-semibold">
              {toPersianDigits(court.average_rating.toFixed(1))}
            </span>
          </div>
        </div>
      </div>

      {/* Amenities */}
      {court.amenities && Object.keys(court.amenities).length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>امکانات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(court.amenities).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {val ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground/50" />
                  )}
                  <span className={val ? "" : "text-muted-foreground/50"}>
                    {amenityLabels[key] || key}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      {recentReviews.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>نظرات کاربران</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentReviews.map((rev: any) => (
              <div key={rev.id} className="border-b pb-3 last:border-0 last:pb-0">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{rev.user_name || "کاربر"}</span>
                  <div className="flex items-center gap-0.5" dir="ltr">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        className={
                          star <= rev.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }
                      />
                    ))}
                  </div>
                </div>
                {rev.comment && (
                  <p className="text-sm text-muted-foreground">{rev.comment}</p>
                )}
                {rev.response && (
                  <div className="mt-2 rounded-lg bg-muted p-2 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">پاسخ مدیر: </span>
                    {rev.response}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Time slots section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>زمان‌های موجود</CardTitle>
          <CardDescription>
            تاریخ مورد نظر خود را انتخاب کنید و سانس آزاد را رزرو کنید
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Date picker */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {dates.map((date) => {
              const d = new Date(date + "T12:00:00")
              const dayName = d.toLocaleDateString("fa-IR", { weekday: "short" })
              const dayNum = d.toLocaleDateString("fa-IR", { day: "numeric" })
              const isToday = date === today

              return (
                <button
                  key={date}
                  onClick={() => handleSelectDate(date)}
                  className={`flex min-w-[80px] flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-all ${
                    selectedDate === date
                      ? "border-primary bg-primary/5 text-primary"
                      : "hover:border-muted-foreground/30"
                  }`}
                >
                  <span className="text-xs text-muted-foreground">{dayName}</span>
                  <span className="text-base font-semibold">{dayNum}</span>
                  {isToday && <Badge variant="outline" className="text-[10px] px-1">امروز</Badge>}
                  {selectedDate === date && slotsLoading && (
                    <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Slots grid */}
          {slotsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Calendar className="size-8" />
              <p>برای این تاریخ سانسی موجود نیست</p>
              <p className="text-sm">تاریخ دیگری را انتخاب کنید</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`rounded-lg border p-4 transition-all ${
                    slot.is_reserved
                      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                      : "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20 hover:shadow-md"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Clock className="size-4 text-muted-foreground" />
                      <span>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</span>
                    </div>
                    <Badge variant={slot.is_reserved ? "secondary" : "default"} className="text-[10px]">
                      {slot.is_reserved ? "رزرو شده" : "آزاد"}
                    </Badge>
                  </div>
                  <div className="mb-3 text-lg font-bold text-primary">
                    {formatPrice(slot.base_price)}
                  </div>
                  <Button
                    className="w-full"
                    variant={slot.is_reserved ? "outline" : "default"}
                    disabled={slot.is_reserved}
                    onClick={() => handleBookSlot(slot)}
                    size="sm"
                  >
                    {slot.is_reserved ? "رزرو شده" : isAuthenticated ? "رزرو" : "ورود برای رزرو"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
