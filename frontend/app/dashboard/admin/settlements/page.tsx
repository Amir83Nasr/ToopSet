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

interface Settlement {
  id: number
  manager_name: string
  vendor_name: string
  requested_amount: number
  approved_amount: number | null
  bookings_count: number
  status: string
  requested_at: string
  payment_tracking_code: string | null
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

  async function updateStatus(id: number, status: string) {
    try {
      await api(`/api/v1/admin/settlements/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
      toast.success("وضعیت تسویه تغییر کرد")
      fetchSettlements()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در تغییر وضعیت")
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
            رزروهای داخل درخواست بعد از ثبت، دوباره وارد درخواست دیگر نمی‌شوند.
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>سالندار</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead>مبلغ درخواست</TableHead>
                <TableHead>رزروها</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSettlements.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.manager_name}</TableCell>
                  <TableCell>{s.vendor_name}</TableCell>
                  <TableCell>{money(s.requested_amount)}</TableCell>
                  <TableCell>{toPersianDigits(s.bookings_count)}</TableCell>
                  <TableCell>
                    {new Date(s.requested_at).toLocaleDateString("fa-IR")}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={s.status}
                      onValueChange={(v) => updateStatus(s.id, v)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>وضعیت تسویه</SelectLabel>
                          {Object.entries(statusLabels).map(
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
