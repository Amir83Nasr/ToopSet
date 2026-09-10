"use client"

import { useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Loader2, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BookingDetail } from "@/components/bookings/types"

interface ReviewDialogProps {
  /** The booking to review; null closes the dialog. */
  booking: BookingDetail | null
  onOpenChange: (open: boolean) => void
  /** Called after a successful submit — parent marks the booking as reviewed. */
  onReviewed: (bookingId: number) => void
}

const RATING_HINTS: Record<number, string> = {
  1: "بسیار بد",
  2: "بد",
  3: "متوسط",
  4: "خوب",
  5: "عالی",
}

/**
 * Submit a 1–5 star review (plus optional comment) for a completed booking.
 * The backend enforces one review per booking and that the slot has ended;
 * those errors surface as Persian toasts.
 */
export function ReviewDialog({
  booking,
  onOpenChange,
  onReviewed,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Reset the form whenever a new booking opens (deferred per project pattern)
  useEffect(() => {
    if (!booking) return
    const timer = setTimeout(() => {
      setRating(0)
      setHovered(0)
      setComment("")
    }, 0)
    return () => clearTimeout(timer)
  }, [booking])

  const active = hovered || rating
  const canSubmit = rating > 0 && !submitting

  async function handleSubmit() {
    if (!booking || !canSubmit) return
    setSubmitting(true)
    try {
      await api("/api/v1/reviews", {
        method: "POST",
        body: JSON.stringify({
          booking_id: booking.id,
          rating,
          comment: comment.trim() || undefined,
        }),
      })
      toast.success("نظر شما با موفقیت ثبت شد. ممنون!")
      onReviewed(booking.id)
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ثبت نظر"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ResponsiveDialog
      open={!!booking}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false)
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-md">
        {booking && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>ثبت نظر</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                تجربه خود از {booking.vendor_name} را با سایر کاربران به اشتراک
                بگذارید.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <div className="space-y-5">
              {/* Star rating — 44px touch targets */}
              <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-4">
                <div className="flex gap-1.5" dir="ltr">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${RATING_HINTS[value]} (${toPersianDigits(value)} ستاره)`}
                      aria-pressed={rating === value}
                      className="flex size-11 items-center justify-center rounded-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      onMouseEnter={() => setHovered(value)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(value)}
                    >
                      <Star
                        className={cn(
                          "size-7 transition-colors",
                          value <= active
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/40"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {active > 0
                    ? RATING_HINTS[active]
                    : "امتیاز خود را انتخاب کنید"}
                </p>
              </div>

              <div className="space-y-2">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                  placeholder="نظر شما درباره کیفیت مجموعه (اختیاری)"
                  rows={4}
                  className="resize-none"
                  dir="rtl"
                />
                <p className="text-end text-xs text-muted-foreground">
                  {toPersianDigits(comment.length)} از {toPersianDigits(1000)}
                </p>
              </div>
            </div>

            <ResponsiveDialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                انصراف
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {submitting && (
                  <Loader2 className="me-1.5 size-4 animate-spin" />
                )}
                ثبت نظر
              </Button>
            </ResponsiveDialogFooter>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
