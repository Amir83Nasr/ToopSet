"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { TablePagination } from "@/components/ui/pagination"
import { CreditCard, AlertCircle, RefreshCw } from "lucide-react"
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

// --- Skeleton rows ---

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
    </TableRow>
  )
}

function LoadingSkeleton() {
  return (
    <div>
      <Table className="min-w-215 table-fixed">
        <colgroup>
          <col className="w-28" />
          <col className="w-52" />
          <col className="w-28" />
          <col className="w-24" />
          <col className="w-44" />
          <col className="w-36" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">تاریخ</TableHead>
            <TableHead>مجموعه</TableHead>
            <TableHead className="text-center">مبلغ</TableHead>
            <TableHead className="text-center">وضعیت</TableHead>
            <TableHead className="text-center">درگاه</TableHead>
            <TableHead className="text-center">کد پیگیری</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </TableBody>
      </Table>
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
    const timer = setTimeout(() => {
      fetchPayments()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchPayments])

  const totalPages = Math.ceil(total / limit)

  // --- Render helpers ---

  function renderLoading() {
    return <LoadingSkeleton />
  }

  function renderError() {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <AlertCircle className="size-12 text-destructive" />
          <p className="text-lg text-muted-foreground">خطا در دریافت اطلاعات</p>
          <p className="text-sm text-muted-foreground/60">{error}</p>
          <Button variant="outline" onClick={fetchPayments}>
            <RefreshCw className="me-1.5 size-4" />
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
            <CreditCard className="size-10 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">
            هنوز پرداختی انجام نداده‌اید
          </h3>
          <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
            پس از رزرو مجموعه و تکمیل فرآیند رزرو، تاریخچه پرداخت‌های شما در این
            بخش نمایش داده می‌شود.
          </p>
          <Button asChild>
            <Link href="/dashboard/vendors">
              <CreditCard className="me-2 size-4" />
              رزرو مجموعه
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  function renderTable() {
    return (
      <div>
        {/* Mobile: stacked cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {payments.map((p) => {
            const status = statusConfig[p.status] || {
              label: p.status,
              variant: "secondary" as const,
            }
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{p.vendor_name}</span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-semibold">
                    {formatAmount(p.amount)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(p.created_at)}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs text-muted-foreground">درگاه</dt>
                    <dd className="text-muted-foreground">
                      {p.gateway_name ? (
                        <span className="flex flex-col">
                          <span className="text-foreground">
                            {p.gateway_name}
                          </span>
                          {p.card_number && (
                            <span className="font-mono text-xs" dir="ltr">
                              {p.card_number}
                            </span>
                          )}
                        </span>
                      ) : (
                        "-"
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs text-muted-foreground">کد پیگیری</dt>
                    <dd className="text-xs text-muted-foreground" dir="ltr">
                      {p.gateway_transaction_id || "-"}
                    </dd>
                  </div>
                </dl>
              </div>
            )
          })}
        </div>

        {/* Desktop / tablet: full table */}
        <Table
          className="min-w-215 table-fixed"
          tableWrapperClassName="hidden md:block"
        >
          <colgroup>
            <col className="w-28" />
            <col className="w-52" />
            <col className="w-28" />
            <col className="w-24" />
            <col className="w-44" />
            <col className="w-36" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">تاریخ</TableHead>
              <TableHead>مجموعه</TableHead>
              <TableHead className="text-center">مبلغ</TableHead>
              <TableHead className="text-center">وضعیت</TableHead>
              <TableHead className="text-center">درگاه</TableHead>
              <TableHead className="text-center">کد پیگیری</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => {
              const status = statusConfig[p.status] || {
                label: p.status,
                variant: "secondary" as const,
              }
              return (
                <TableRow key={p.id}>
                  <TableCell className="text-center text-xs whitespace-nowrap">
                    {formatDate(p.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">{p.vendor_name}</TableCell>
                  <TableCell className="text-center">
                    {formatAmount(p.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {p.gateway_name ? (
                      <span className="flex flex-col items-center">
                        <span>{p.gateway_name}</span>
                        {p.card_number && (
                          <span className="font-mono text-[10px]" dir="ltr">
                            {p.card_number}
                          </span>
                        )}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell
                    className="text-center text-xs text-muted-foreground"
                    dir="ltr"
                  >
                    {p.gateway_transaction_id || "-"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

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

      {loading
        ? renderLoading()
        : error
          ? renderError()
          : payments.length === 0
            ? renderEmpty()
            : renderTable()}
    </div>
  )
}
