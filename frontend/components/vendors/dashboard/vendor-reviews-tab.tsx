"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { toPersianDigits, formatPersianDate } from "@/lib/utils"
import { Stars } from "@/components/vendors/vendor-shared"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, MessageSquareText, RefreshCw, Star } from "lucide-react"

interface VendorReview {
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

interface VendorReviewsTabProps {
  vendorId: number
  /** Managers (and admins) may reply; plain users get a read-only list. */
  canRespond: boolean
}

/**
 * Vendor reviews management: list reviews with rating, comment and date, and
 * let the vendor's manager post a public response (`POST /reviews/{id}/respond`).
 */
export function VendorReviewsTab({
  vendorId,
  canRespond,
}: VendorReviewsTabProps) {
  const [reviews, setReviews] = useState<VendorReview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [respondingId, setRespondingId] = useState<number | null>(null)
  const [responseText, setResponseText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res = await api<{ reviews: VendorReview[]; total: number }>(
        `/api/v1/vendors/${vendorId}/reviews?limit=50`
      )
      setReviews(res.reviews || [])
      setTotal(res.total || 0)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    const timer = setTimeout(() => fetchReviews(), 0)
    return () => clearTimeout(timer)
  }, [fetchReviews])

  function startRespond(review: VendorReview) {
    setRespondingId(review.id)
    setResponseText(review.response || "")
  }

  function cancelRespond() {
    setRespondingId(null)
    setResponseText("")
  }

  async function submitResponse(reviewId: number) {
    const text = responseText.trim()
    if (!text) return
    setSubmitting(true)
    try {
      const updated = await api<VendorReview>(
        `/api/v1/reviews/${reviewId}/respond`,
        { method: "POST", body: JSON.stringify({ response: text }) }
      )
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, response: updated.response } : r
        )
      )
      toast.success("پاسخ شما ثبت شد")
      cancelRespond()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ثبت پاسخ"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
        <p className="text-sm text-muted-foreground">
          خطا در دریافت نظرات این مجموعه.
        </p>
        <Button variant="outline" onClick={fetchReviews}>
          <RefreshCw className="me-1.5 size-4" />
          تلاش مجدد
        </Button>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border p-10 text-center">
        <div className="rounded-full bg-muted p-3">
          <MessageSquareText className="size-6 text-muted-foreground" />
        </div>
        <p className="font-medium">هنوز نظری ثبت نشده است</p>
        <p className="text-sm text-muted-foreground">
          پس از برگزاری سانس‌ها، نظر کاربران اینجا نمایش داده می‌شود.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {toPersianDigits(total)} نظر برای این مجموعه ثبت شده است.
        </p>
        <Button variant="outline" size="sm" onClick={fetchReviews}>
          <RefreshCw className="me-1 size-4" />
          به‌روزرسانی
        </Button>
      </div>

      {reviews.map((review) => (
        <div key={review.id} className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {review.user_name || "کاربر"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatPersianDate(review.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {review.is_reported && (
                <Badge variant="destructive">گزارش‌شده</Badge>
              )}
              <Stars rating={review.rating} size={12} />
            </div>
          </div>

          {review.comment && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {review.comment}
            </p>
          )}

          {review.response ? (
            <div className="mt-2 rounded-lg border bg-muted/40 p-3">
              <p className="mb-1 text-xs font-semibold text-primary">
                پاسخ مجموعه
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {review.response}
              </p>
            </div>
          ) : (
            respondingId === review.id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={responseText}
                  onChange={(e) =>
                    setResponseText(e.target.value.slice(0, 2000))
                  }
                  placeholder="پاسخ خود به این نظر را بنویسید..."
                  rows={3}
                  className="resize-none"
                  dir="rtl"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelRespond}
                    disabled={submitting}
                  >
                    انصراف
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => submitResponse(review.id)}
                    disabled={submitting || !responseText.trim()}
                  >
                    {submitting ? (
                      <Loader2 className="me-1 size-4 animate-spin" />
                    ) : (
                      <Star className="me-1 size-4" />
                    )}
                    ثبت پاسخ
                  </Button>
                </div>
              </div>
            )
          )}

          {canRespond && !review.response && respondingId !== review.id && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => startRespond(review)}
            >
              <MessageSquareText className="me-1 size-4" />
              پاسخ به نظر
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
