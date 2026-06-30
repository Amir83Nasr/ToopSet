"use client"

import { useMemo } from "react"
import { toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Loader2 } from "lucide-react"
import type { BookingDetail } from "@/components/bookings/types"

/* ── Cancellation preview computation (pure) ── */

interface CancelPreview {
  canCancel: boolean
  refundPercent: number
  penaltyPercent: number
  refundAmount: number
  penaltyAmount: number
  reason: string
}

function getCancelPreview(b: BookingDetail, now: number): CancelPreview {
  if (!b.slot_start_time) {
    return {
      canCancel: true,
      refundPercent: 100,
      penaltyPercent: 0,
      refundAmount: b.price_paid,
      penaltyAmount: 0,
      reason: "",
    }
  }
  const slotTime = new Date(b.slot_start_time).getTime()
  const hoursUntil = (slotTime - now) / (1000 * 60 * 60)

  if (hoursUntil < 2) {
    return {
      canCancel: false,
      refundPercent: 0,
      penaltyPercent: 0,
      refundAmount: 0,
      penaltyAmount: 0,
      reason: "امکان لغو کمتر از ۲ ساعت مانده به شروع سانس وجود ندارد",
    }
  }
  if (hoursUntil <= 24) {
    const penalty = b.price_paid * 0.5
    return {
      canCancel: true,
      refundPercent: 50,
      penaltyPercent: 50,
      refundAmount: b.price_paid * 0.5,
      penaltyAmount: penalty,
      reason: "لغو بین ۲ تا ۲۴ ساعت قبل: ۵۰٪ جریمه",
    }
  }
  return {
    canCancel: true,
    refundPercent: 100,
    penaltyPercent: 0,
    refundAmount: b.price_paid,
    penaltyAmount: 0,
    reason: "لغو بیش از ۲۴ ساعت قبل: بازگشت کامل وجه",
  }
}

/* ── Dialog component ── */

interface BookingCancelDialogProps {
  booking: BookingDetail | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  loading: boolean
}

export function BookingCancelDialog({
  booking,
  onOpenChange,
  onConfirm,
  loading,
}: BookingCancelDialogProps) {
  const preview = useMemo(
    // eslint-disable-next-line react-hooks/purity
    () => (booking ? getCancelPreview(booking, Date.now()) : null),
    [booking]
  )

  return (
    <AlertDialog
      open={!!booking}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false)
      }}
    >
      <AlertDialogContent>
        {booking && preview && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>لغو رزرو</AlertDialogTitle>
              <AlertDialogDescription>
                آیا از لغو رزرو {booking.vendor_name} مطمئن هستید؟
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3 rounded-lg border p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">مبلغ پرداختی</span>
                <span>
                  {new Intl.NumberFormat("fa-IR").format(booking.price_paid)}{" "}
                  تومان
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">درصد بازگشت</span>
                <span
                  className={
                    preview.refundPercent >= 100
                      ? "text-status-confirmed"
                      : "text-status-pending"
                  }
                >
                  {toPersianDigits(preview.refundPercent)}٪
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">مبلغ بازگشتی</span>
                <span className="font-medium text-status-confirmed">
                  {new Intl.NumberFormat("fa-IR").format(preview.refundAmount)}{" "}
                  تومان
                </span>
              </div>
              {preview.penaltyAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">جریمه</span>
                  <span className="font-medium text-destructive">
                    {new Intl.NumberFormat("fa-IR").format(
                      preview.penaltyAmount
                    )}{" "}
                    تومان
                  </span>
                </div>
              )}
              {!preview.canCancel && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{preview.reason}</span>
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <Button
                disabled={!preview.canCancel || loading}
                onClick={onConfirm}
                variant="destructive"
                className="hover:bg-destructive/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="ml-1 size-4 animate-spin" />
                    در حال لغو...
                  </>
                ) : (
                  "تأیید لغو"
                )}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
