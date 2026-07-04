"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toast } from "@/lib/toast"
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
import { RefreshCw } from "lucide-react"

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
  if (value === null) return "-"
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`
}

export default function AdminManagerCancellationsPage() {
  const [rows, setRows] = useState<ManagerCancellation[]>([])
  const [loading, setLoading] = useState(true)

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
        <Button variant="outline" size="sm" onClick={fetchRows}>
          <RefreshCw className="ml-1 size-4" />
          بروزرسانی
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">
              در حال بارگذاری...
            </p>
          ) : (
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
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.vendor_name}</TableCell>
                    <TableCell>{r.manager_name}</TableCell>
                    <TableCell>
                      <div>{r.affected_full_name || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.affected_phone || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{money(r.online_paid_amount)}</TableCell>
                    <TableCell>{money(r.site_cost_amount)}</TableCell>
                    <TableCell>{r.sms_status || "-"}</TableCell>
                    <TableCell>{r.notification_status || "-"}</TableCell>
                    <TableCell>
                      {r.release_slot ? "آزاد شده" : "بلاک شده"}
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
