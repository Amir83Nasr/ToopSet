"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
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
  CreditCard,
  MapPin,
  AlertTriangle,
  Loader2,
  XCircle,
} from "lucide-react"

interface SlotDetail {
  id: number
  court_id: number
  start_time: string
  end_time: string
  base_price: number
  is_reserved: boolean
  version: number
  court_name: string
  court_address: string
  court_sport_type: string
}

type PageStep = "loading" | "confirm" | "processing" | "error" | "conflict"

interface BookingResult {
  id: number
  status: string
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
  const [court, setCourt] = useState<{
    id: number
    name: string
    sport_type: string
    address: string
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>("")

  // Redirect to login only if we're sure there's no auth (no token cookie)
  useEffect(() => {
    if (authLoading) return
    if (isAuthenticated) return
    // Double-check the cookie before redirecting — the API call might have
    // failed temporarily (network/blip) even though the user has a valid token
    const hasToken = getCookie("access_token")
    if (hasToken) return
    router.push(
      `/login?redirect=${encodeURIComponent(`/book?slot_id=${slotId}&court_id=${courtId}`)}`
    )
  }, [authLoading, isAuthenticated, router, slotId, courtId])

  // Fetch slot + court details
  useEffect(() => {
    if (!slotId || !courtId || !isAuthenticated) return

    async function fetchDetails() {
      try {
        const slotRes = await api<SlotDetail>(`/api/v1/slots/${slotId}`)
        if (slotRes.is_reserved)
          throw new ApiError(409, "این سانس قبلاً رزرو شده است")
        setSlot(slotRes)
        setCourt({
          id: slotRes.court_id,
          name: slotRes.court_name,
          sport_type: slotRes.court_sport_type,
          address: slotRes.court_address,
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
  }, [slotId, courtId, isAuthenticated])

  const handleConfirm = useCallback(async () => {
    if (!slot) return
    setStep("processing")
    try {
      const res = await api<BookingResult>("/api/v1/bookings", {
        method: "POST",
        body: JSON.stringify({
          slot_id: slot.id,
          version: slot.version,
        }),
      })
      // Redirect to payment gateway page after successful booking creation
      router.push(`/book/payment?booking_id=${res.id}&court_id=${courtId}`)
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
  }, [slot, courtId, router])

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
  if (!slotId || !courtId) {
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
          <Button variant="outline" size="sm" className="mb-4 w-fit" asChild>
            <Link href={`/courts/${courtId}`}>
              <ArrowRight className="me-1.5 size-4" />
              بازگشت به صفحه مجموعه
            </Link>
          </Button>

          <h1 className="mb-6 text-2xl font-bold">رزرو سانس</h1>

          {/* ============ CONFIRM STEP ============ */}
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
                  <Link href={`/courts/${courtId}`}>
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
                  onClick={() => router.push(`/courts/${courtId}`)}
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
