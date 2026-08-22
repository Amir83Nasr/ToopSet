"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { formatMoney } from "@/lib/i18n"
import { toPersianDigits } from "@/lib/utils"
import { usePaginationLimit } from "@/hooks/use-pagination-limit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Building2, Calendar, CreditCard, Undo2, Hash } from "lucide-react"
import { MobileBackButton } from "@/components/dashboard/mobile-back-button"

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

function RefundsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-4 shadow-xs ring-1 ring-foreground/10"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 border-b pb-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4.5 w-36" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
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
        <MobileBackButton />
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
        <RefundsSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-6 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchRefunds}>
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      ) : refunds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Undo2 className="size-8 text-muted-foreground" />
            </div>
            <p className="font-medium">بازگشت وجهی یافت نشد</p>
            <p className="mt-1 text-sm text-muted-foreground">
              در صورت لغو سانس‌هایی که شامل عودت وجه باشند، رکوردها اینجا نمایش
              داده می‌شوند.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {refunds.map((refund) => {
              const state = statusConfig[refund.status]
              return (
                <div
                  key={refund.id}
                  className="flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10 transition-all hover:shadow-md"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b bg-muted/30 p-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 shrink-0 text-primary" />
                          <h3
                            className="truncate text-base font-semibold text-foreground"
                            title={refund.vendor_name}
                          >
                            {refund.vendor_name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                          <Hash className="size-3 shrink-0" />
                          <span>رزرو {toPersianDigits(refund.booking_id)}</span>
                        </div>
                      </div>
                      <Badge variant={state.variant}>{state.label}</Badge>
                    </div>

                    {/* Content */}
                    <div className="space-y-3.5 p-4 text-sm">
                      {/* Slot time */}
                      <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
                        <Calendar className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          زمان سانس:
                        </span>
                        <span className="font-medium text-foreground">
                          {dateTime(refund.slot_start_time)}
                        </span>
                      </div>

                      {/* Amounts summary */}
                      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-center text-xs">
                        <div>
                          <div className="text-[11px] text-muted-foreground">
                            پرداختی
                          </div>
                          <div className="mt-0.5 font-medium text-foreground">
                            {formatMoney(refund.total_paid)}
                          </div>
                        </div>
                        <div className="border-x border-border/60">
                          <div className="text-[11px] text-muted-foreground">
                            جریمه
                          </div>
                          <div className="mt-0.5 font-medium text-destructive">
                            {formatMoney(refund.penalty_amount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-muted-foreground">
                            بازگشتی
                          </div>
                          <div className="mt-0.5 font-bold text-foreground">
                            {formatMoney(refund.refund_amount)}
                          </div>
                        </div>
                      </div>

                      {/* Bank & tracking details */}
                      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CreditCard className="size-3.5" />
                            کارت مقصد:
                          </span>
                          <span dir="ltr" className="font-mono text-foreground">
                            {refund.destination_card_masked
                              ? toPersianDigits(refund.destination_card_masked)
                              : "ثبت نشده"}
                          </span>
                        </div>

                        {refund.paid_at && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>تاریخ واریز:</span>
                            <span className="text-foreground">
                              {dateTime(refund.paid_at)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>کد پیگیری:</span>
                          <span dir="ltr" className="font-mono text-foreground">
                            {refund.payment_tracking_code
                              ? toPersianDigits(refund.payment_tracking_code)
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <TablePagination
            page={page}
            totalPages={Math.ceil(total / limit)}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
