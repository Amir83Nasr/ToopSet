"use client"

import { useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { toPersianDigits } from "@/lib/utils"
import {
  type FinanceBooking,
  type FinanceSummary,
  type VendorSettlementDetail,
  type VendorSettlement,
  formatBookingDate,
  formatBookingTime,
  formatBookingWeekday,
  formatMoney,
  settlementStateForBooking,
} from "@/components/vendors/dashboard/vendor-utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import {
  RefreshCw,
  Loader2,
  Wallet,
  Receipt,
  BadgeCheck,
  Hourglass,
  CalendarClock,
} from "lucide-react"

const bookingStatusLabels: Record<string, string> = {
  confirmed: "تأییدشده",
  cancelled: "لغوشده",
  expired: "منقضی‌شده",
  transferred: "منتقل‌شده",
}

const settlementRequestStatusLabels: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "ردشده",
  paid: "پرداخت‌شده",
}
const bookingSettlementStatusLabels: Record<string, string> = {
  not_settled: "تسویه نشده",
  settlement_requested: "درخواست تسویه",
  included_in_settlement: "در تسویه",
  settled: "تسویه شده",
  excluded_due_to_cancellation: "خارج شده به‌دلیل لغو",
  excluded_due_to_refund: "خارج شده به‌دلیل بازگشت وجه",
  excluded_manual_booking: "رزرو دستی",
}

interface VendorFinanceTabProps {
  bookings: FinanceBooking[]
  bookingsLoading: boolean
  financeSummary: FinanceSummary | null
  financeLoading: boolean
  settlementRequesting: boolean
  settlements: VendorSettlement[]
  onRefresh: () => void
  onRequestSettlement: () => void
}

export function VendorFinanceTab({
  bookings,
  bookingsLoading,
  financeSummary,
  financeLoading,
  settlementRequesting,
  settlements,
  onRefresh,
  onRequestSettlement,
}: VendorFinanceTabProps) {
  const [selectedSettlement, setSelectedSettlement] =
    useState<VendorSettlementDetail | null>(null)
  const [settlementDetailOpen, setSettlementDetailOpen] = useState(false)
  const [settlementDetailLoading, setSettlementDetailLoading] = useState(false)

  async function openSettlementDetail(settlementId: number) {
    setSettlementDetailOpen(true)
    setSelectedSettlement(null)
    setSettlementDetailLoading(true)
    try {
      const detail = await api<VendorSettlementDetail>(
        `/api/v1/manager/settlements/${settlementId}`
      )
      setSelectedSettlement(detail)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "خطا در دریافت جزئیات تسویه"
      )
      setSelectedSettlement(null)
      setSettlementDetailOpen(false)
    } finally {
      setSettlementDetailLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Finance toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">داشبورد مالی مجموعه</h2>
          <p className="text-sm text-muted-foreground">
            فقط رزروهای آنلاین تأییدشده با پرداخت موفق نمایش داده می‌شوند.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={financeLoading || bookingsLoading}
          >
            <RefreshCw className="me-1.5 size-4" />
            بروزرسانی
          </Button>
          <Button
            size="sm"
            onClick={onRequestSettlement}
            disabled={
              settlementRequesting ||
              financeLoading ||
              !financeSummary ||
              financeSummary.available_for_settlement <= 0
            }
          >
            {settlementRequesting ? (
              <Loader2 className="me-1.5 size-4 animate-spin" />
            ) : (
              <Wallet className="me-1.5 size-4" />
            )}
            درخواست تسویه موارد قابل تسویه
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-3 min-[400px]:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardDescription>رزرو آنلاین موفق</CardDescription>
            <Receipt className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">
              {toPersianDigits(financeSummary?.successful_online_bookings ?? 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatMoney(financeSummary?.total_online_revenue ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardDescription>قابل تسویه</CardDescription>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">
              {toPersianDigits(
                financeSummary?.available_for_settlement_bookings ?? 0
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatMoney(financeSummary?.available_for_settlement ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardDescription>در جریان تسویه</CardDescription>
            <Hourglass className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">
              {toPersianDigits(
                financeSummary?.settlement_requested_bookings ?? 0
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatMoney(financeSummary?.settlement_requested_amount ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardDescription>تسویه شده</CardDescription>
            <BadgeCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">
              {toPersianDigits(financeSummary?.settled_bookings ?? 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatMoney(financeSummary?.settled_amount ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardDescription>هنوز موعد نرسیده</CardDescription>
            <CalendarClock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">
              {toPersianDigits(financeSummary?.not_due_bookings ?? 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              قابل تسویه بعد از برگزاری سانس
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings table */}
      <Card>
        <CardHeader>
          <CardTitle>رکورد رزروها</CardTitle>
          <CardDescription>
            وضعیت هر رزرو موفق بر اساس زمان پایان سانس و فرایند تسویه نمایش داده
            می‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          {bookingsLoading || financeLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-md" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <Receipt className="size-10 text-muted-foreground/40" />
              رزرو آنلاین موفقی برای این مجموعه ثبت نشده است.
            </div>
          ) : (
            <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
              <Table className="min-w-220 table-fixed">
                <colgroup>
                  <col className="w-48" />
                  <col className="w-32" />
                  <col className="w-24" />
                  <col className="w-36" />
                  <col className="w-32" />
                  <col className="w-56" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>مشتری</TableHead>
                    <TableHead className="text-center">تاریخ سانس</TableHead>
                    <TableHead className="text-center">روز</TableHead>
                    <TableHead className="text-center">ساعت</TableHead>
                    <TableHead className="text-center">مبلغ</TableHead>
                    <TableHead className="text-center">وضعیت تسویه</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => {
                    const state = settlementStateForBooking(booking)
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          <div>
                            {booking.user_name ||
                              booking.customer_full_name ||
                              "نامشخص"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {booking.user_phone || booking.customer_phone
                              ? toPersianDigits(
                                  booking.user_phone ||
                                    booking.customer_phone ||
                                    ""
                                )
                              : "بدون شماره"}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {booking.slot_start_time
                            ? formatBookingDate(booking.slot_start_time)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {booking.slot_start_time
                            ? formatBookingWeekday(booking.slot_start_time)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span dir="ltr" className="inline-block">
                            {booking.slot_start_time && booking.slot_end_time
                              ? `${formatBookingTime(
                                  booking.slot_start_time
                                )} - ${formatBookingTime(booking.slot_end_time)}`
                              : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {formatMoney(booking.price_paid)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={state.variant}>{state.label}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>تاریخچه درخواست‌های تسویه</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          {settlements.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground sm:px-0">
              هنوز درخواستی ثبت نشده است.
            </p>
          ) : (
            <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
              <Table className="min-w-170 table-fixed">
                <colgroup>
                  <col className="w-28" />
                  <col className="w-32" />
                  <col className="w-32" />
                  <col className="w-40" />
                  <col className="w-20" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>تاریخ</TableHead>
                    <TableHead className="text-center">مبلغ</TableHead>
                    <TableHead className="text-center">وضعیت</TableHead>
                    <TableHead className="text-center">کد رهگیری</TableHead>
                    <TableHead className="text-center">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(settlement.requested_at).toLocaleDateString(
                          "fa-IR"
                        )}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {formatMoney(settlement.requested_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {settlementRequestStatusLabels[settlement.status] ??
                            settlement.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {settlement.payment_tracking_code ? (
                          <span dir="ltr" className="block truncate">
                            {settlement.payment_tracking_code}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSettlementDetail(settlement.id)}
                          disabled={settlementDetailLoading}
                        >
                          جزئیات
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ResponsiveDialog
        open={settlementDetailOpen}
        onOpenChange={(open) => {
          setSettlementDetailOpen(open)
          if (!open) setSelectedSettlement(null)
        }}
      >
        <ResponsiveDialogContent
          className="sm:max-w-3xl"
          mobileMaxHeight="calc(100dvh - 2rem)"
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              جزئیات تسویه
              {selectedSettlement
                ? ` ${toPersianDigits(selectedSettlement.id)}`
                : ""}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              آیتم‌های این تسویه و وضعیت کد رهگیری بانکی در همین بخش نمایش داده
              می‌شود.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {settlementDetailLoading ? (
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          ) : selectedSettlement ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">مبلغ درخواست</span>
                  <div className="font-medium">
                    {formatMoney(selectedSettlement.requested_amount)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">مبلغ ناخالص</span>
                  <div className="font-medium">
                    {formatMoney(selectedSettlement.gross_amount)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">کمیسیون</span>
                  <div className="font-medium">
                    {formatMoney(selectedSettlement.commission_amount)} (
                    {toPersianDigits(selectedSettlement.commission_percent)}٪)
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">کارمزد درگاه</span>
                  <div className="font-medium">
                    {formatMoney(selectedSettlement.gateway_fee)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">کد رهگیری</span>
                  {selectedSettlement.payment_tracking_code ? (
                    <div className="text-end font-medium" dir="ltr">
                      {selectedSettlement.payment_tracking_code}
                    </div>
                  ) : (
                    <div className="font-medium text-muted-foreground">
                      ثبت نشده
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">وضعیت</span>
                  <div className="font-medium">
                    {settlementRequestStatusLabels[selectedSettlement.status] ??
                      selectedSettlement.status}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">تعداد رزروها</span>
                  <div className="font-medium">
                    {toPersianDigits(selectedSettlement.bookings_count)}
                  </div>
                </div>
              </div>

              <div className="-mx-2 overflow-x-auto px-2">
                <Table className="min-w-160">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">رزرو</TableHead>
                      <TableHead className="whitespace-nowrap">مشتری</TableHead>
                      <TableHead className="whitespace-nowrap">
                        زمان سانس
                      </TableHead>
                      <TableHead className="text-center whitespace-nowrap">
                        وضعیت رزرو
                      </TableHead>
                      <TableHead className="text-center whitespace-nowrap">
                        وضعیت تسویه
                      </TableHead>
                      <TableHead className="text-center whitespace-nowrap">
                        مبلغ خالص
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSettlement.items.map((item) => (
                      <TableRow key={item.booking_id}>
                        <TableCell className="whitespace-nowrap">
                          {toPersianDigits(item.booking_id)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.customer_name}
                        </TableCell>
                        <TableCell>
                          <div>{formatBookingDate(item.slot_start_time)}</div>
                          <div
                            className="text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            {formatBookingTime(item.slot_start_time)} -{" "}
                            {formatBookingTime(item.slot_end_time)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {bookingStatusLabels[item.booking_status] ??
                            item.booking_status}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {bookingSettlementStatusLabels[
                            item.settlement_status
                          ] ?? item.settlement_status}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {formatMoney(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
