"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CreditCard,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react"

// --- Types ---

interface PaymentDetail {
  id: number
  booking_id: number
  amount: number
  status: "success" | "pending" | "failed"
  gateway_transaction_id: string | null
  created_at: string
  court_name: string
  court_address: string
  slot_start_time: string | null
  slot_end_time: string | null
}

interface PaymentListResponse {
  payments: PaymentDetail[]
  total: number
}

// --- Helpers ---

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatAmount(amount: number): string {
  return `${toPersianDigits(new Intl.NumberFormat("fa-IR").format(amount))} تومان`
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
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    </TableRow>
  )
}

function LoadingSkeleton() {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>تاریخ</TableHead>
            <TableHead>زمین</TableHead>
            <TableHead>مبلغ</TableHead>
            <TableHead>وضعیت</TableHead>
            <TableHead>کد پیگیری</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

// --- Page ---

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentDetail[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const limit = 20

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api<PaymentListResponse>(
        `/api/v1/payments/my?skip=${page * limit}&limit=${limit}`,
      )
      setPayments(res.payments)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const totalPages = Math.ceil(total / limit)

  // --- Render helpers ---

  function renderLoading() {
    return <LoadingSkeleton />
  }

  function renderError() {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle className="size-12 text-destructive" />
          <p className="text-lg text-muted-foreground">خطا در دریافت اطلاعات</p>
          <p className="text-sm text-muted-foreground/60">{error}</p>
          <Button variant="outline" onClick={fetchPayments}>
            <RefreshCw className="ml-2 size-4" />
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
          <div className="rounded-full bg-muted p-4 mb-4">
            <CreditCard className="size-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">هنوز پرداختی انجام نداده‌اید</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
            پس از رزرو زمین و تکمیل فرآیند رزرو، تاریخچه پرداخت‌های شما در این بخش نمایش داده می‌شود.
          </p>
          <Button asChild>
            <Link href="/dashboard/courts">
              <CreditCard className="ml-2 size-4" />
              رزرو زمین
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  function renderTable() {
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>تاریخ</TableHead>
              <TableHead>زمین</TableHead>
              <TableHead>مبلغ</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>کد پیگیری</TableHead>
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
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDate(p.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">{p.court_name}</TableCell>
                  <TableCell>{formatAmount(p.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.gateway_transaction_id
                      ? toPersianDigits(p.gateway_transaction_id)
                      : "-"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              صفحه {toPersianDigits(page + 1)} از {toPersianDigits(totalPages)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronRight className="ml-1 size-4" />
                قبلی
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
                <ChevronLeft className="mr-1 size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    )
  }

  // --- Render ---

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">پرداخت‌ها</h1>
        <p className="text-muted-foreground">تاریخچه پرداخت‌های شما</p>
      </div>

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
