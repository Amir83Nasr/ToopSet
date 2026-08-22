"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toPersianDigits, formatPrice, formatPersianDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"
import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import { TablePagination } from "@/components/ui/pagination"
import {
  CreditCard,
  AlertCircle,
  RefreshCw,
  Building2,
  Calendar,
  Hash,
} from "lucide-react"
import { MobileBackButton } from "@/components/dashboard/mobile-back-button"

// --- Types ---

interface PaymentDetail {
  id: number
  booking_id: number
  amount: number
  status: "success" | "pending" | "failed"
  gateway_transaction_id: string | null
  gateway_name: string | null
  card_number: string | null
  ref_id: string | null
  gateway_fee: number | null
  paid_at: string | null
  created_at: string
  vendor_name: string
  vendor_address: string
  slot_start_time: string | null
  slot_end_time: string | null
}

interface PaymentListResponse {
  payments: PaymentDetail[]
  total: number
}

// --- Helpers ---

function formatDate(iso: string): string {
  return formatPersianDate(iso)
}

function formatAmount(amount: number): string {
  return formatPrice(amount)
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  success: { label: "موفق", variant: "default" },
  pending: { label: "در انتظار", variant: "secondary" },
  failed: { label: "ناموفق", variant: "destructive" },
}

// --- Skeletons ---

function LoadingSkeleton() {
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
              <Skeleton className="h-5 w-16 rounded-full" />
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

// --- Page ---

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentDetail[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const limit = 20

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (debouncedSearch) params.set("search", debouncedSearch)
      const res = await api<PaymentListResponse>(
        `/api/v1/payments/my?${params}`
      )
      setPayments(res.payments)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, debouncedSearch])

  useEffect(() => {
    const timer = setTimeout(fetchPayments, 0)
    return () => clearTimeout(timer)
  }, [fetchPayments])

  const totalPages = Math.ceil(total / limit)

  function renderError() {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 rounded-full bg-destructive/10 p-3">
            <AlertCircle className="size-8 text-destructive" />
          </div>
          <p className="mb-4 font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchPayments}>
            <RefreshCw className="me-2 size-4" />
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    )
  }

  function renderEmpty() {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 rounded-full bg-muted p-4">
            <CreditCard className="size-8 text-muted-foreground" />
          </div>
          <p className="font-medium">هیچ پرداختی یافت نشد</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {debouncedSearch || statusFilter !== "all"
              ? "نتیجه‌ای برای فیلترهای انتخابی یافت نشد."
              : "هنوز پرداختی در سیستم ثبت نشده است."}
          </p>
        </CardContent>
      </Card>
    )
  }

  function renderCards() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {payments.map((p) => {
            const status = statusConfig[p.status] || {
              label: p.status,
              variant: "secondary" as const,
            }
            return (
              <div
                key={p.id}
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
                          title={p.vendor_name}
                        >
                          {p.vendor_name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <Hash className="size-3 shrink-0" />
                        <span>رزرو {toPersianDigits(p.booking_id)}</span>
                      </div>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  {/* Body */}
                  <div className="space-y-3.5 p-4 text-sm">
                    {/* Date and Amount */}
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                      <div className="flex items-start gap-2">
                        <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="text-[11px] text-muted-foreground">
                            تاریخ پرداخت
                          </div>
                          <div className="text-xs font-medium text-foreground">
                            {formatDate(p.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <CreditCard className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="text-[11px] text-muted-foreground">
                            مبلغ
                          </div>
                          <div className="text-xs font-bold text-foreground tabular-nums">
                            {formatAmount(p.amount)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gateway details */}
                    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>درگاه پرداخت:</span>
                        <span className="font-medium text-foreground">
                          {p.gateway_name || "-"}
                        </span>
                      </div>

                      {p.card_number && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>شماره کارت:</span>
                          <span dir="ltr" className="font-mono text-foreground">
                            {p.card_number}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>کد پیگیری:</span>
                        <span dir="ltr" className="font-mono text-foreground">
                          {p.gateway_transaction_id || "-"}
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
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    )
  }

  // --- Render ---

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">پرداخت‌ها</h1>
          <p className="text-muted-foreground">تاریخچه پرداخت‌های شما</p>
        </div>
        <MobileBackButton />
      </div>

      {/* Search & filter bar */}
      <DataTableToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جستجوی مجموعه..."
        />
        <div>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val)
              setPage(0)
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>وضعیت پرداخت</SelectLabel>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="success">موفق</SelectItem>
                <SelectItem value="pending">در انتظار</SelectItem>
                <SelectItem value="failed">ناموفق</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </DataTableToolbar>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        renderError()
      ) : payments.length === 0 ? (
        renderEmpty()
      ) : (
        renderCards()
      )}
    </div>
  )
}
