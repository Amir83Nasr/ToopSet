"use client"

import { toPersianDigits } from "@/lib/utils"
import {
  type ManagerBooking,
  type FinanceSummary,
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
import { RefreshCw, Loader2, Wallet, Receipt } from "lucide-react"

interface VendorFinanceTabProps {
  bookings: ManagerBooking[]
  bookingsLoading: boolean
  financeSummary: FinanceSummary | null
  financeLoading: boolean
  settlementRequesting: boolean
  onRefresh: () => void
  onRequestSettlement: () => void
}

export function VendorFinanceTab({
  bookings,
  bookingsLoading,
  financeSummary,
  financeLoading,
  settlementRequesting,
  onRefresh,
  onRequestSettlement,
}: VendorFinanceTabProps) {
  return (
    <div className="space-y-4">
      {/* Finance toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div>
          <h2 className="text-base font-semibold">داشبورد مالی مجموعه</h2>
          <p className="text-sm text-muted-foreground">
            تسویه فقط برای رزروهای آنلاین تاییدشده‌ای فعال است که موعد سانس
            آن‌ها گذشته باشد.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
            وضعیت تسویه هر رزرو بر اساس پرداخت آنلاین، تایید رزرو، وضعیت تسویه و
            زمان پایان سانس نمایش داده می‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsLoading || financeLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-md" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <Receipt className="size-10 text-muted-foreground/40" />
              رزروی برای این مجموعه ثبت نشده است.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">مشتری</TableHead>
                    <TableHead className="text-right">تاریخ سانس</TableHead>
                    <TableHead className="text-right">روز</TableHead>
                    <TableHead className="text-right">ساعت</TableHead>
                    <TableHead className="text-right">مبلغ</TableHead>
                    <TableHead className="text-right">نوع رزرو</TableHead>
                    <TableHead className="text-right">وضعیت تسویه</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => {
                    const state = settlementStateForBooking(booking)
                    const sourceLabel =
                      booking.source === "manager_manual"
                        ? "دستی سالندار"
                        : "آنلاین"
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="min-w-40 font-medium">
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
                        <TableCell className="min-w-28">
                          {booking.slot_start_time
                            ? formatBookingDate(booking.slot_start_time)
                            : "-"}
                        </TableCell>
                        <TableCell className="min-w-24">
                          {booking.slot_start_time
                            ? formatBookingWeekday(booking.slot_start_time)
                            : "-"}
                        </TableCell>
                        <TableCell className="min-w-32">
                          {booking.slot_start_time && booking.slot_end_time
                            ? `${formatBookingTime(
                                booking.slot_start_time
                              )} - ${formatBookingTime(booking.slot_end_time)}`
                            : "-"}
                        </TableCell>
                        <TableCell className="min-w-28">
                          {formatMoney(booking.price_paid)}
                        </TableCell>
                        <TableCell className="min-w-28">
                          {sourceLabel}
                        </TableCell>
                        <TableCell className="min-w-40">
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
    </div>
  )
}
