"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { toPersianDigits } from "@/lib/utils"
import { formatMoney } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { RefreshCw, X } from "lucide-react"
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

  async function updateStatus(id: number, status: string) {
    try {
      await api(`/api/v1/admin/refunds/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
      toast.success("وضعیت عودت تغییر کرد")
      fetchRefunds()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در تغییر وضعیت")
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
          <RefreshCw className="ml-1 size-4" />
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
              <X className="ml-1.5 size-4" />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کاربر</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead>سانس</TableHead>
                <TableHead>پرداختی</TableHead>
                <TableHead>جریمه</TableHead>
                <TableHead>عودت</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRefunds.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div>{r.user_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {toPersianDigits(r.user_phone)}
                    </div>
                  </TableCell>
                  <TableCell>{r.vendor_name}</TableCell>
                  <TableCell>
                    {new Date(r.slot_start_time).toLocaleString("fa-IR")}
                  </TableCell>
                  <TableCell>{money(r.total_paid)}</TableCell>
                  <TableCell>{money(r.penalty_amount)}</TableCell>
                  <TableCell>{money(r.refund_amount)}</TableCell>
                  <TableCell>{refundType[r.type] || r.type}</TableCell>
                  <TableCell>
                    <Select
                      value={r.status}
                      onValueChange={(v) => updateStatus(r.id, v)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>وضعیت عودت</SelectLabel>
                          {Object.entries(refundStatus).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            )
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
