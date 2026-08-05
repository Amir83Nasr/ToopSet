"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { getCookie } from "@/lib/cookies"
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
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import {
  ArrowRight,
  Construction,
  LayoutDashboard,
  AlertTriangle,
} from "lucide-react"
import { toast } from "@/lib/toast"

interface BookingDetail {
  id: number
  status: string
  price_paid: number
  vendor_name: string
  vendor_address: string
  slot_start_time: string
  slot_end_time: string
  expires_at: string | null
}

interface ZibalPaymentStartResponse {
  checkout_type: "booking"
  payment_gateway: "zibal"
  booking_id: number
  payment_id: number
  amount: number
  track_id: string
  start_url: string
  callback_url: string
  expires_at: string | null
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

function PaymentPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, loading: authLoading } = useAuth()

  const bookingId = Number(searchParams.get("booking_id"))
  const vendorId = Number(searchParams.get("vendor_id"))
  const checkoutType =
    searchParams.get("checkout_type") === "replacement_hold"
      ? "replacement_hold"
      : "booking"

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [error, setError] = useState<string>("")
  const [paying, setPaying] = useState(false)
  const [clock, setClock] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const remainingSeconds = booking?.expires_at
    ? Math.max(
        0,
        Math.ceil((new Date(booking.expires_at).getTime() - clock) / 1000)
      )
    : 0

  // Redirect to login only if we're sure there's no auth (no token cookie)
  useEffect(() => {
    if (authLoading) return
    if (isAuthenticated) return
    // Double-check the cookie — the API call might have failed temporarily
    const hasToken = getCookie("access_token")
    if (hasToken) return
    router.push(`/login?redirect=${encodeURIComponent("/dashboard/bookings")}`)
  }, [authLoading, isAuthenticated, router])

  // Fetch booking details
  useEffect(() => {
    if (!bookingId || !isAuthenticated) return

    async function fetchBooking() {
      try {
        const path =
          checkoutType === "replacement_hold"
            ? `/api/v1/bookings/replacement-holds/${bookingId}`
            : `/api/v1/bookings/${bookingId}`
        const res = await api<BookingDetail>(path)
        setBooking(res)
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : "خطا در دریافت اطلاعات رزرو"
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchBooking()
  }, [bookingId, checkoutType, isAuthenticated])

  const handlePayment = async () => {
    if (!booking) return
    setPaying(true)
    try {
      const path =
        checkoutType === "replacement_hold"
          ? `/api/v1/bookings/replacement-holds/${booking.id}/pay`
          : `/api/v1/bookings/${booking.id}/pay`
      const res = await api<BookingDetail | ZibalPaymentStartResponse>(path, {
        method: "POST",
      })
      if (
        res &&
        typeof res === "object" &&
        "payment_gateway" in res &&
        res.payment_gateway === "zibal"
      ) {
        window.location.assign(res.start_url)
        return
      }
      toast.success(
        checkoutType === "replacement_hold"
          ? "سانس با موفقیت به شما منتقل شد"
          : "رزرو با موفقیت پرداخت شد"
      )
      router.push("/dashboard/bookings")
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "پرداخت ناموفق بود"
      toast.error(msg)
    } finally {
      setPaying(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!booking) return
    try {
      const path =
        checkoutType === "replacement_hold"
          ? `/api/v1/bookings/replacement-holds/${booking.id}`
          : `/api/v1/bookings/${booking.id}/cancel`
      await api(path, {
        method: checkoutType === "replacement_hold" ? "DELETE" : "POST",
      })
      toast.success(
        checkoutType === "replacement_hold" ? "هولد آزاد شد" : "رزرو لغو شد"
      )
      router.push("/dashboard/bookings")
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در لغو رزرو"
      toast.error(msg)
    }
  }

  // Loading / auth checking
  if (authLoading || loading) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main id="main-content" className="relative flex-1 pt-16">
          <div className="mx-auto max-w-lg px-4 py-12">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-6 h-48 w-full rounded-xl" />
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main id="main-content" className="relative flex-1 pt-16" />
        <SiteFooter />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main id="main-content" className="relative flex-1 pt-16">
          <div className="mx-auto max-w-lg px-4 py-12">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <AlertTriangle className="size-12 text-destructive" />
                <CardTitle className="text-xl">خطا</CardTitle>
                <CardDescription className="text-center">
                  {error}
                </CardDescription>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => router.push("/")}>
                    <ArrowRight className="me-2 size-4" />
                    بازگشت به صفحه اصلی
                  </Button>
                  {vendorId && (
                    <Button asChild>
                      <Link href={`/vendors/${vendorId}`}>
                        انتخاب سانس دیگر
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main id="main-content" className="relative flex-1 pt-16">
          <div className="mx-auto max-w-lg px-4 py-12">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <AlertTriangle className="size-12 text-muted-foreground" />
                <CardTitle className="text-xl">رزرو یافت نشد</CardTitle>
                <CardDescription className="text-center">
                  اطلاعات این رزرو در دسترس نیست.
                </CardDescription>
                <Button variant="outline" onClick={() => router.push("/")}>
                  <ArrowRight className="me-2 size-4" />
                  بازگشت به صفحه اصلی
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main id="main-content" className="relative flex-1 pt-16">
        <div className="mx-auto max-w-lg px-4 py-8">
          {/* Under Construction Card */}
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/50">
                <Construction className="size-12 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-xl text-amber-700 dark:text-amber-400">
                آماده‌سازی پرداخت
              </CardTitle>
              <CardDescription className="max-w-sm text-center">
                پس از ثبت پرداخت، شما به درگاه امن زیبال منتقل می‌شوید و بعد از
                بازگشت از درگاه، پرداخت نهایی تأیید می‌شود.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Booking Summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">خلاصه رزرو</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">مجموعه</span>
                <span className="font-medium">{booking.vendor_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">تاریخ</span>
                <span className="font-medium">
                  {formatDate(booking.slot_start_time)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ساعت</span>
                <span className="font-medium" dir="ltr">
                  {formatTime(booking.slot_start_time)} —{" "}
                  {formatTime(booking.slot_end_time)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">مبلغ</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(booking.price_paid)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">وضعیت</span>
                <Badge
                  variant="outline"
                  className="border-amber-300 text-amber-600"
                >
                  منتظر پرداخت
                </Badge>
              </div>
              {booking.expires_at && (
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-muted-foreground">مهلت پرداخت</span>
                  <span
                    className={
                      remainingSeconds > 0
                        ? "font-mono font-medium text-amber-600"
                        : "font-medium text-destructive"
                    }
                    dir="ltr"
                  >
                    {remainingSeconds > 0
                      ? `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`
                      : "منقضی شده"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            <Button
              className="w-full"
              disabled={paying || remainingSeconds === 0}
              onClick={handlePayment}
            >
              {paying ? "در حال پردازش پرداخت…" : "پرداخت و نهایی‌سازی رزرو"}
            </Button>
            <Button className="w-full" asChild>
              <Link href="/dashboard/bookings">
                <LayoutDashboard className="me-2" />
                مشاهده رزروهای من
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCancelBooking}
            >
              لغو رزرو
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentPageContent />
    </Suspense>
  )
}
