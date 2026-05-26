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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  ArrowRight,
  Pencil,
  CalendarPlus,
  Building2,
  MapPin,
  Star,
  Users,
} from "lucide-react"

interface Court {
  id: number
  name: string
  sport_type: string
  address: string
  capacity: number
  is_active: boolean
  average_rating: number
  created_at: string
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

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("fa-IR")
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان"
}

export default function CourtDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const courtId = Number(params.id)

  const [court, setCourt] = useState<Court | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsTotal, setSlotsTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [bookingSlot, setBookingSlot] = useState<TimeSlot | null>(null)
  const [bookingParticipants, setBookingParticipants] = useState(1)
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [recentReviews, setRecentReviews] = useState<any[]>([])
  const [bookingSubmitting, setBookingSubmitting] = useState(false)

  const canManage = user?.role === "manager" || user?.role === "admin"

  const fetchData = useCallback(async () => {
    try {
      const [courtRes, slotsRes] = await Promise.all([
        api<Court>(`/api/v1/courts/${courtId}`),
        api<{ slots: TimeSlot[]; total: number }>(
          `/api/v1/courts/${courtId}/slots?limit=100`
        ),
      ])
      setCourt(courtRes)
      setSlots(slotsRes.slots)
      setSlotsTotal(slotsRes.total)
      // Fetch recent reviews
      try {
        const revRes = await api<{ reviews: any[]; total: number }>(
          `/api/v1/courts/${courtId}/reviews?limit=3`
        )
        setRecentReviews(revRes.reviews || [])
      } catch {
        // reviews may not be available
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true)
      } else {
        toast.error("خطا در دریافت اطلاعات")
      }
    } finally {
      setLoading(false)
    }
  }, [courtId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleCreateSlot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreating(true)

    const form = new FormData(e.currentTarget)
    const date = form.get("date") as string
    const start = form.get("start_time") as string
    const end = form.get("end_time") as string
    const price = form.get("base_price") as string

    const data = {
      court_id: courtId,
      start_time: new Date(`${date}T${start}:00`).toISOString(),
      end_time: new Date(`${date}T${end}:00`).toISOString(),
      base_price: parseFloat(price),
    }

    try {
      await api(`/api/v1/courts/${courtId}/slots`, {
        method: "POST",
        body: JSON.stringify(data),
      })
      toast.success("زمان با موفقیت اضافه شد")
      setDialogOpen(false)
      fetchData()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ایجاد زمان"
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        {/* Back button skeleton */}
        <Skeleton className="h-9 w-32 rounded-md" />

        {/* Court info card skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            {canManage && <Skeleton className="h-8 w-20 rounded-md" />}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time slots card skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
            {canManage && <Skeleton className="h-8 w-28 rounded-md" />}
          </CardHeader>
          <CardContent>
            {/* Table header skeleton */}
            <div className="flex gap-4 border-b pb-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {/* Table rows skeleton */}
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="flex gap-4 border-b py-3">
                {[1, 2, 3, 4, 5].map((col) => (
                  <Skeleton key={col} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (notFound || !court) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-xl text-muted-foreground">زمین مورد نظر یافت نشد</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/courts")}>
          <ArrowRight className="ml-2 size-4" />
          بازگشت به لیست
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Button variant="ghost" className="w-fit" onClick={() => router.push("/dashboard/courts")}>
        <ArrowRight className="ml-2 size-4" />
        بازگشت به لیست زمین‌ها
      </Button>

      {/* Court info card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{court.name}</CardTitle>
            <CardDescription>
              <Badge className={sportColors[court.sport_type] || ""} variant="secondary">
                {sportLabels[court.sport_type] || court.sport_type}
              </Badge>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/courts/${courtId}/edit`}>
                  <Pencil className="ml-1 size-4" />
                  ویرایش
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="size-4 text-muted-foreground" />
              <span>{court.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="size-4 text-muted-foreground" />
              <span>ظرفیت: {toPersianDigits(court.capacity)} نفر</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-0.5" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    className={
                      star <= Math.round(court.average_rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }
                  />
                ))}
              </div>
              <span className="text-muted-foreground">
                ({toPersianDigits(court.average_rating.toFixed(1))})
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={court.is_active ? "default" : "secondary"}>
                {court.is_active ? "فعال" : "غیرفعال"}
              </Badge>
            </div>
          </div>
          {court.amenities && Object.keys(court.amenities).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(court.amenities).filter(([, v]) => v).map(([key]) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {amenityLabels[key] || key}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image gallery with carousel */}
      {court.images && court.images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>تصاویر زمین</CardTitle>
          </CardHeader>
          <CardContent>
            <Carousel className="mx-auto max-w-xl">
              <CarouselContent>
                {court.images.map((img: string, i: number) => (
                  <CarouselItem key={i}>
                    <div className="relative aspect-video rounded-lg overflow-hidden border">
                      <img
                        src={img}
                        alt={`${court.name} - ${i + 1}`}
                        className="object-cover w-full h-full"
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
          </CardContent>
        </Card>
      )}

      {/* Recent reviews */}
      {recentReviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>نظرات اخیر</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentReviews.map((rev: any) => (
              <div key={rev.id} className="border-b last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{rev.user_name || "کاربر"}</span>
                  <div className="flex items-center gap-0.5" dir="ltr">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        className={star <= rev.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>زمان‌بندی</CardTitle>
            <CardDescription>
              {toPersianDigits(slotsTotal)} زمان ثبت شده
            </CardDescription>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <CalendarPlus className="ml-2 size-4" />
                  افزودن زمان
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>افزودن زمان جدید</DialogTitle>
                  <DialogDescription>
                    برای زمین {court.name} یک زمان جدید ثبت کنید
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSlot} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">تاریخ</Label>
                    <Input id="date" name="date" type="date" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">ساعت شروع</Label>
                      <Input id="start_time" name="start_time" type="time" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">ساعت پایان</Label>
                      <Input id="end_time" name="end_time" type="time" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="base_price">قیمت (تومان)</Label>
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
                      {creating ? "در حال ثبت..." : "ثبت زمان"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              هنوز زمانی برای این زمین ثبت نشده است
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>ساعت شروع</TableHead>
                  <TableHead>ساعت پایان</TableHead>
                  <TableHead>قیمت</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell>{formatDate(slot.start_time)}</TableCell>
                    <TableCell>{formatTime(slot.start_time)}</TableCell>
                    <TableCell>{formatTime(slot.end_time)}</TableCell>
                    <TableCell>{formatPrice(slot.base_price)}</TableCell>
                    <TableCell>
                      <Badge variant={slot.is_reserved ? "secondary" : "outline"}>
                        {slot.is_reserved ? "رزرو شده" : "آزاد"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!slot.is_reserved && !canManage && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setBookingSlot(slot)
                            setBookingParticipants(1)
                            setBookingDialogOpen(true)
                          }}
                        >
                          رزرو
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رزرو زمان</DialogTitle>
            <DialogDescription>
              {bookingSlot
                ? `${formatDate(bookingSlot.start_time)} - ${formatTime(bookingSlot.start_time)} تا ${formatTime(bookingSlot.end_time)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!bookingSlot) return
              setBookingSubmitting(true)
              try {
                await api("/api/v1/bookings", {
                  method: "POST",
                  body: JSON.stringify({
                    slot_id: bookingSlot.id,
                    participants_count: bookingParticipants,
                    version: bookingSlot.version,
                  }),
                })
                toast.success("رزرو با موفقیت انجام شد")
                setBookingDialogOpen(false)
                fetchData()
                router.push("/dashboard/bookings")
              } catch (err) {
                if (err instanceof ApiError && err.status === 409) {
                  toast.error("این زمان تغییر کرده است. لطفاً صفحه را بازنشانی کنید.")
                  setBookingDialogOpen(false)
                  fetchData()
                } else {
                  const msg = err instanceof ApiError ? err.message : "خطا در رزرو"
                  toast.error(msg)
                }
              } finally {
                setBookingSubmitting(false)
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="participants_count">تعداد شرکت‌کنندگان</Label>
              <Input
                id="participants_count"
                name="participants_count"
                type="number"
                min={1}
                max={court?.capacity ?? 50}
                value={bookingParticipants}
                onChange={(e) => setBookingParticipants(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
              {court && (
                <p className="text-xs text-muted-foreground">
                  حداکثر ظرفیت: {toPersianDigits(court.capacity)} نفر
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={bookingSubmitting}>
                {bookingSubmitting ? "در حال رزرو..." : "تایید رزرو"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
