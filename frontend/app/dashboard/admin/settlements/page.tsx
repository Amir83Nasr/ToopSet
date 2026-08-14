"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { toPersianDigits, formatPersianDate } from "@/lib/utils"
import { formatMoney } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { RefreshCw, X } from "lucide-react"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { toLocalDateStr, todayStr } from "@/lib/utils"

interface Settlement {
  id: number
  manager_name: string
  vendor_name: string
  requested_amount: number
  approved_amount: number | null
  gross_amount: number
  commission_percent: number
  commission_amount: number
  gateway_fee: number
  bookings_count: number
  status: string
  requested_at: string
  payment_tracking_code: string | null
  destination_card_masked: string | null
  destination_card_holder_name: string | null
}

interface SettlementDetail extends Settlement {
  items: Array<{
    booking_id: number
    amount: number
    booking_status: string
    settlement_status: string
    slot_start_time: string
    slot_end_time: string
    customer_name: string
  }>
}

const statusLabels: Record<string, string> = {
  pending: "در انتظار",
  approved: "تأیید شده",
  rejected: "رد شده",
  paid: "پرداخت شده",
}

function money(value: number) {
  return formatMoney(value)
}

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState(todayStr())
  const [detail, setDetail] = useState<SettlementDetail | null>(null)
  const [revealedCard, setRevealedCard] = useState<string | null>(null)
  const [paymentDialogSettlement, setPaymentDialogSettlement] =
    useState<Settlement | null>(null)
  const [paymentTrackingCode, setPaymentTrackingCode] = useState("")
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const filteredSettlements = useMemo(() => {
    let result = settlements
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter)
    }
    if (debouncedSearch) {
      const q = debouncedSearch.trim().toLowerCase()
      result = result.filter(
        (s) =>
          s.manager_name?.toLowerCase().includes(q) ||
          s.vendor_name?.toLowerCase().includes(q)
      )
    }
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00")
      result = result.filter((s) => new Date(s.requested_at) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59")
      result = result.filter((s) => new Date(s.requested_at) <= to)
    }
    return result
  }, [settlements, debouncedSearch, statusFilter, dateFrom, dateTo])

  const fetchSettlements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ settlements: Settlement[] }>(
        "/api/v1/admin/settlements"
      )
      setSettlements(res.settlements)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "خطا در دریافت تسویه‌ها"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSettlements(), 0)
    return () => clearTimeout(timer)
  }, [fetchSettlements])

  const hasActiveFilter =
    statusFilter !== "all" || dateFrom !== "" || debouncedSearch !== ""

  function clearFilters() {
    setStatusFilter("all")
    setDateFrom("")
    setDateTo(todayStr())
    setSearch("")
  }

  async function updateStatus(
    id: number,
    status: string,
    trackingCode?: string
  ) {
    try {
      await api(`/api/v1/admin/settlements/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          payment_tracking_code: trackingCode,
        }),
      })
      toast.success("وضعیت تسویه تغییر کرد")
      fetchSettlements()
      return true
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در تغییر وضعیت")
      return false
    }
  }

  function openPaymentDialog(settlement: Settlement) {
    setPaymentDialogSettlement(settlement)
    setPaymentTrackingCode(settlement.payment_tracking_code || "")
  }

  async function submitPaymentDialog() {
    if (!paymentDialogSettlement) return
    const trackingCode = paymentTrackingCode.trim()
    if (!trackingCode) {
      toast.error("ثبت کد رهگیری برای پرداخت الزامی است")
      return
    }
    setPaymentSubmitting(true)
    try {
      const updated = await updateStatus(
        paymentDialogSettlement.id,
        "paid",
        trackingCode
      )
      if (updated) {
        setPaymentDialogSettlement(null)
        setPaymentTrackingCode("")
      }
    } finally {
      setPaymentSubmitting(false)
    }
  }

  async function fetchDetail(id: number) {
    try {
      setRevealedCard(null)
      setDetail(await api<SettlementDetail>(`/api/v1/admin/settlements/${id}`))
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "خطا در دریافت جزئیات"
      )
    }
  }

  async function revealDestination(id: number) {
    try {
      const result = await api<{ card_number: string }>(
        `/api/v1/admin/settlements/${id}/destination`
      )
      setRevealedCard(result.card_number)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "خطا در دریافت کارت مقصد"
      )
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            درخواست‌های تسویه
          </h1>
          <p className="text-muted-foreground">
            هر درخواست فقط به‌صورت کامل تسویه می‌شود.
          </p>
        </div>
        <Button variant="outline" onClick={fetchSettlements}>
          <RefreshCw className="me-1 size-4" />
          بروزرسانی
        </Button>
      </div>

      {/* Search & filter bar */}
      <DataTableToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جستجوی سالندار یا مجموعه..."
        />
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val)}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>وضعیت تسویه</SelectLabel>
                  <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DateRangePicker
            value={{
              from: dateFrom ? new Date(dateFrom + "T12:00:00") : undefined,
              to: dateTo ? new Date(dateTo + "T12:00:00") : undefined,
            }}
            onChange={(range) => {
              setDateFrom(range?.from ? toLocalDateStr(range.from) : "")
              setDateTo(range?.to ? toLocalDateStr(range.to) : todayStr())
            }}
            className="w-fit"
          />
          {hasActiveFilter && (
            <Button variant="outline" onClick={clearFilters}>
              <X className="me-1.5 size-4" />
              حذف فیلتر
            </Button>
          )}
        </div>
      </DataTableToolbar>

      {loading ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <Table className="min-w-330 table-fixed">
            <colgroup>
              <col className="w-40" />
              <col className="w-48" />
              <col className="w-32" />
              <col className="w-32" />
              <col className="w-36" />
              <col className="w-20" />
              <col className="w-32" />
              <col className="w-28" />
              <col className="w-52" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>سالندار</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead className="text-center">مبلغ درخواست</TableHead>
                <TableHead className="text-center">مبلغ ناخالص</TableHead>
                <TableHead className="text-center">کمیسیون</TableHead>
                <TableHead className="text-center">رزروها</TableHead>
                <TableHead className="text-center">تاریخ</TableHead>
                <TableHead className="text-center">وضعیت</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSettlements.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.manager_name}</TableCell>
                  <TableCell>{s.vendor_name}</TableCell>
                  <TableCell className="text-center">
                    {money(s.requested_amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {money(s.gross_amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {money(s.commission_amount)} (
                    {toPersianDigits(s.commission_percent)}٪)
                  </TableCell>
                  <TableCell className="text-center">
                    {toPersianDigits(s.bookings_count)}
                  </TableCell>
                  <TableCell className="text-center text-xs whitespace-nowrap">
                    <div>{formatPersianDate(s.requested_at)}</div>
                    <div className="text-muted-foreground mt-0.5">
                      <span dir="ltr" className="inline-block">
                        {new Date(s.requested_at).toLocaleTimeString("fa-IR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Tehran",
                        })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-muted-foreground">
                      {statusLabels[s.status] ?? s.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2"
                        onClick={() => fetchDetail(s.id)}
                      >
                        جزئیات
                      </Button>
                      {s.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="px-2"
                            onClick={() => updateStatus(s.id, "approved")}
                          >
                            تأیید
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="px-2"
                            onClick={() => updateStatus(s.id, "rejected")}
                          >
                            رد
                          </Button>
                        </>
                      )}
                      {s.status === "approved" && (
                        <Button
                          size="sm"
                          className="px-2"
                          onClick={() => openPaymentDialog(s)}
                        >
                          پرداخت
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {detail && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                جزئیات تسویه {toPersianDigits(detail.id)}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetail(null)}
              >
                بستن
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              مقصد: {detail.destination_card_masked || "ثبت نشده"} —{" "}
              {detail.destination_card_holder_name || "بدون نام"}
            </p>
            <p className="text-sm text-muted-foreground">
              کد رهگیری:{" "}
              {detail.payment_tracking_code
                ? toPersianDigits(detail.payment_tracking_code)
                : "ثبت نشده"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => revealDestination(detail.id)}
              >
                نمایش شماره کامل کارت
              </Button>
              {revealedCard && <span dir="ltr">{revealedCard}</span>}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رزرو</TableHead>
                    <TableHead>مشتری</TableHead>
                    <TableHead>زمان سانس</TableHead>
                    <TableHead>مبلغ خالص</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.items.map((item) => (
                    <TableRow key={item.booking_id}>
                      <TableCell>{toPersianDigits(item.booking_id)}</TableCell>
                      <TableCell>{item.customer_name}</TableCell>
                      <TableCell className="text-center text-xs whitespace-nowrap">
                        <div>{formatPersianDate(item.slot_start_time)}</div>
                        <div className="text-muted-foreground mt-0.5">
                          <span dir="ltr" className="inline-block">
                            {new Date(item.slot_start_time).toLocaleTimeString("fa-IR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "Asia/Tehran",
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{money(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <ResponsiveDialog
        open={paymentDialogSettlement !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentDialogSettlement(null)
            setPaymentTrackingCode("")
          }
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>ثبت پرداخت تسویه</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              برای نهایی‌کردن تسویه، کد رهگیری پرداخت را ثبت کنید.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {paymentDialogSettlement && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>تسویه</span>
                  <span>{toPersianDigits(paymentDialogSettlement.id)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>مبلغ</span>
                  <span>{money(paymentDialogSettlement.requested_amount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>مجموعه</span>
                  <span>{paymentDialogSettlement.vendor_name}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="payment-tracking-code"
                  className="text-sm font-medium"
                >
                  کد رهگیری
                </label>
                <Input
                  id="payment-tracking-code"
                  value={paymentTrackingCode}
                  onChange={(event) =>
                    setPaymentTrackingCode(event.target.value)
                  }
                  placeholder="مثلا TRACK-123456"
                  dir="ltr"
                />
              </div>
            </div>
          )}
          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentDialogSettlement(null)
                setPaymentTrackingCode("")
              }}
              disabled={paymentSubmitting}
            >
              انصراف
            </Button>
            <Button onClick={submitPaymentDialog} disabled={paymentSubmitting}>
              ثبت پرداخت
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
