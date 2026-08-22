"use client"

import { useEffect, useState } from "react"
import { toPersianDigits, formatPrice, formatPersianDate } from "@/lib/utils"
import { BOOKING_STATUS_LABELS } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TablePagination } from "@/components/ui/pagination"
import {
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Undo2,
} from "lucide-react"
import type { BookingDetail } from "@/components/bookings/types"

/* ── Helpers ── */

function formatDate(iso: string): string {
  return formatPersianDate(iso)
}

function formatWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR", { weekday: "long" })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatMoney(amount: number): string {
  return formatPrice(amount)
}

function formatRemaining(expiresAt: string | null, now: number): string | null {
  if (!expiresAt) return null
  const seconds = Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - now) / 1000)
  )
  if (seconds === 0) return "در انتظار تعیین تکلیف درگاه"
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `مهلت پرداخت ${toPersianDigits(
    `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
  )}`
}

function refundBadge(booking: BookingDetail): {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
} {
  switch (booking.refund_status) {
    case "paid":
      return { label: "عودت داده شده", variant: "default" }
    case "approved":
      return { label: "تایید شده، در انتظار پرداخت", variant: "secondary" }
    case "pending":
      return { label: "در انتظار بررسی عودت", variant: "outline" }
    case "rejected":
      return { label: "عودت رد شده", variant: "destructive" }
    default:
      if (booking.payment?.status === "success") {
        return { label: "عودت ثبت نشده", variant: "outline" }
      }
      return { label: "پرداختی نداشته", variant: "secondary" }
  }
}

/* ── Props ── */

interface BookingTableProps {
  bookings: BookingDetail[]
  totalPages: number
  page: number
  onPageChange: (page: number) => void
  payingId: number | null
  onPay: (bookingId: number) => void
  onCancelClick: (booking: BookingDetail) => void
  withdrawingId: number | null
  onWithdrawCancellation: (bookingId: number) => void
  showRefundStatus?: boolean
  category: "current" | "past" | "cancelled"
}

export function BookingTable({
  bookings,
  totalPages,
  page,
  onPageChange,
  payingId,
  onPay,
  onCancelClick,
  withdrawingId,
  onWithdrawCancellation,
  showRefundStatus = false,
}: BookingTableProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {bookings.map((b) => {
          const st = BOOKING_STATUS_LABELS[b.status] || {
            label: b.status,
            variant: "secondary" as const,
          }
          const refund = refundBadge(b)
          const remaining =
            b.status === "pending_payment"
              ? formatRemaining(b.expires_at ?? null, now)
              : null
          const canResumePayment =
            b.status === "pending_payment" &&
            (!b.expires_at || new Date(b.expires_at).getTime() > now)
          const canCancel = b.slot_start_time
            ? new Date(b.slot_start_time).getTime() > now
            : false
          const hasRefundInfo =
            showRefundStatus ||
            Boolean(
              b.refund_status ||
              b.refund_amount !== null ||
              b.refund_destination_card_masked ||
              b.refund_paid_at ||
              b.refund_payment_tracking_code
            )
          const hasAction =
            b.status === "pending_payment" ||
            (canCancel && b.status === "confirmed") ||
            b.status === "pending_cancellation"

          return (
            <div
              key={b.id}
              className="flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10 transition-all hover:shadow-md"
            >
              <div>
                {/* Header: Venue & Status */}
                <div className="flex items-start justify-between gap-3 border-b bg-muted/30 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 shrink-0 text-primary" />
                      <h3
                        className="truncate text-base font-semibold text-foreground"
                        title={b.vendor_name}
                      >
                        {b.vendor_name}
                      </h3>
                    </div>
                    {b.vendor_address && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{b.vendor_address}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      #{toPersianDigits(b.id)}
                    </span>
                  </div>
                </div>

                {/* Body: Details */}
                <div className="space-y-3.5 p-4 text-sm">
                  {/* Slot Date & Time */}
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                    <div className="flex items-start gap-2">
                      <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="text-[11px] text-muted-foreground">
                          تاریخ سانس
                        </div>
                        <div className="text-xs font-medium text-foreground">
                          {b.slot_start_time
                            ? formatDate(b.slot_start_time)
                            : "-"}
                        </div>
                        {b.slot_start_time && (
                          <div className="text-[11px] text-muted-foreground">
                            {formatWeekday(b.slot_start_time)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="text-[11px] text-muted-foreground">
                          ساعت سانس
                        </div>
                        <div
                          className="text-xs font-medium text-foreground"
                          dir="ltr"
                        >
                          {b.slot_start_time && b.slot_end_time
                            ? `${formatTime(b.slot_start_time)} - ${formatTime(b.slot_end_time)}`
                            : "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price Paid */}
                  <div className="flex items-center justify-between border-t pt-2 text-xs">
                    <span className="text-muted-foreground">مبلغ پرداختی:</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatPrice(b.price_paid)}
                    </span>
                  </div>

                  {/* Pending cancellation message */}
                  {b.status === "pending_cancellation" && (
                    <div className="rounded-md border border-blue-500/20 bg-blue-500/10 p-2.5 text-xs text-blue-700 dark:text-blue-400">
                      لغو پس از پرداخت جایگزین قطعی می‌شود.
                    </div>
                  )}

                  {/* Remaining timer for pending payment */}
                  {remaining && (
                    <div className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                      <Clock className="size-3.5 shrink-0" />
                      <span>{remaining}</span>
                    </div>
                  )}

                  {/* Refund details */}
                  {hasRefundInfo && (
                    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">
                          وضعیت عودت وجه
                        </span>
                        <Badge variant={refund.variant}>{refund.label}</Badge>
                      </div>
                      {b.refund_amount !== null && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>مبلغ بازگشتی:</span>
                          <span className="font-medium text-foreground">
                            {formatMoney(b.refund_amount)}
                          </span>
                        </div>
                      )}
                      {b.refund_destination_card_masked && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>کارت مقصد:</span>
                          <span dir="ltr" className="font-mono text-foreground">
                            {toPersianDigits(b.refund_destination_card_masked)}
                          </span>
                        </div>
                      )}
                      {b.refund_paid_at && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>تاریخ واریز:</span>
                          <span className="text-foreground">
                            {formatDate(b.refund_paid_at)}
                          </span>
                        </div>
                      )}
                      {b.refund_payment_tracking_code && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>کد پیگیری:</span>
                          <span dir="ltr" className="font-mono text-foreground">
                            {toPersianDigits(b.refund_payment_tracking_code)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer: Action buttons */}
              {hasAction && (
                <div className="border-t bg-muted/20 p-3">
                  {b.status === "pending_payment" && (
                    <Button
                      className="w-full"
                      disabled={payingId === b.id || !canResumePayment}
                      onClick={() => onPay(b.id)}
                    >
                      {payingId === b.id ? (
                        <Loader2 className="me-1.5 size-4 animate-spin" />
                      ) : (
                        <CreditCard className="me-1.5 size-4" />
                      )}
                      ادامه پرداخت
                    </Button>
                  )}
                  {canCancel && b.status === "confirmed" && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => onCancelClick(b)}
                    >
                      لغو رزرو
                    </Button>
                  )}
                  {b.status === "pending_cancellation" && (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={withdrawingId === b.id}
                      onClick={() => onWithdrawCancellation(b.id)}
                    >
                      {withdrawingId === b.id ? (
                        <Loader2 className="me-1.5 size-4 animate-spin" />
                      ) : (
                        <Undo2 className="me-1.5 size-4" />
                      )}
                      انصراف از لغو
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  )
}
