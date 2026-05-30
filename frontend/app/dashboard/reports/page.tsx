"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { BarChart3 } from "lucide-react"
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker"

interface RevenueRow {
  date: string
  bookings_count: number
  revenue: number
  penalties: number
}

export default function ReportsPage() {
  const [rows, setRows] = useState<RevenueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString())
      if (dateTo) params.set("date_to", new Date(dateTo).toISOString())

      const res = await api<RevenueRow[]>(
        `/api/v1/dashboard/manager/revenue?${params}`
      )
      setRows(res)
    } catch {
      // not authenticated
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    const timer = setTimeout(() => fetchReport(), 0)
    return () => clearTimeout(timer)
  }, [fetchReport])

  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0)
  const totalPenalties = rows.reduce((sum, r) => sum + r.penalties, 0)
  const totalBookings = rows.reduce((sum, r) => sum + r.bookings_count, 0)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">گزارشات درآمد</h1>
          <p className="text-muted-foreground">
            گزارش روزانه رزروها و درآمد زمین‌های شما
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              مجموع رزروها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {toPersianDigits(totalBookings)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              مجموع درآمد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {toPersianDigits(
                Math.round(totalRevenue).toLocaleString("fa-IR")
              )}{" "}
              تومان
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              مجموع جریمه‌ها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {toPersianDigits(
                Math.round(totalPenalties).toLocaleString("fa-IR")
              )}{" "}
              تومان
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date filters */}
      <div className="flex gap-4">
        <div className="space-y-1">
          <Label>از تاریخ</Label>
          <JalaliDatePicker
            value={dateFrom ? new Date(dateFrom + "T12:00:00") : undefined}
            onChange={(d) =>
              setDateFrom(d ? d.toISOString().split("T")[0] : "")
            }
          />
        </div>
        <div className="space-y-1">
          <Label>تا تاریخ</Label>
          <JalaliDatePicker
            value={dateTo ? new Date(dateTo + "T12:00:00") : undefined}
            onChange={(d) =>
              setDateTo(d ? d.toISOString().split("T")[0] : "")
            }
          />
        </div>
      </div>

      {/* Report table */}
      {loading ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ</TableHead>
                <TableHead>تعداد رزرو</TableHead>
                <TableHead>درآمد</TableHead>
                <TableHead>جریمه</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-muted p-4">
              <BarChart3 className="size-10 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">
              داده‌ای برای نمایش وجود ندارد
            </h3>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              پس از ثبت رزروها و انجام تراکنش‌ها، گزارشات در اینجا نمایش داده
              می‌شوند.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ</TableHead>
                <TableHead>تعداد رزرو</TableHead>
                <TableHead>درآمد</TableHead>
                <TableHead>جریمه</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.date}>
                  <TableCell>
                    {toPersianDigits(
                      new Date(row.date).toLocaleDateString("fa-IR")
                    )}
                  </TableCell>
                  <TableCell>{toPersianDigits(row.bookings_count)}</TableCell>
                  <TableCell className="font-medium text-green-600">
                    {toPersianDigits(
                      Math.round(row.revenue).toLocaleString("fa-IR")
                    )}{" "}
                    تومان
                  </TableCell>
                  <TableCell className="font-medium text-red-600">
                    {toPersianDigits(
                      Math.round(row.penalties).toLocaleString("fa-IR")
                    )}{" "}
                    تومان
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
