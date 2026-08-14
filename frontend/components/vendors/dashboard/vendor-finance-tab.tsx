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
import { RefreshCw, Loader2, Wallet, Receipt } from "lucide-react"

const bookingStatusLabels: Record<string, string> = {
  confirmed: "تأییدشده",
  cancelled: "لغوشده",
  expired: "منقضی‌شده",
  transferred: "منتقل‌شده",
}

const settlementStatusLabels: Record<string, string> = {
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
        <div className="grid w-full gap-2 min-[400px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap">
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
          <CardHeader className="pb-2">
            <CardDescription>رزرو آنلاین موفق</CardDescription>
            <CardTitle className="text-2xl">
              {toPersianDigits(financeSummary?.successful_online_bookings ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatMoney(financeSummary?.total_online_revenue ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>قابل تسویه</CardDescription>
            <CardTitle className="text-2xl">
              {toPersianDigits(
                financeSummary?.available_for_settlement_bookings ?? 0
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatMoney(financeSummary?.available_for_settlement ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>در جریان تسویه</CardDescription>
            <CardTitle className="text-2xl">
              {toPersianDigits(
                financeSummary?.settlement_requested_bookings ?? 0
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatMoney(financeSummary?.settlement_requested_amount ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>تسویه شده</CardDescription>
            <CardTitle className="text-2xl">
              {toPersianDigits(financeSummary?.settled_bookings ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatMoney(financeSummary?.settled_amount ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>هنوز موعد نرسیده</CardDescription>
            <CardTitle className="text-2xl">
              {toPersianDigits(financeSummary?.not_due_bookings ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            قابل تسویه بعد از برگزاری سانس
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
        <CardContent>
          {settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              هنوز درخواستی ثبت نشده است.
            </p>
          ) : (
            <div className="space-y-2">
              {settlements.map((settlement) => (
                <div
                  key={settlement.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <span>
                    {new Date(settlement.requested_at).toLocaleDateString(
                      "fa-IR"
                    )}
                  </span>
                  <span>{formatMoney(settlement.requested_amount)}</span>
                  <Badge variant="outline">{settlement.status}</Badge>
                  {settlement.payment_tracking_code && (
                    <span dir="ltr">
                      {settlement.payment_tracking_code}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openSettlementDetail(settlement.id)}
                    disabled={settlementDetailLoading}
                  >
                    جزئیات
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ResponsiveDialog
        open={settlementDetailOpen}
        mobileAsSheet={false}
        onOpenChange={(open) => {
          setSettlementDetailOpen(open)
          if (!open) setSelectedSettlement(null)
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-3xl">
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
                  <span className="text-muted-foreground">کد رهگیری</span>
                  <div className="font-medium" dir="ltr">
                    {selectedSettlement.payment_tracking_code || "ثبت نشده"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">وضعیت</span>
                  <div className="font-medium">{selectedSettlement.status}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">تعداد رزروها</span>
                  <div className="font-medium">
                    {toPersianDigits(selectedSettlement.bookings_count)}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رزرو</TableHead>
                      <TableHead>مشتری</TableHead>
                      <TableHead>زمان سانس</TableHead>
                      <TableHead className="text-center">وضعیت رزرو</TableHead>
                      <TableHead className="text-center">وضعیت تسویه</TableHead>
                      <TableHead className="text-center">مبلغ خالص</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSettlement.items.map((item) => (
                      <TableRow key={item.booking_id}>
                        <TableCell>
                          {toPersianDigits(item.booking_id)}
                        </TableCell>
                        <TableCell>{item.customer_name}</TableCell>
                        <TableCell>
                          {new Date(item.slot_start_time).toLocaleString(
                            "fa-IR"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {bookingStatusLabels[item.booking_status] ??
                            item.booking_status}
                        </TableCell>
                        <TableCell className="text-center">
                          {settlementStatusLabels[item.settlement_status] ??
                            item.settlement_status}
                        </TableCell>
                        <TableCell className="text-center">
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
