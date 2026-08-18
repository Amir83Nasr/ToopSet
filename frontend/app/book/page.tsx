"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { useAuth } from "@/hooks/use-auth"
import { getCookie } from "@/lib/cookies"
import { isSlotBookable } from "@/components/vendors/vendor-shared"
import { BookingBallOption } from "@/components/bookings/booking-ball-option"
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
  Building2,
  Calendar,
  Clock,
  Ticket,
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
  checkout_type?: "booking" | "replacement_hold"
  id: number
  status: string
  price_paid: number
  vendor_name: string
  expires_at: string | null
}

interface PendingCheckout {
  checkout_type: "booking" | "replacement_hold"
  booking_id: number
  vendor_id: number | null
  vendor_name: string
  slot_start_time?: string | null
  slot_end_time?: string | null
  slot_date?: string
  slot_time?: string
  track_id: string | null
  start_url: string | null
  can_resume: boolean
  expires_at: string | null
  message: string
}

interface PendingCheckoutErrorDetails {
  code?: string
  checkout_type?: "booking" | "replacement_hold"
  booking_id?: number
  hold_id?: number
  vendor_name?: string
  slot_start_time?: string | null
  slot_end_time?: string | null
  slot_date?: string
  slot_time?: string
  payment_url?: string | null
  expires_at?: string | null
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

import { formatPrice } from "@/lib/utils"

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
  const { user, isAuthenticated, loading: authLoading } = useAuth()

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
  const [pendingCheckout, setPendingCheckout] =
    useState<PendingCheckout | null>(null)

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

  useEffect(() => {
    if (authLoading || !user || user.role !== "user" || user.phone_verified_at)
      return
    const redirect = `/book?slot_id=${slotId}&vendor_id=${vendorId}`
    router.replace(
      `/otp?reason=phone_verification_required&phone=${encodeURIComponent(user.phone)}&redirect=${encodeURIComponent(redirect)}`
    )
  }, [authLoading, router, slotId, user, vendorId])

  // Fetch slot + vendor details
  useEffect(() => {
    if (!slotId || !vendorId || !isAuthenticated) return

    async function fetchDetails() {
      try {
        const currentCheckout = await api<PendingCheckout | null>(
          "/api/v1/bookings/pending-checkout"
        )
        if (currentCheckout) {
          setPendingCheckout(currentCheckout)
          setErrorMsg(currentCheckout.message)
          setStep("conflict")
          return
        }
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

  // Add type inside the file to avoid import issues
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

  const handleConfirm = useCallback(async () => {
    if (!slot) return
    if (new Date(slot.start_time).getTime() <= Date.now()) {
      setErrorMsg("زمان این سانس گذشته و دیگر قابل رزرو نیست")
      setStep("error")
      return
    }
    setStep("processing")
    try {
      // 1. Create booking
      const res = await api<BookingResult>("/api/v1/bookings", {
        method: "POST",
        body: JSON.stringify({
          slot_id: slot.id,
          version: slot.version,
          with_ball: withBall,
        }),
      })

      // 2. Immediately pay/finalize booking
      const payRes = await api<BookingResult | ZibalPaymentStartResponse>(
        `/api/v1/bookings/${res.id}/pay`,
        {
          method: "POST",
        }
      )

      // If gateway (e.g. zibal), redirect to start_url
      if (
        payRes &&
        typeof payRes === "object" &&
        "payment_gateway" in payRes &&
        payRes.payment_gateway === "zibal" &&
        payRes.start_url
      ) {
        window.location.assign(payRes.start_url)
        return
      }

      // Otherwise (mock or direct success), toast and go to bookings dashboard
      toast.success("رزرو با موفقیت ثبت و پرداخت شد")
      router.push("/dashboard/bookings")
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message)
        if (err.status === 409) {
          const details = err.details as PendingCheckoutErrorDetails | undefined
          if (details?.code === "pending_booking_limit_reached") {
            const bookingId = details.booking_id ?? details.hold_id
            if (bookingId) {
              setPendingCheckout({
                checkout_type: details.checkout_type ?? "booking",
                booking_id: bookingId,
                vendor_id: null,
                vendor_name: details.vendor_name ?? "",
                slot_start_time: details.slot_start_time ?? null,
                slot_end_time: details.slot_end_time ?? null,
                slot_date: details.slot_date ?? "",
                slot_time: details.slot_time ?? "",
                track_id: null,
                start_url: details.payment_url ?? null,
                can_resume: true,
                expires_at: details.expires_at ?? null,
                message: err.message,
              })
            }
          }
          setStep("conflict")
          return
        }
      } else {
        setErrorMsg("خطا در ایجاد یا پرداخت رزرو")
      }
      setStep("confirm")
    }
  }, [slot, withBall, router])

  // ============ LOADING / AUTH CHECKING ============
  if (authLoading || step === "loading") {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main id="main-content" className="relative flex-1 pt-16">
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
        <main id="main-content" className="relative flex-1 pt-16">
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <AlertTriangle className="size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">لینک ناقص است</p>
            <Button variant="outline" onClick={() => router.push("/")}>
              <ArrowRight className="me-2 size-4" />
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
      <main id="main-content" className="relative flex-1 pt-16">
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
                  <BookingBallOption
                    available={slot.ball_available}
                    price={slot.ball_price}
                    selected={withBall}
                    onToggle={() => setWithBall((current) => !current)}
                    formatPrice={formatPrice}
                  />
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
                <CreditCard className="me-2 size-5" />
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
            <Card
              className={
                pendingCheckout
                  ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
                  : ""
              }
            >
              <CardContent className="flex flex-col items-center gap-6 py-8">
                {pendingCheckout ? (
                  <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                    <AlertTriangle className="size-10" />
                  </div>
                ) : (
                  <XCircle className="size-12 text-destructive" />
                )}

                <div className="space-y-1 text-center">
                  <CardTitle
                    className={`text-xl font-bold ${pendingCheckout ? "text-red-600 dark:text-red-400" : ""}`}
                  >
                    {pendingCheckout
                      ? "رزرو در انتظار پرداخت دارید!"
                      : "متأسفیم"}
                  </CardTitle>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    {pendingCheckout
                      ? "یک رزرو نهایی‌نشده از قبل دارید. برای رزرو سانس جدید، باید ابتدا رزرو قبلی را پرداخت کنید یا داخل درگاه انصراف را بزنید."
                      : "این سانس توسط کاربر دیگری رزرو شده است. لطفاً سانس دیگری را انتخاب کنید."}
                  </p>
                </div>

                {pendingCheckout && (
                  <div className="w-full max-w-md overflow-hidden rounded-xl border border-red-300 bg-white shadow-md dark:border-red-900/80 dark:bg-zinc-900">
                    <div className="flex items-center justify-between border-b border-red-200 bg-red-50/80 px-4 py-3 dark:border-red-900/60 dark:bg-red-950/40">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-300">
                        <Ticket className="size-4 text-red-600 dark:text-red-400" />
                        <span>اطلاعات رزرو نهایی‌نشده</span>
                      </div>
                      <Badge className="bg-red-600 px-2.5 py-0.5 font-mono text-xs text-white shadow-xs hover:bg-red-700">
                        کد رزرو: #{pendingCheckout.booking_id}
                      </Badge>
                    </div>

                    <div className="space-y-3 p-4">
                      {pendingCheckout.vendor_name && (
                        <div className="flex items-center justify-between rounded-lg border border-red-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/60">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="size-4 text-red-500" />
                            <span className="text-xs font-medium">
                              مجموعه ورزشی:
                            </span>
                          </div>
                          <span className="text-sm font-bold text-foreground">
                            {pendingCheckout.vendor_name}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2.5">
                        {(pendingCheckout.slot_date ||
                          pendingCheckout.slot_start_time) && (
                          <div className="flex flex-col gap-1.5 rounded-lg border border-red-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/60">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Calendar className="size-3.5 text-red-500" />
                              <span className="text-xs font-medium">
                                تاریخ سانس
                              </span>
                            </div>
                            <span className="dir-rtl text-xs font-bold text-foreground">
                              {pendingCheckout.slot_date ||
                                (pendingCheckout.slot_start_time
                                  ? formatDate(pendingCheckout.slot_start_time)
                                  : "-")}
                            </span>
                          </div>
                        )}

                        {(pendingCheckout.slot_time ||
                          pendingCheckout.slot_start_time) && (
                          <div className="flex flex-col gap-1.5 rounded-lg border border-red-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/60">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="size-3.5 text-red-500" />
                              <span className="text-xs font-medium">
                                ساعت سانس
                              </span>
                            </div>
                            <span className="dir-rtl text-xs font-bold text-foreground">
                              {pendingCheckout.slot_time ||
                                (pendingCheckout.slot_start_time &&
                                pendingCheckout.slot_end_time
                                  ? `${formatTime(pendingCheckout.slot_start_time)} تا ${formatTime(pendingCheckout.slot_end_time)}`
                                  : "-")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {pendingCheckout ? (
                  <div className="flex w-full max-w-sm flex-col gap-2.5">
                    {pendingCheckout.can_resume && (
                      <Button
                        className="w-full bg-red-600 text-white shadow hover:bg-red-700"
                        onClick={() => {
                          if (pendingCheckout.start_url) {
                            window.location.assign(pendingCheckout.start_url)
                            return
                          }
                          router.push(
                            `/book/payment?booking_id=${pendingCheckout.booking_id}&checkout_type=${pendingCheckout.checkout_type}`
                          )
                        }}
                      >
                        <CreditCard className="me-2 size-4" />
                        ادامه و تکمیل پرداخت رزرو قبلی
                      </Button>
                    )}
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/dashboard/bookings">
                        مشاهده لیست رزروهای من
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Button asChild>
                    <Link href={`/vendors/${vendorId}`}>
                      <ArrowRight className="me-2 size-4" />
                      انتخاب سانس دیگر
                    </Link>
                  </Button>
                )}
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
                  <ArrowRight className="me-2 size-4" />
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
