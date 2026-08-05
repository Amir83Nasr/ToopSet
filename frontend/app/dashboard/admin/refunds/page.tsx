"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { toPersianDigits } from "@/lib/utils"
import { formatMoney } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
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
import { Check, Eye, RefreshCw, Send, X, XCircle } from "lucide-react"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { toLocalDateStr, todayStr } from "@/lib/utils"

interface Refund {
  id: number
  booking_id: number
  user_name: string
  user_phone: string
  vendor_name: string
  slot_start_time: string
  total_paid: number
  penalty_amount: number
  refund_amount: number
  reason: string
  type: string
  status: string
  requested_at: string
  approved_at: string | null
  paid_at: string | null
  admin_note: string | null
  payment_tracking_code: string | null
  destination_card_masked: string | null
  destination_card_holder_name: string | null
}

interface RefundDestination {
  refund_id: number
  card_number: string
  masked_card_number: string
  holder_name: string | null
}

const refundStatus: Record<string, string> = {
  pending: "در انتظار",
  approved: "تأیید شده",
  rejected: "رد شده",
  paid: "پرداخت شده",
}

const refundType: Record<string, string> = {
  user_cancellation: "لغو توسط کاربر",
  manager_cancellation: "لغو توسط سالندار",
  replaced_after_pending_cancellation: "جایگزینی در انتظار لغو",
}

function money(value: number) {
  return formatMoney(value)
}

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState(todayStr())
  const [action, setAction] = useState<{
    refund: Refund
    status: "approved" | "rejected" | "paid"
  } | null>(null)
  const [adminNote, setAdminNote] = useState("")
  const [trackingCode, setTrackingCode] = useState("")
  const [destination, setDestination] = useState<RefundDestination | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [revealing, setRevealing] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const filteredRefunds = useMemo(() => {
    let result = refunds
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter)
    }
    if (debouncedSearch) {
      const q = debouncedSearch.trim().toLowerCase()
      result = result.filter(
        (r) =>
          r.user_name?.toLowerCase().includes(q) ||
          r.vendor_name?.toLowerCase().includes(q) ||
          r.user_phone?.toLowerCase().includes(q)
      )
    }
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00")
      result = result.filter((r) => new Date(r.requested_at) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59")
      result = result.filter((r) => new Date(r.requested_at) <= to)
    }
    return result
  }, [refunds, debouncedSearch, statusFilter, dateFrom, dateTo])

  const fetchRefunds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ refunds: Refund[] }>("/api/v1/admin/refunds")
      setRefunds(res.refunds)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "خطا در دریافت عودت‌ها"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchRefunds(), 0)
    return () => clearTimeout(timer)
  }, [fetchRefunds])

  const hasActiveFilter =
    statusFilter !== "all" || dateFrom !== "" || debouncedSearch !== ""

  function clearFilters() {
    setStatusFilter("all")
    setDateFrom("")
    setDateTo(todayStr())
    setSearch("")
  }

  function openAction(
    refund: Refund,
    status: "approved" | "rejected" | "paid"
  ) {
    setAction({ refund, status })
    setAdminNote(refund.admin_note || "")
    setTrackingCode(refund.payment_tracking_code || "")
    setDestination(null)
  }

  function closeAction() {
    setAction(null)
    setAdminNote("")
    setTrackingCode("")
    setDestination(null)
  }

  async function revealDestination() {
    if (!action) return
    setRevealing(true)
    try {
      const result = await api<RefundDestination>(
        `/api/v1/admin/refunds/${action.refund.id}/destination`
      )
      setDestination(result)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "خطا در دریافت کارت مقصد"
      )
    } finally {
      setRevealing(false)
    }
  }

  async function submitAction() {
    if (!action) return
    if (action.status === "paid" && !trackingCode.trim()) {
      toast.error("کد رهگیری واریز الزامی است")
      return
    }
    setSubmitting(true)
    try {
      await api(`/api/v1/admin/refunds/${action.refund.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: action.status,
          admin_note: adminNote.trim() || null,
          payment_tracking_code:
            action.status === "paid" ? trackingCode.trim() : null,
        }),
      })
      toast.success("وضعیت عودت تغییر کرد")
      closeAction()
      await fetchRefunds()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در تغییر وضعیت")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            عودت‌های کاربران
          </h1>
          <p className="text-muted-foreground">
            عودت‌ها خودکار پرداخت نمی‌شوند و فقط وضعیت آن‌ها ثبت می‌شود.
          </p>
        </div>
        <Button variant="outline" onClick={fetchRefunds}>
          <RefreshCw className="me-1 size-4" />
          بروزرسانی
        </Button>
      </div>

      {/* Search & filter bar */}
      <DataTableToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جستجوی کاربر یا مجموعه..."
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
                  <SelectLabel>وضعیت عودت</SelectLabel>
                  <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                  {Object.entries(refundStatus).map(([value, label]) => (
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
          <Table className="min-w-400 table-fixed">
            <colgroup>
              <col className="w-48" />
              <col className="w-52" />
              <col className="w-44" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-48" />
              <col className="w-60" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>کاربر</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead className="text-center">سانس</TableHead>
                <TableHead className="text-center">پرداختی</TableHead>
                <TableHead className="text-center">جریمه</TableHead>
                <TableHead className="text-center">عودت</TableHead>
                <TableHead className="text-center">نوع</TableHead>
                <TableHead className="text-center">وضعیت</TableHead>
                <TableHead className="text-center">کارت مقصد</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRefunds.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-center">
                    <div>{r.user_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {toPersianDigits(r.user_phone)}
                    </div>
                  </TableCell>
                  <TableCell>{r.vendor_name}</TableCell>
                  <TableCell>
                    {new Date(r.slot_start_time).toLocaleString("fa-IR")}
                  </TableCell>
                  <TableCell className="text-center">
                    {money(r.total_paid)}
                  </TableCell>
                  <TableCell className="text-center">
                    {money(r.penalty_amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {money(r.refund_amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {refundType[r.type] || r.type}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        r.status === "paid"
                          ? "default"
                          : r.status === "rejected"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {refundStatus[r.status] || r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div dir="ltr" className="text-center text-xs">
                      {r.destination_card_masked
                        ? toPersianDigits(r.destination_card_masked)
                        : "ثبت نشده"}
                    </div>
                    {r.destination_card_holder_name && (
                      <div className="text-xs text-muted-foreground">
                        {r.destination_card_holder_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {r.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openAction(r, "approved")}
                          >
                            <Check className="me-1 size-3.5" />
                            تأیید
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openAction(r, "rejected")}
                          >
                            <XCircle className="me-1 size-3.5" />
                            رد
                          </Button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <Button size="sm" onClick={() => openAction(r, "paid")}>
                          <Send className="me-1 size-3.5" />
                          ثبت واریز
                        </Button>
                      )}
                      {r.status === "paid" && r.payment_tracking_code && (
                        <span className="text-xs text-muted-foreground">
                          پیگیری: {toPersianDigits(r.payment_tracking_code)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ResponsiveDialog
        open={!!action}
        mobileAsSheet={false}
        onOpenChange={(open) => {
          if (!open) closeAction()
        }}
      >
        <ResponsiveDialogContent
          className="sm:max-w-md"
          mobileMaxHeight="calc(100dvh - 2rem)"
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {action?.status === "approved"
                ? "تأیید بازگشت وجه"
                : action?.status === "rejected"
                  ? "رد بازگشت وجه"
                  : "ثبت واریز دستی"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              مبلغ {action ? money(action.refund.refund_amount) : ""} برای رزرو
              شماره {action ? toPersianDigits(action.refund.booking_id) : ""}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4">
            {action?.status === "paid" && (
              <div className="space-y-3 rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      کارت مقصد
                    </div>
                    <div dir="ltr" className="font-medium">
                      {destination
                        ? toPersianDigits(destination.card_number)
                        : action.refund.destination_card_masked
                          ? toPersianDigits(
                              action.refund.destination_card_masked
                            )
                          : "کارت ثبت نشده"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {destination?.holder_name ||
                        action.refund.destination_card_holder_name ||
                        "دارنده نامشخص"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={revealDestination}
                    disabled={
                      revealing || !action.refund.destination_card_masked
                    }
                  >
                    <Eye className="me-1 size-3.5" />
                    {revealing ? "در حال دریافت" : "نمایش کامل"}
                  </Button>
                </div>
                <Input
                  value={trackingCode}
                  onChange={(event) => setTrackingCode(event.target.value)}
                  placeholder="کد رهگیری واریز"
                  dir="ltr"
                />
              </div>
            )}

            <Textarea
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder={
                action?.status === "rejected"
                  ? "دلیل رد بازگشت وجه"
                  : "یادداشت ادمین (اختیاری)"
              }
            />
          </div>

          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              onClick={closeAction}
              disabled={submitting}
            >
              انصراف
            </Button>
            <Button
              onClick={submitAction}
              disabled={
                submitting ||
                (action?.status === "paid" &&
                  (!trackingCode.trim() ||
                    !action.refund.destination_card_masked))
              }
              variant={
                action?.status === "rejected" ? "destructive" : "default"
              }
            >
              {submitting ? "در حال ثبت..." : "ثبت نهایی"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
