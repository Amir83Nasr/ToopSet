"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "@/lib/toast"

type PaymentOutcome = "paid" | "failed" | "pending" | "reconciliation_required"

type PaymentVerifyResponse = {
  outcome: PaymentOutcome
  booking_id: number | null
  ref_id?: string | null
  track_id?: string | null
  message: string
}

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const trackId = searchParams.get("trackId") ?? searchParams.get("track_id")
  const callbackOutcome = searchParams.get("outcome") as PaymentOutcome | null
  const callbackBookingId = searchParams.get("bookingId")
  const callbackRefId = searchParams.get("refId") ?? searchParams.get("ref_id")
  const orderId = searchParams.get("orderId")
  const shouldVerify = useMemo(() => {
    return Boolean(trackId && !callbackOutcome)
  }, [callbackOutcome, trackId])

  const [loading, setLoading] = useState(shouldVerify)
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(callbackOutcome)
  const [message, setMessage] = useState(
    trackId ? "" : "شناسه تراکنش از درگاه دریافت نشد."
  )
  const [bookingId, setBookingId] = useState<number | null>(
    callbackBookingId ? Number(callbackBookingId) : null
  )
  const [refId, setRefId] = useState<string | null>(callbackRefId)

  useEffect(() => {
    if (!shouldVerify) return

    let cancelled = false

    async function verify() {
      try {
        const res = await api<PaymentVerifyResponse>(
          "/api/v1/payments/zibal/verify",
          {
            method: "POST",
            body: JSON.stringify({
              track_id: trackId,
              order_id: orderId ?? undefined,
            }),
          }
        )
        if (cancelled) return
        setOutcome(res.outcome)
        setMessage(res.message)
        setBookingId(res.booking_id)
        if (res.ref_id) setRefId(res.ref_id)
        if (res.outcome === "paid") toast.success("پرداخت با موفقیت تایید شد")
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof ApiError ? err.message : "تأیید پرداخت ناموفق بود"
        setOutcome("reconciliation_required")
        setMessage(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    verify()

    return () => {
      cancelled = true
    }
  }, [orderId, router, shouldVerify, trackId])

  const isPaid = outcome === "paid"
  const isFailed = outcome === "failed"
  const isPending =
    outcome === "pending" || outcome === "reconciliation_required"

  const title = loading
    ? "در حال بررسی وضعیت پرداخت"
    : isPaid
      ? "پرداخت موفق"
      : isFailed
        ? "پرداخت ناموفق"
        : "در حال پیگیری پرداخت"

  const description = loading
    ? "در حال بررسی نتیجه تراکنش از درگاه پرداخت..."
    : message ||
      (isPaid
        ? "پرداخت با موفقیت ثبت شد و رزرو شما نهایی گردید."
        : isFailed
          ? "پرداخت انجام نشد و رزرو موقت آزاد شد."
          : isPending
            ? "نتیجه تراکنش هنوز نهایی نشده و به صورت خودکار بررسی می‌شود."
            : "تراکنش نیازمند بررسی بیشتر است و به صورت خودکار دوباره بررسی می‌شود.")

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main id="main-content" className="relative flex-1 pt-16">
        <div className="mx-auto max-w-lg px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                {loading && <Loader2 className="size-5 animate-spin" />}
                {!loading && isPaid && (
                  <CheckCircle2 className="size-5 text-green-600" />
                )}
                {!loading && isFailed && (
                  <AlertTriangle className="size-5 text-destructive" />
                )}
                {!loading && isPending && (
                  <AlertTriangle className="size-5 text-amber-500" />
                )}
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPaid && bookingId && (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  شماره رزرو: {bookingId}
                </div>
              )}
              {isPaid && (refId || trackId) && (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  کد پیگیری تراکنش: <span dir="ltr">{refId || trackId}</span>
                </div>
              )}
              {isPending && trackId && (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  کد رهگیری: <span dir="ltr">{trackId}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                {isPaid && (
                  <>
                    <Button onClick={() => router.push("/dashboard/bookings")}>
                      مشاهده رزروها
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/")}>
                      صفحه اصلی
                    </Button>
                  </>
                )}

                {isFailed && (
                  <>
                    <Button onClick={() => router.push("/courts")}>
                      انتخاب مجدد سانس
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/")}>
                      صفحه اصلی
                    </Button>
                  </>
                )}

                {isPending && (
                  <>
                    <Button onClick={() => router.push("/dashboard/bookings")}>
                      پیگیری در پنل کاربری
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/contact")}
                    >
                      تماس با پشتیبانی
                    </Button>
                  </>
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

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  )
}
