"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/lib/toast"
import { CreditCard, ShieldX, RefreshCw } from "lucide-react"

interface AdminPayment {
  id: number
  booking_id: number
  amount: number
  status: "success" | "pending" | "failed"
  gateway_name: string | null
  user_name: string
  court_name: string
  created_at: string
}

interface PaymentListResponse {
  payments: AdminPayment[]
  total: number
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatAmount(amount: number): string {
  return `${toPersianDigits(new Intl.NumberFormat("fa-IR").format(amount))} تومان`
}

export default function AdminPaymentsPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<PaymentListResponse>("/api/v1/payments/all")
      setPayments(res.payments)
    } catch {
      toast.error("خطا در دریافت اطلاعات پرداخت‌ها")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPayments()
  }, [fetchPayments])

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            مدیریت پرداخت‌ها
          </h1>
          <p className="text-muted-foreground">مشاهده تمام تراکنش‌های سیستم</p>
        </div>
        <Button variant="outline" onClick={fetchPayments}>
          <RefreshCw className="ml-1.5 size-4" />
          رفرش
        </Button>
      </div>

      {loading ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="size-10 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">تراکنشی یافت نشد</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.created_at)}</TableCell>
                  <TableCell>{p.user_name}</TableCell>
                  <TableCell>{p.court_name}</TableCell>
                  <TableCell>{formatAmount(p.amount)}</TableCell>
                  <TableCell>
                    {p.status === "success" ? "موفق" : p.status}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
