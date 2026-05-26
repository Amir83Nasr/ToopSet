"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Calendar,
  MapPin,
  AlertTriangle,
  Loader2,
  Timer,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

interface SlotDetail {
  id: number
  court_id: number
  start_time: string
  end_time: string
  base_price: number
  is_reserved: boolean
  version: number
}

interface CourtBrief {
  id: number
  name: string
  sport_type: string
  address: string
}

type BookingStatus = "pending_payment" | "confirmed" | "cancelled"
type PageStep = "loading" | "confirm" | "processing" | "created" | "paid" | "error"

interface BookingResult {
  id: number
  status: BookingStatus
  price_paid: number
  court_name: string
  expires_at: string | null
}

const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(price) + " تومان"
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("fa-IR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function BookPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, loading: authLoading } = useAuth()

  const slotId = Number(searchParams.get("slot_id"))
  const courtId = Number(searchParams.get("court_id"))

  const [step, setStep] = useState<PageStep>("loading")
  const [slot, setSlot] = useState<SlotDetail | null>(null)
  const [court, setCourt] = useState<CourtBrief | null>(null)
  const [booking, setBooking] = useState<BookingResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [participants, setParticipants] = useState(1)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/book?slot_id=${slotId}&court_id=${courtId}`)
    }
  }, [authLoading, isAuthenticated, router, slotId, courtId])

  // Fetch slot + court details
  useEffect(() => {
    if (!slotId || !courtId || !isAuthenticated) return

    async function fetchDetails() {
      try {
        const [slotRes, courtRes] = await Promise.all([
          api<{ id: number; court_id: number; start_time: string; end_time: string; base_price: number; is_reserved: boolean; version: number }>(
            `/api/v1/courts/${courtId}/slots?limit=100`
          ).then((res: any) => {
            // Find our specific slot
            const found = (res.slots || []).find((s: any) => s.id === slotId)
            if (!found) throw new ApiError(404, "سانس مورد نظر یافت نشد")
            if (found.is_reserved) throw new ApiError(409, "این سانس قبلاً رزرو شده است")
            return found as SlotDetail
          }),
          api<CourtBrief>(`/api/v1/courts/${courtId}`),
        ])
        setSlot(slotRes)
        setCourt(courtRes)
        setStep("confirm")
      } catch (err) {
        if (err instanceof ApiError) {
          setErrorMsg(err.message)
        } else {
          setErrorMsg("خطا در دریافت اطلاعات")
        }
        setStep("error")
      }
    }
    fetchDetails()
  }, [slotId, courtId, isAuthenticated])

  // Timer for payment window
  useEffect(() => {
    if (step !== "created" || !booking?.expires_at) return
    const expiresAt = booking.expires_at

    function updateTimer() {
      const remaining = new Date(expiresAt).getTime() - Date.now()
      if (remaining <= 0) {
        setTimeLeft(0)
        if (timerRef.current) clearInterval(timerRef.current)
        toast.error("مهلت پرداخت به پایان رسید")
        return
      }
      setTimeLeft(Math.floor(remaining / 1000))
    }

    updateTimer()
    timerRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [step, booking])

  const handleCreateBooking = useCallback(async () => {
    if (!slot) return
    setStep("processing")
    try {
      const res = await api<BookingResult>("/api/v1/bookings", {
        method: "POST",
        body: JSON.stringify({
          slot_id: slot.id,
          version: slot.version,
          participants_count: participants,
        }),
      })
      setBooking(res)
      setStep("created")
      toast.success("رزرو با موفقیت ایجاد شد")
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message)
      } else {
        setErrorMsg("خطا در ایجاد رزرو")
      }
      setStep("confirm")
      toast.error(errorMsg || "خطا در ایجاد رزرو")
    }
  }, [slot, participants, errorMsg])

  const handlePay = useCallback(async () => {
    if (!booking) return
    try {
      const res = await api<BookingResult>(`/api/v1/bookings/${booking.id}/pay`, {
        method: "POST",
      })
      setBooking(res)
      setStep("paid")
      toast.success("پرداخت با موفقیت انجام شد")
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در پرداخت"
      toast.error(msg)
    }
  }, [booking])

  const handleCancel = useCallback(async () => {
    if (!booking) return
    try {
      await api(`/api/v1/bookings/${booking.id}/cancel`, { method: "POST" })
      toast.success("رزرو لغو شد")
      router.push("/")
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در لغو رزرو"
      toast.error(msg)
    }
  }, [booking, router])

  // Show loading while checking auth
  if (authLoading || step === "loading") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  // Invalid params
  if (!slotId || !courtId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle className="size-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">لینک ناقص است</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowRight className="ml-2 size-4" />
          بازگشت به صفحه اصلی
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Back button */}
      <Button variant="ghost" className="mb-4 w-fit" asChild>
        <Link href={`/courts/${courtId}`}>
          <ArrowRight className="ml-2 size-4" />
          بازگشت به صفحه زمین
        </Link>
      </Button>

      <h1 className="mb-6 text-2xl font-bold">رزرو سانس</h1>

      {/* --- CONFIRM STEP --- */}
      {step === "confirm" && court && slot && (
        <div className="space-y-6">
          {/* Court summary */}
          <Card>
            <CardHeader>
              <CardTitle>{court.name}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {sportLabels[court.sport_type] || court.sport_type}
                </Badge>
                <span className="flex items-center gap-1 text-xs">
                  <MapPin className="size-3" />
                  {court.address}
                </span>
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Slot details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">جزئیات سانس</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">تاریخ</span>
                <span className="font-medium">{formatDate(slot.start_time)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ساعت</span>
                <span className="font-medium" dir="ltr">
                  {formatTime(slot.start_time)} — {formatTime(slot.end_time)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">قیمت</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(slot.base_price)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">تعداد شرکت‌کنندگان</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={participants <= 1}
                    onClick={() => setParticipants((p) => Math.max(1, p - 1))}
                  >
                    −
                  </Button>
                  <span className="min-w-[2ch] text-center font-medium">
                    {toPersianDigits(participants)}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setParticipants((p) => p + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" onClick={handleCreateBooking}>
            <CreditCard className="ml-2 size-5" />
            تأیید و رزرو
          </Button>
        </div>
      )}

      {/* --- PROCESSING STEP --- */}
      {step === "processing" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-lg font-medium">در حال ایجاد رزرو...</p>
          </CardContent>
        </Card>
      )}

      {/* --- CREATED STEP (pending payment) --- */}
      {step === "created" && booking && (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="size-12 text-amber-500" />
              <CardTitle className="text-xl">رزرو با موفقیت ایجاد شد</CardTitle>
              <CardDescription className="text-center">
                برای تأیید نهایی، لطفاً تا سقف {toPersianDigits(10)} دقیقه پرداخت را انجام دهید
              </CardDescription>
            </CardContent>
          </Card>

          {/* Timer */}
          {timeLeft > 0 && (
            <Card>
              <CardContent className="flex items-center justify-center gap-3 py-4">
                <Timer className="size-6 text-primary" />
                <span className="text-2xl font-bold tabular-nums" dir="ltr">
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                </span>
              </CardContent>
            </Card>
          )}
          {timeLeft <= 0 && (
            <Card>
              <CardContent className="flex items-center justify-center gap-3 py-4">
                <XCircle className="size-6 text-destructive" />
                <span className="text-lg font-semibold text-destructive">مهلت پرداخت به پایان رسید</span>
              </CardContent>
            </Card>
          )}

          {/* Booking summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">خلاصه رزرو</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">زمین</span>
                <span>{booking.court_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">مبلغ</span>
                <span className="font-bold">{formatPrice(booking.price_paid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">وضعیت</span>
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  منتظر پرداخت
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              size="lg"
              onClick={handlePay}
              disabled={timeLeft <= 0}
            >
              <CreditCard className="ml-2 size-5" />
              پرداخت
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleCancel}
            >
              لغو رزرو
            </Button>
          </div>
        </div>
      )}

      {/* --- PAID STEP --- */}
      {step === "paid" && booking && (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                <CheckCircle2 className="size-12 text-green-600 dark:text-green-300" />
              </div>
              <CardTitle className="text-xl">پرداخت با موفقیت انجام شد</CardTitle>
              <CardDescription className="text-center">
                رزرو شما تأیید شد. برای مشاهده جزئیات به داشبورد خود مراجعه کنید.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">جزئیات رزرو</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">زمین</span>
                <span>{booking.court_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">مبلغ پرداختی</span>
                <span className="font-bold text-green-600">{formatPrice(booking.price_paid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">وضعیت</span>
                <Badge className="bg-green-600">تأیید شده</Badge>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" onClick={() => router.push("/dashboard/bookings")}>
            مشاهده رزروهای من
          </Button>
        </div>
      )}

      {/* --- ERROR STEP --- */}
      {step === "error" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertTriangle className="size-12 text-destructive" />
            <CardTitle className="text-xl">خطا</CardTitle>
            <CardDescription className="text-center">{errorMsg}</CardDescription>
            <Button variant="outline" onClick={() => router.push(`/courts/${courtId}`)}>
              <ArrowRight className="ml-2 size-4" />
              بازگشت
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={null}>
      <BookPageContent />
    </Suspense>
  )
}
