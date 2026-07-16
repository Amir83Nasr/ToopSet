"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { useAuth } from "@/hooks/use-auth"
import { getCookie } from "@/lib/cookies"
import { isSlotBookable } from "@/components/vendors/vendor-shared"
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
  CreditCard,
  MapPin,
  AlertTriangle,
  Loader2,
  XCircle,
} from "lucide-react"

interface SlotDetail {
  id: number
  vendor_id: number
  start_time: string
  end_time: string
  base_price: number
  ball_price: number
  ball_available: boolean
  is_reserved: boolean
  status: string
  version: number
  vendor_name: string
  vendor_address: string
  vendor_sport_type: string
}

type PageStep = "loading" | "confirm" | "processing" | "error" | "conflict"

interface BookingResult {
  id: number
  status: string
  price_paid: number
  vendor_name: string
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
  const vendorId = Number(searchParams.get("vendor_id"))

  const [step, setStep] = useState<PageStep>("loading")
  const [slot, setSlot] = useState<SlotDetail | null>(null)
  const [vendor, setVendor] = useState<{
    id: number
    name: string
    sport_type: string
    address: string
  } | null>(null)
  const [withBall, setWithBall] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>("")

  // Redirect to login only if we're sure there's no auth (no token cookie)
  useEffect(() => {
    if (authLoading) return
    if (isAuthenticated) return
    // Double-check the cookie before redirecting — the API call might have
    // failed temporarily (network/blip) even though the user has a valid token
    const hasToken = getCookie("access_token")
    if (hasToken) return
    toast.info("برای رزرو سانس باید اول وارد شوید", {
      description: "بعد از ورود، رزرو همین سانس را ادامه می‌دهید.",
    })
    router.push(
      `/login?reason=login_required&redirect=${encodeURIComponent(`/book?slot_id=${slotId}&vendor_id=${vendorId}`)}`
    )
  }, [authLoading, isAuthenticated, router, slotId, vendorId])

  // Fetch slot + vendor details
  useEffect(() => {
    if (!slotId || !vendorId || !isAuthenticated) return

    async function fetchDetails() {
      try {
        const slotRes = await api<SlotDetail>(`/api/v1/slots/${slotId}`)
        if (!isSlotBookable(slotRes))
          throw new ApiError(409, "این سانس قبلاً رزرو شده است")
        if (new Date(slotRes.start_time).getTime() <= Date.now()) {
          throw new ApiError(409, "زمان این سانس گذشته و دیگر قابل رزرو نیست")
        }
        setSlot(slotRes)
        setWithBall(false)
        setVendor({
          id: slotRes.vendor_id,
          name: slotRes.vendor_name,
          sport_type: slotRes.vendor_sport_type,
          address: slotRes.vendor_address,
        })
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
  }, [slotId, vendorId, isAuthenticated])

  const handleConfirm = useCallback(async () => {
    if (!slot) return
    if (new Date(slot.start_time).getTime() <= Date.now()) {
      setErrorMsg("زمان این سانس گذشته و دیگر قابل رزرو نیست")
      setStep("error")
      return
    }
    setStep("processing")
    try {
      const res = await api<BookingResult>("/api/v1/bookings", {
        method: "POST",
        body: JSON.stringify({
          slot_id: slot.id,
          version: slot.version,
          with_ball: withBall,
        }),
      })
      // Redirect to payment gateway page after successful booking creation
      router.push(`/book/payment?booking_id=${res.id}&vendor_id=${vendorId}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message)
        if (err.status === 409) {
          setStep("conflict")
          return
        }
      } else {
        setErrorMsg("خطا در ایجاد رزرو")
      }
      setStep("confirm")
    }
  }, [slot, withBall, vendorId, router])

  // ============ LOADING / AUTH CHECKING ============
  if (authLoading || step === "loading") {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="relative flex-1 pt-16">
          <div className="mx-auto max-w-lg px-4 py-12">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-6 h-48 w-full rounded-xl" />
            <Skeleton className="mt-6 h-10 w-full" />
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // ============ INVALID PARAMS ============
  if (!slotId || !vendorId) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="relative flex-1 pt-16">
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <AlertTriangle className="size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">لینک ناقص است</p>
            <Button variant="outline" onClick={() => router.push("/")}>
              <ArrowRight className="ml-2 size-4" />
              بازگشت به صفحه اصلی
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
        <div className="mx-auto max-w-lg px-4 py-8">
          {/* Back button */}
          <Button variant="outline" className="mb-4 w-fit" asChild>
            <Link href={`/vendors/${vendorId}`}>
              <ArrowRight className="me-1.5 size-4" />
              بازگشت به صفحه مجموعه
            </Link>
          </Button>

          <h1 className="mb-6 text-2xl font-bold">رزرو سانس</h1>

          {/* ============ CONFIRM STEP ============ */}
          {step === "confirm" && vendor && slot && (
            <div className="space-y-6">
              {/* Vendor summary */}
              <Card>
                <CardHeader>
                  <CardTitle>{vendor.name}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {sportLabels[vendor.sport_type] || vendor.sport_type}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs">
                      <MapPin className="size-3" />
                      {vendor.address}
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
                    <span className="font-medium">
                      {formatDate(slot.start_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ساعت</span>
                    <span className="font-medium" dir="ltr">
                      {formatTime(slot.start_time)} —{" "}
                      {formatTime(slot.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">قیمت</span>
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(slot.base_price)}
                    </span>
                  </div>
                  {slot.ball_available && (
                    <button
                      type="button"
                      onClick={() => setWithBall((current) => !current)}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 text-right transition-colors ${
                        withBall
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span>
                        <span className="block font-medium">رزرو توپ</span>
                        <span className="text-xs text-muted-foreground">
                          {formatPrice(slot.ball_price)}
                        </span>
                      </span>
                      <Badge variant={withBall ? "default" : "outline"}>
                        {withBall ? "انتخاب شد" : "اختیاری"}
                      </Badge>
                    </button>
                  )}
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-muted-foreground">مبلغ نهایی</span>
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(
                        slot.base_price +
                          (withBall && slot.ball_available
                            ? slot.ball_price
                            : 0)
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full" size="lg" onClick={handleConfirm}>
                <CreditCard className="ml-2 size-5" />
                تأیید و پرداخت
              </Button>
            </div>
          )}

          {/* ============ PROCESSING STEP ============ */}
          {step === "processing" && (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="size-10 animate-spin text-primary" />
                <p className="text-lg font-medium">در حال ایجاد رزرو...</p>
              </CardContent>
            </Card>
          )}

          {/* ============ CONFLICT STEP ============ */}
          {step === "conflict" && (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <XCircle className="size-12 text-destructive" />
                <CardTitle className="text-xl">متأسفیم</CardTitle>
                <CardDescription className="text-center">
                  این سانس توسط کاربر دیگری رزرو شده است. لطفاً سانس دیگری را
                  انتخاب کنید.
                </CardDescription>
                <Button asChild>
                  <Link href={`/vendors/${vendorId}`}>
                    <ArrowRight className="ml-2 size-4" />
                    انتخاب سانس دیگر
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ============ ERROR STEP ============ */}
          {step === "error" && (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <AlertTriangle className="size-12 text-destructive" />
                <CardTitle className="text-xl">خطا</CardTitle>
                <CardDescription className="text-center">
                  {errorMsg}
                </CardDescription>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/vendors/${vendorId}`)}
                >
                  <ArrowRight className="ml-2 size-4" />
                  بازگشت
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <SiteFooter />
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
