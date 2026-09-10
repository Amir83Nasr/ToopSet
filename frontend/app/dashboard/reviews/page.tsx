"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toPersianDigits, formatPersianDate } from "@/lib/utils"
import { Stars } from "@/components/vendors/vendor-shared"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MobileBackButton } from "@/components/dashboard/mobile-back-button"
import { MessageSquareText, RefreshCw } from "lucide-react"

interface MyReview {
  id: number
  user_id: number
  vendor_id: number
  booking_id: number
  rating: number
  comment: string | null
  response: string | null
  is_reported: boolean
  created_at: string
  user_name: string
  vendor_name: string
}

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<MyReview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res = await api<{ reviews: MyReview[]; total: number }>(
        "/api/v1/reviews/my?limit=50"
      )
      setReviews(res.reviews || [])
      setTotal(res.total || 0)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchReviews(), 0)
    return () => clearTimeout(timer)
  }, [fetchReviews])

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">نظرات من</h1>
          <p className="text-muted-foreground">
            نظراتی که پس از سانس‌های گذشته‌تان ثبت کرده‌اید
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MobileBackButton />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReviews}
            disabled={loading}
          >
            <RefreshCw className="me-1 size-4" />
            به‌روزرسانی
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
          <p className="text-sm text-muted-foreground">خطا در دریافت نظرات.</p>
          <Button variant="outline" onClick={fetchReviews}>
            <RefreshCw className="me-1.5 size-4" />
            تلاش مجدد
          </Button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border p-10 text-center">
          <div className="rounded-full bg-muted p-3">
            <MessageSquareText className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium">هنوز نظری ثبت نکرده‌اید</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            پس از برگزاری هر سانس، از تب «سانس قبلی» در رزروهای من می‌توانید
            برای مجموعه نظر ثبت کنید.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {toPersianDigits(total)} نظر ثبت شده.
          </p>
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  {review.vendor_name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatPersianDate(review.created_at)}
                  </span>
                  <Stars rating={review.rating} size={12} />
                </div>
              </div>
              {review.comment && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {review.comment}
                </p>
              )}
              {review.response && (
                <div className="mt-2 rounded-lg border bg-muted/40 p-3">
                  <p className="mb-1 text-xs font-semibold text-primary">
                    پاسخ مجموعه
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {review.response}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
