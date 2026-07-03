"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
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
import { RefreshCw } from "lucide-react"

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
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`
}

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRefunds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ refunds: Refund[] }>("/api/v1/admin/refunds")
      setRefunds(res.refunds)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در دریافت عودت‌ها")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchRefunds(), 0)
    return () => clearTimeout(timer)
  }, [fetchRefunds])

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
          <h1 className="text-2xl font-bold tracking-tight">عودت‌های کاربران</h1>
          <p className="text-muted-foreground">
            عودت‌ها خودکار پرداخت نمی‌شوند و فقط وضعیت آن‌ها ثبت می‌شود.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRefunds}>
          <RefreshCw className="ml-1 size-4" />
          بروزرسانی
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">در حال بارگذاری...</p>
          ) : (
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
                {refunds.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>{r.user_name}</div>
                      <div className="text-xs text-muted-foreground">{r.user_phone}</div>
                    </TableCell>
                    <TableCell>{r.vendor_name}</TableCell>
                    <TableCell>{new Date(r.slot_start_time).toLocaleString("fa-IR")}</TableCell>
                    <TableCell>{money(r.total_paid)}</TableCell>
                    <TableCell>{money(r.penalty_amount)}</TableCell>
                    <TableCell>{money(r.refund_amount)}</TableCell>
                    <TableCell>{refundType[r.type] || r.type}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(refundStatus).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
