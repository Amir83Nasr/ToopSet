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
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`
}

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSettlements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ settlements: Settlement[] }>("/api/v1/admin/settlements")
      setSettlements(res.settlements)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در دریافت تسویه‌ها")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSettlements(), 0)
    return () => clearTimeout(timer)
  }, [fetchSettlements])

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
          <h1 className="text-2xl font-bold tracking-tight">درخواست‌های تسویه</h1>
          <p className="text-muted-foreground">
            رزروهای داخل درخواست بعد از ثبت، دوباره وارد درخواست دیگر نمی‌شوند.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSettlements}>
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
                  <TableHead>سالندار</TableHead>
                  <TableHead>مجموعه</TableHead>
                  <TableHead>مبلغ درخواست</TableHead>
                  <TableHead>رزروها</TableHead>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>وضعیت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.manager_name}</TableCell>
                    <TableCell>{s.vendor_name}</TableCell>
                    <TableCell>{money(s.requested_amount)}</TableCell>
                    <TableCell>{s.bookings_count}</TableCell>
                    <TableCell>{new Date(s.requested_at).toLocaleDateString("fa-IR")}</TableCell>
                    <TableCell>
                      <Select value={s.status} onValueChange={(v) => updateStatus(s.id, v)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
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
