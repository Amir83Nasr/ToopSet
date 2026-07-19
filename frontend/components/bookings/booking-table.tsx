"use client"

import { toPersianDigits } from "@/lib/utils"
import { BOOKING_STATUS_LABELS } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablePagination } from "@/components/ui/pagination"
import { CreditCard, XCircle, Loader2 } from "lucide-react"
import type { BookingDetail } from "@/components/bookings/types"

/* ── Helpers ── */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
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
  return `${new Intl.NumberFormat("fa-IR").format(amount)} تومان`
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
  showRefundStatus?: boolean
}

export function BookingTable({
  bookings,
  totalPages,
  page,
  onPageChange,
  payingId,
  onPay,
  onCancelClick,
  showRefundStatus = false,
}: BookingTableProps) {
  return (
    <div>
      {/* Mobile: stacked cards (avoids horizontal table scroll on phones) */}
      <div className="flex flex-col gap-3 md:hidden">
        {bookings.map((b) => {
          const st = BOOKING_STATUS_LABELS[b.status] || {
            label: b.status,
            variant: "outline" as const,
          }
          const canCancel =
            b.status === "pending_payment" ||
            (b.status === "confirmed" &&
              !!b.slot_start_time &&
              new Date(b.slot_start_time) > new Date())
          const refund = refundBadge(b)
          return (
            <div
              key={b.id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{b.vendor_name}</span>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">تاریخ</dt>
                  <dd>
                    {b.slot_start_time ? formatDate(b.slot_start_time) : "-"}
                    {b.slot_start_time && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatWeekday(b.slot_start_time)}
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">ساعت</dt>
                  <dd dir="ltr" className="text-right">
                    {b.slot_start_time && b.slot_end_time
                      ? `${formatTime(b.slot_start_time)} - ${formatTime(b.slot_end_time)}`
                      : "-"}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">مبلغ</dt>
                  <dd>{formatMoney(b.price_paid)}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">تعداد نفرات</dt>
                  <dd>{toPersianDigits(b.participants_count)}</dd>
                </div>
                {showRefundStatus && (
                  <div className="col-span-2 flex flex-col gap-1">
                    <dt className="text-xs text-muted-foreground">
                      وضعیت عودت
                    </dt>
                    <dd className="flex flex-wrap items-center gap-2">
                      <Badge variant={refund.variant}>{refund.label}</Badge>
                      {b.refund_amount !== null && (
                        <span className="text-xs text-muted-foreground">
                          {formatMoney(b.refund_amount)}
                        </span>
                      )}
                      {b.refund_destination_card_masked && (
                        <span
                          className="text-xs text-muted-foreground"
                          dir="ltr"
                        >
                          {toPersianDigits(b.refund_destination_card_masked)}
                        </span>
                      )}
                      {b.refund_paid_at && (
                        <span className="text-xs text-muted-foreground">
                          واریز: {formatDate(b.refund_paid_at)}
                        </span>
                      )}
                      {b.refund_payment_tracking_code && (
                        <span className="text-xs text-muted-foreground">
                          پیگیری:{" "}
                          {toPersianDigits(b.refund_payment_tracking_code)}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {b.status === "pending_cancellation" && (
                  <div className="col-span-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                    رزرو هنوز لغو قطعی نشده است. در صورت پرداخت توسط جایگزین،
                    مبلغ بازگشت وجه با کسر ۱۰٪ ثبت می‌شود.
                  </div>
                )}
              </dl>

              {(b.status === "pending_payment" ||
                (canCancel && b.status === "confirmed")) && (
                <div className="flex gap-2 border-t pt-3">
                  {b.status === "pending_payment" && (
                    <>
                      <Button
                        size="lg"
                        className="flex-1"
                        disabled={payingId === b.id}
                        onClick={() => onPay(b.id)}
                      >
                        {payingId === b.id ? (
                          <Loader2 className="me-1 size-4 animate-spin" />
                        ) : (
                          <CreditCard className="me-1 size-4" />
                        )}
                        پرداخت
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="flex-1"
                        onClick={() => onCancelClick(b)}
                      >
                        <XCircle className="me-1 size-4" />
                        لغو
                      </Button>
                    </>
                  )}
                  {canCancel && b.status === "confirmed" && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1"
                      onClick={() => onCancelClick(b)}
                    >
                      <XCircle className="me-1 size-4" />
                      لغو سانس
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop / tablet: full data table */}
      <Table tableWrapperClassName="hidden md:block">
        <TableHeader>
          <TableRow>
            <TableHead>مجموعه</TableHead>
            <TableHead className="w-24">تاریخ</TableHead>
            <TableHead className="w-20">روز</TableHead>
            <TableHead className="w-28">ساعت</TableHead>
            <TableHead className="w-28">مبلغ</TableHead>
            <TableHead className="w-16">تعداد</TableHead>
            <TableHead className="w-20">وضعیت</TableHead>
            {showRefundStatus && (
              <TableHead className="w-44">وضعیت عودت</TableHead>
            )}
            <TableHead className="w-40 text-right">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((b) => {
            const st = BOOKING_STATUS_LABELS[b.status] || {
              label: b.status,
              variant: "outline" as const,
            }
            const canCancel =
              b.status === "pending_payment" ||
              (b.status === "confirmed" &&
                !!b.slot_start_time &&
                new Date(b.slot_start_time) > new Date())
            const refund = refundBadge(b)
            return (
              <TableRow key={b.id}>
                <TableCell className="max-w-48 truncate font-medium">
                  {b.vendor_name}
                </TableCell>
                <TableCell>
                  {b.slot_start_time ? formatDate(b.slot_start_time) : "-"}
                </TableCell>
                <TableCell>
                  {b.slot_start_time ? formatWeekday(b.slot_start_time) : "-"}
                </TableCell>
                <TableCell>
                  {b.slot_start_time && b.slot_end_time
                    ? `${formatTime(b.slot_start_time)} - ${formatTime(b.slot_end_time)}`
                    : "-"}
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat("fa-IR").format(b.price_paid)} تومان
                </TableCell>
                <TableCell>{toPersianDigits(b.participants_count)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    {b.status === "pending_cancellation" && (
                      <div className="max-w-44 text-xs text-muted-foreground">
                        لغو پس از پرداخت جایگزین قطعی می‌شود.
                      </div>
                    )}
                  </div>
                </TableCell>
                {showRefundStatus && (
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={refund.variant}>{refund.label}</Badge>
                      {b.refund_amount !== null && (
                        <div className="text-xs text-muted-foreground">
                          {formatMoney(b.refund_amount)}
                        </div>
                      )}
                      {b.refund_destination_card_masked && (
                        <div
                          className="text-xs text-muted-foreground"
                          dir="ltr"
                        >
                          {toPersianDigits(b.refund_destination_card_masked)}
                        </div>
                      )}
                      {b.refund_paid_at && (
                        <div className="text-xs text-muted-foreground">
                          واریز: {formatDate(b.refund_paid_at)}
                        </div>
                      )}
                      {b.refund_payment_tracking_code && (
                        <div className="text-xs text-muted-foreground">
                          پیگیری:{" "}
                          {toPersianDigits(b.refund_payment_tracking_code)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex gap-2">
                    {b.status === "pending_payment" && (
                      <>
                        <Button
                          size="sm"
                          disabled={payingId === b.id}
                          onClick={() => onPay(b.id)}
                        >
                          {payingId === b.id ? (
                            <Loader2 className="me-1 size-4 animate-spin" />
                          ) : (
                            <CreditCard className="me-1 size-4" />
                          )}
                          پرداخت
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCancelClick(b)}
                        >
                          <XCircle className="me-1 size-4" />
                          لغو
                        </Button>
                      </>
                    )}
                    {canCancel && b.status === "confirmed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCancelClick(b)}
                      >
                        <XCircle className="me-1 size-4" />
                        لغو
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <TablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  )
}
