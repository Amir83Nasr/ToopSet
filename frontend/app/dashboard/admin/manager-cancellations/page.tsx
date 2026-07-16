"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { toPersianDigits } from "@/lib/utils"
import {
  translateSmsStatus,
  translateNotificationStatus,
  formatMoney,
} from "@/lib/i18n"
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

interface ManagerCancellation {
  id: number
  vendor_name: string
  manager_name: string
  affected_full_name: string | null
  affected_phone: string | null
  reason: string | null
  online_paid_amount: number | null
  site_cost_amount: number
  sms_status: string | null
  notification_status: string | null
  release_slot: boolean
  created_at: string
}

function money(value: number | null) {
  return formatMoney(value)
}

export default function AdminManagerCancellationsPage() {
  const [rows, setRows] = useState<ManagerCancellation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [releaseSlotFilter, setReleaseSlotFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState(todayStr())

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const filteredRows = useMemo(() => {
    let result = rows
    if (releaseSlotFilter !== "all") {
      result = result.filter(
        (r) => String(r.release_slot) === releaseSlotFilter
      )
    }
    if (debouncedSearch) {
      const q = debouncedSearch.trim().toLowerCase()
      result = result.filter(
        (r) =>
          r.vendor_name?.toLowerCase().includes(q) ||
          r.manager_name?.toLowerCase().includes(q) ||
          r.affected_full_name?.toLowerCase().includes(q) ||
          r.affected_phone?.toLowerCase().includes(q)
      )
    }
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00")
      result = result.filter((r) => new Date(r.created_at) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59")
      result = result.filter((r) => new Date(r.created_at) <= to)
    }
    return result
  }, [rows, debouncedSearch, releaseSlotFilter, dateFrom, dateTo])

  const hasActiveFilter =
    releaseSlotFilter !== "all" || dateFrom !== "" || debouncedSearch !== ""

  function clearFilters() {
    setReleaseSlotFilter("all")
    setDateFrom("")
    setDateTo(todayStr())
    setSearch("")
  }

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<ManagerCancellation[]>(
        "/api/v1/admin/manager-cancellations"
      )
      setRows(res)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در دریافت لغوها")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchRows(), 0)
    return () => clearTimeout(timer)
  }, [fetchRows])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">لغوهای سالندار</h1>
          <p className="text-muted-foreground">
            این لیست از عودت‌های معمولی کاربر جداست و وضعیت پیامک/اعلان را نشان
            می‌دهد.
          </p>
        </div>
        <Button variant="outline" onClick={fetchRows}>
          <RefreshCw className="me-1 size-4" />
          بروزرسانی
        </Button>
      </div>

      {/* Search & filter bar */}
      <DataTableToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جستجوی مجموعه، سالندار یا کاربر..."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={releaseSlotFilter}
            onValueChange={(val) => setReleaseSlotFilter(val)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="وضعیت سانس" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>وضعیت سانس</SelectLabel>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="true">آزاد شده</SelectItem>
                <SelectItem value="false">بلاک شده</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
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
                <TableHead>مجموعه</TableHead>
                <TableHead>سالندار</TableHead>
                <TableHead>کاربر/تماس</TableHead>
                <TableHead>مبلغ آنلاین</TableHead>
                <TableHead>هزینه سایت</TableHead>
                <TableHead>پیامک</TableHead>
                <TableHead>اعلان</TableHead>
                <TableHead>وضعیت سانس</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.vendor_name}</TableCell>
                  <TableCell>{r.manager_name}</TableCell>
                  <TableCell>
                    <div>{r.affected_full_name || "-"}</div>
                    <div className="text-xs text-muted-foreground">
                      {toPersianDigits(r.affected_phone || "-")}
                    </div>
                  </TableCell>
                  <TableCell>{money(r.online_paid_amount)}</TableCell>
                  <TableCell>{money(r.site_cost_amount)}</TableCell>
                  <TableCell>{translateSmsStatus(r.sms_status)}</TableCell>
                  <TableCell>
                    {translateNotificationStatus(r.notification_status)}
                  </TableCell>
                  <TableCell>
                    {r.release_slot ? "آزاد شده" : "بلاک شده"}
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
