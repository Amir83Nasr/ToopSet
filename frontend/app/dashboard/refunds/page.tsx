"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { formatMoney } from "@/lib/i18n"
import { toPersianDigits } from "@/lib/utils"
import { usePaginationLimit } from "@/hooks/use-pagination-limit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DataTableToolbar,
  SearchInput,
} from "@/components/ui/data-table-toolbar"
import { TablePagination } from "@/components/ui/pagination"
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
import { RefreshCw, Undo2 } from "lucide-react"

interface UserRefund {
  id: number
  booking_id: number
  vendor_name: string
  slot_start_time: string
  total_paid: number
  penalty_amount: number
  refund_amount: number
  reason: string
  type: string
  status: "pending" | "approved" | "rejected" | "paid"
  destination_card_masked: string | null
  destination_card_holder_name: string | null
  requested_at: string
  approved_at: string | null
  paid_at: string | null
  payment_tracking_code: string | null
}

const statusConfig = {
  pending: { label: "در انتظار بررسی", variant: "outline" as const },
  approved: {
    label: "تأیید شده، در انتظار واریز",
    variant: "secondary" as const,
  },
  rejected: { label: "رد شده", variant: "destructive" as const },
  paid: { label: "واریز شده", variant: "default" as const },
}

function dateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString("fa-IR") : "-"
}

export default function UserRefundsPage() {
  const limit = usePaginationLimit()
  const [refunds, setRefunds] = useState<UserRefund[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchRefunds = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        skip: String(page * limit),
        limit: String(limit),
      })
      if (status !== "all") params.set("status", status)
      if (debouncedSearch) params.set("search", debouncedSearch)
      const result = await api<{ refunds: UserRefund[]; total: number }>(
        `/api/v1/refunds/my?${params}`
      )
      setRefunds(result.refunds)
      setTotal(result.total)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "خطا در دریافت بازگشت وجه‌ها"
      )
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, limit, page, status])

  useEffect(() => {
    const timer = setTimeout(fetchRefunds, 0)
    return () => clearTimeout(timer)
  }, [fetchRefunds])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            بازگشت وجه‌های من
          </h1>
          <p className="text-muted-foreground">
            وضعیت بررسی و واریز دستی مبالغ لغوشده را پیگیری کنید.
          </p>
        </div>
        <Button variant="outline" onClick={fetchRefunds} disabled={loading}>
          <RefreshCw className="me-1.5 size-4" />
          بروزرسانی
        </Button>
      </div>

      <DataTableToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جستجوی مجموعه..."
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>وضعیت بازگشت وجه</SelectLabel>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {Object.entries(statusConfig).map(([value, item]) => (
                <SelectItem key={value} value={value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </DataTableToolbar>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            در حال دریافت اطلاعات...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : refunds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Undo2 className="size-10" />
            بازگشت وجهی برای شما ثبت نشده است.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {refunds.map((refund) => {
              const state = statusConfig[refund.status]
              return (
                <Card key={refund.id}>
                  <CardContent className="space-y-3 p-4 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{refund.vendor_name}</span>
                      <Badge variant={state.variant}>{state.label}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t pt-3">
                      <span className="text-muted-foreground">
                        مبلغ پرداختی
                      </span>
                      <span>{formatMoney(refund.total_paid)}</span>
                      <span className="text-muted-foreground">جریمه</span>
                      <span>{formatMoney(refund.penalty_amount)}</span>
                      <span className="text-muted-foreground">
                        مبلغ بازگشتی
                      </span>
                      <span className="font-medium">
                        {formatMoney(refund.refund_amount)}
                      </span>
                      <span className="text-muted-foreground">کارت مقصد</span>
                      <span dir="ltr">
                        {refund.destination_card_masked
                          ? toPersianDigits(refund.destination_card_masked)
                          : "ثبت نشده"}
                      </span>
                      <span className="text-muted-foreground">تاریخ واریز</span>
                      <span>{dateTime(refund.paid_at)}</span>
                      <span className="text-muted-foreground">کد رهگیری</span>
                      <span>{refund.payment_tracking_code || "-"}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Table tableWrapperClassName="hidden md:block">
            <TableHeader>
              <TableRow>
                <TableHead>مجموعه / سانس</TableHead>
                <TableHead>پرداختی</TableHead>
                <TableHead>جریمه</TableHead>
                <TableHead>بازگشتی</TableHead>
                <TableHead>کارت مقصد</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>واریز / رهگیری</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.map((refund) => {
                const state = statusConfig[refund.status]
                return (
                  <TableRow key={refund.id}>
                    <TableCell>
                      <div className="font-medium">{refund.vendor_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {dateTime(refund.slot_start_time)} · رزرو{" "}
                        {toPersianDigits(refund.booking_id)}
                      </div>
                    </TableCell>
                    <TableCell>{formatMoney(refund.total_paid)}</TableCell>
                    <TableCell>{formatMoney(refund.penalty_amount)}</TableCell>
                    <TableCell className="font-medium">
                      {formatMoney(refund.refund_amount)}
                    </TableCell>
                    <TableCell dir="ltr">
                      {refund.destination_card_masked
                        ? toPersianDigits(refund.destination_card_masked)
                        : "ثبت نشده"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={state.variant}>{state.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>{dateTime(refund.paid_at)}</div>
                      <div className="text-xs text-muted-foreground">
                        {refund.payment_tracking_code
                          ? `پیگیری: ${toPersianDigits(refund.payment_tracking_code)}`
                          : "بدون کد رهگیری"}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            totalPages={Math.ceil(total / limit)}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
