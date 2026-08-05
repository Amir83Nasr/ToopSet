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

type PaymentVerifyResponse = {
  id: number
  status: string
}

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const trackId = searchParams.get("trackId") ?? searchParams.get("track_id")
  const success = searchParams.get("success")
  const orderId = searchParams.get("orderId")
  const shouldVerify = useMemo(() => {
    if (!trackId) return false
    if (success === "0") return false
    return true
  }, [success, trackId])

  const [loading, setLoading] = useState(shouldVerify)
  const [error, setError] = useState(
    trackId ? "" : "شناسه تراکنش از درگاه دریافت نشد."
  )
  const [bookingId, setBookingId] = useState<number | null>(null)

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
        setBookingId(res.id)
        toast.success("پرداخت با موفقیت تایید شد")
        window.setTimeout(() => {
          router.replace("/dashboard/bookings")
        }, 2200)
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof ApiError ? err.message : "تأیید پرداخت ناموفق بود"
        setError(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    verify()

    return () => {
      cancelled = true
    }
  }, [orderId, router, shouldVerify, trackId])

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main id="main-content" className="relative flex-1 pt-16">
        <div className="mx-auto max-w-lg px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                {loading && <Loader2 className="size-5 animate-spin" />}
                {!loading && !error && (
                  <CheckCircle2 className="size-5 text-green-600" />
                )}
                {!loading && error && (
                  <AlertTriangle className="size-5 text-destructive" />
                )}
                تایید پرداخت
              </CardTitle>
              <CardDescription>
                {loading
                  ? "در حال بررسی نتیجه تراکنش..."
                  : error
                    ? error
                    : "پرداخت با موفقیت ثبت شد و به‌زودی به لیست رزروها برمی‌گردید."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bookingId && (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  شماره رزرو: {bookingId}
                </div>
              )}
              {trackId && (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  Track ID: <span dir="ltr">{trackId}</span>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => router.push("/dashboard/bookings")}>
                  مشاهده رزروها
                </Button>
                {error && (
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    تلاش دوباره
                  </Button>
                )}
              </div>
              {success === "0" && (
                <p className="text-sm text-muted-foreground">
                  پرداخت توسط کاربر لغو شده یا ناموفق بوده است.
                </p>
              )}
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
