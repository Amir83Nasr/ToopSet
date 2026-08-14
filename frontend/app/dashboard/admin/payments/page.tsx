"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toPersianDigits, formatPrice, formatPersianDate } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { usePaginationLimit } from "@/hooks/use-pagination-limit"
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
import { TablePagination } from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/lib/toast"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"
import { CreditCard, ShieldX, RefreshCw } from "lucide-react"
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_STYLES } from "@/lib/constants"

interface AdminPayment {
  id: number
  booking_id: number
  amount: number
  status: "success" | "pending" | "failed"
  gateway_name: string | null
  user_name: string
  vendor_name: string
  created_at: string
}

interface PaymentListResponse {
  payments: AdminPayment[]
  total: number
}

function formatDate(iso: string): string {
  return formatPersianDate(iso)
}

function formatAmount(amount: number): string {
  return formatPrice(amount)
}

export default function AdminPaymentsPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const limit = usePaginationLimit()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (debouncedSearch) params.set("search", debouncedSearch)
      const res = await api<PaymentListResponse>(
        `/api/v1/payments/all?${params}`
      )
      setPayments(res.payments)
      setTotal(res.total)
    } catch {
      toast.error("خطا در دریافت اطلاعات پرداخت‌ها")
    } finally {
      setLoading(false)
    }
  }, [page, limit, statusFilter, debouncedSearch])

  useEffect(() => {
    const timer = setTimeout(() => fetchPayments(), 0)
    return () => clearTimeout(timer)
  }, [fetchPayments])

  const totalPages = Math.ceil(total / limit)

  if (user && user.role !== "admin") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
        <ShieldX className="size-16" />
        <p className="text-xl">شما دسترسی به این بخش را ندارید</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            مدیریت پرداخت‌ها
          </h1>
          <p className="text-muted-foreground">مشاهده تمام تراکنش‌های سیستم</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPage(0)
            fetchPayments()
          }}
        >
          <RefreshCw className="me-1.5 size-4" />
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
        <div className="max-h-full min-h-0 overflow-auto">
          <Table
            className="min-w-220 table-fixed"
            tableWrapperClassName="overflow-visible rounded-none border-0"
          >
            <colgroup>
              <col className="w-28" />
              <col className="w-48" />
              <col className="w-56" />
              <col className="w-36" />
              <col className="w-28" />
            </colgroup>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="text-center">تاریخ</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead className="text-center">مبلغ</TableHead>
                <TableHead className="text-center">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="mx-auto h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="size-10 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">تراکنشی یافت نشد</p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <Table className="min-w-220 table-fixed">
            <colgroup>
              <col className="w-28" />
              <col className="w-48" />
              <col className="w-56" />
              <col className="w-36" />
              <col className="w-28" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">تاریخ</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead className="text-center">مبلغ</TableHead>
                <TableHead className="text-center">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-center">
                    {formatDate(p.created_at)}
                  </TableCell>
                  <TableCell className="truncate">{p.user_name}</TableCell>
                  <TableCell className="truncate">{p.vendor_name}</TableCell>
                  <TableCell className="text-center">
                    {formatAmount(p.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_STYLES[p.status] || ""}`}
                    >
                      {PAYMENT_STATUS_LABELS[p.status] || p.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
