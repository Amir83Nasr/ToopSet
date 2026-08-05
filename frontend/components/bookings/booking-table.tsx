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
import { CreditCard, Loader2, Undo2 } from "lucide-react"
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
  category,
}: BookingTableProps) {
  const categoryLabel: Record<BookingTableProps["category"], string> = {
    current: "سانس جاری",
    past: "سانس قبلی",
    cancelled: "سانس لغوشده",
  }

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
              className="overflow-hidden rounded-2xl border bg-card shadow-xs"
            >
              <div className="border-b bg-muted/20 px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-semibold">{b.vendor_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.vendor_address ||
                        `شماره رزرو ${toPersianDigits(b.id)}`}
                    </p>
                  </div>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-background px-2 py-1">
                    {categoryLabel[category]}
                  </span>
                  <span className="rounded-full bg-background px-2 py-1">
                    #{toPersianDigits(b.id)}
                  </span>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-px bg-border text-sm">
                <div className="flex min-h-16 flex-col justify-center gap-1 bg-card px-4 py-3">
                  <dt className="text-xs text-muted-foreground">تاریخ</dt>
                  <dd className="font-medium tabular-nums">
                    {b.slot_start_time ? formatDate(b.slot_start_time) : "-"}
                    {b.slot_start_time && (
                      <span className="ms-1 text-xs font-normal text-muted-foreground">
                        {" "}
                        {formatWeekday(b.slot_start_time)}
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex min-h-16 flex-col justify-center gap-1 bg-card px-4 py-3">
                  <dt className="text-xs text-muted-foreground">ساعت</dt>
                  <dd dir="ltr" className="text-right font-medium tabular-nums">
                    {b.slot_start_time && b.slot_end_time
                      ? `${formatTime(b.slot_start_time)} - ${formatTime(b.slot_end_time)}`
                      : "-"}
                  </dd>
                </div>
                <div className="flex min-h-16 flex-col justify-center gap-1 bg-card px-4 py-3">
                  <dt className="text-xs text-muted-foreground">مبلغ</dt>
                  <dd className="font-medium tabular-nums">
                    {formatMoney(b.price_paid)}
                  </dd>
                </div>
                <div className="flex min-h-16 flex-col justify-center gap-1 bg-card px-4 py-3">
                  <dt className="text-xs text-muted-foreground">وضعیت رزرو</dt>
                  <dd className="font-medium">{st.label}</dd>
                </div>
                {showRefundStatus && (
                  <div className="col-span-2 flex flex-col gap-2 bg-card px-4 py-3">
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
                  <div className="col-span-2 bg-status-pending-bg px-4 py-3 text-xs leading-5 text-status-pending">
                    رزرو هنوز لغو قطعی نشده است. در صورت پرداخت توسط جایگزین،
                    مبلغ بازگشت وجه با کسر ۱۰٪ ثبت می‌شود.
                  </div>
                )}
                {category === "past" && b.slot_end_time && (
                  <div className="col-span-2 bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
                    این رزرو به پایان رسیده است.
                  </div>
                )}
                {category === "current" && b.slot_start_time && (
                  <div className="col-span-2 bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
                    این رزرو در فهرست جاری نمایش داده می‌شود.
                  </div>
                )}
                {category === "cancelled" && (
                  <div className="col-span-2 bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
                    این رزرو لغوشده یا از چرخه عادی خارج شده است.
                  </div>
                )}
              </dl>

              {(b.status === "pending_payment" ||
                b.status === "pending_cancellation" ||
                (canCancel && b.status === "confirmed")) && (
                <div className="grid gap-2 border-t bg-muted/10 p-3 sm:grid-cols-2">
                  {b.status === "pending_payment" && (
                    <>
                      <Button
                        size="lg"
                        className="w-full"
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
                        variant="destructive"
                        size="lg"
                        className="w-full"
                        onClick={() => onCancelClick(b)}
                      >
                        لغو رزرو
                      </Button>
                    </>
                  )}
                  {canCancel && b.status === "confirmed" && (
                    <Button
                      variant="destructive"
                      size="lg"
                      className="w-full"
                      onClick={() => onCancelClick(b)}
                    >
                      لغو رزرو
                    </Button>
                  )}
                  {b.status === "pending_cancellation" && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      disabled={withdrawingId === b.id}
                      onClick={() => onWithdrawCancellation(b.id)}
                    >
                      {withdrawingId === b.id ? (
                        <Loader2 className="me-1 size-4 animate-spin" />
                      ) : (
                        <Undo2 className="me-1 size-4" />
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

      {/* Desktop / tablet: full data table */}
      <Table
        className={
          showRefundStatus
            ? "min-w-[1180px] table-fixed"
            : "min-w-[980px] table-fixed"
        }
        tableWrapperClassName="hidden md:block shadow-xs"
      >
        <colgroup>
          <col className="w-[210px]" />
          <col className="w-[135px]" />
          <col className="w-[90px]" />
          <col className="w-[135px]" />
          <col className="w-[145px]" />
          <col className="w-[175px]" />
          {showRefundStatus && <col className="w-[220px]" />}
          <col className="w-[220px]" />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-12 px-4">مجموعه</TableHead>
            <TableHead className="h-12 px-4 text-center">تاریخ</TableHead>
            <TableHead className="h-12 px-4 text-center">روز</TableHead>
            <TableHead className="h-12 px-4 text-center">ساعت</TableHead>
            <TableHead className="h-12 px-4 text-center">
              مبلغ پرداختی
            </TableHead>
            <TableHead className="h-12 px-4 text-center">وضعیت</TableHead>
            {showRefundStatus && (
              <TableHead className="h-12 px-4 text-center">
                وضعیت عودت
              </TableHead>
            )}
            <TableHead className="h-12 px-4 text-center">عملیات</TableHead>
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
              <TableRow key={b.id} className="group h-[76px]">
                <TableCell className="px-4 py-3 whitespace-normal">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-semibold">{b.vendor_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.vendor_address || `رزرو ${toPersianDigits(b.id)}`}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-center font-medium tabular-nums">
                  {b.slot_start_time ? formatDate(b.slot_start_time) : "-"}
                </TableCell>
                <TableCell className="px-4 py-3 text-center text-muted-foreground">
                  {b.slot_start_time ? formatWeekday(b.slot_start_time) : "-"}
                </TableCell>
                <TableCell className="px-4 py-3 text-center font-medium tabular-nums">
                  <span dir="ltr" className="inline-block text-center">
                    {b.slot_start_time && b.slot_end_time
                      ? `${formatTime(b.slot_start_time)} - ${formatTime(b.slot_end_time)}`
                      : "-"}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-center font-medium tabular-nums">
                  <span>
                    {new Intl.NumberFormat("fa-IR").format(b.price_paid)}
                  </span>
                  <span className="ms-1 text-xs font-normal text-muted-foreground">
                    تومان
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-center whitespace-normal">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="text-xs text-muted-foreground md:hidden">
                      {categoryLabel[category]}
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    {b.status === "pending_cancellation" && (
                      <div className="text-xs leading-5 text-muted-foreground">
                        لغو پس از پرداخت جایگزین قطعی می‌شود.
                      </div>
                    )}
                  </div>
                </TableCell>
                {showRefundStatus && (
                  <TableCell className="px-4 py-3 text-center whitespace-normal">
                    <div className="flex flex-col items-center gap-1">
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
                <TableCell className="px-4 py-3 text-center">
                  <div className="flex min-w-max items-center justify-center gap-2">
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
                          variant="destructive"
                          size="sm"
                          onClick={() => onCancelClick(b)}
                        >
                          لغو رزرو
                        </Button>
                      </>
                    )}
                    {canCancel && b.status === "confirmed" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onCancelClick(b)}
                      >
                        لغو رزرو
                      </Button>
                    )}
                    {b.status === "pending_cancellation" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={withdrawingId === b.id}
                        onClick={() => onWithdrawCancellation(b.id)}
                      >
                        {withdrawingId === b.id ? (
                          <Loader2 className="me-1 size-4 animate-spin" />
                        ) : (
                          <Undo2 className="me-1 size-4" />
                        )}
                        انصراف از لغو
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
