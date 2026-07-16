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

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [error, setError] = useState<string>("")

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
        const res = await api<BookingDetail>(`/api/v1/bookings/${bookingId}`)
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
  }, [bookingId, isAuthenticated])

  const handleCancelBooking = async () => {
    if (!booking) return
    try {
      await api(`/api/v1/bookings/${booking.id}/cancel`, { method: "POST" })
      toast.success("رزرو لغو شد")
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
        <main className="relative flex-1 pt-16">
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
        <main className="relative flex-1 pt-16" />
        <SiteFooter />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="relative flex-1 pt-16">
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
        <main className="relative flex-1 pt-16">
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
      <main className="relative flex-1 pt-16">
        <div className="mx-auto max-w-lg px-4 py-8">
          {/* Under Construction Card */}
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/50">
                <Construction className="size-12 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-xl text-amber-700 dark:text-amber-400">
                درگاه پرداخت در حال توسعه
              </CardTitle>
              <CardDescription className="max-w-sm text-center">
                درگاه پرداخت این سامانه هنوز به صورت کامل راه‌اندازی نشده است.
                به زودی امکان پرداخت آنلاین فراهم خواهد شد.
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
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
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
