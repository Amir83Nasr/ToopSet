"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  TrendingUp,
  Users,
  Building2,
  CalendarCheck,
  DollarSign,
} from "lucide-react"

interface ChartData {
  user_growth: { date: string; count: number }[]
  court_growth: { date: string; count: number }[]
  booking_trends: { date: string; count: number }[]
  revenue_trends: { date: string; revenue: number; penalties: number }[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatPersianNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(num))
}

export default function ReportsPage() {
  const [data, setData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCharts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<ChartData>("/api/v1/dashboard/admin/charts")
      setData(res)
    } catch {
      // not authenticated
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchCharts(), 0)
    return () => clearTimeout(timer)
  }, [fetchCharts])

  const summary = data
    ? {
        totalUsers: data.user_growth.reduce((s, r) => s + r.count, 0),
        totalCourts: data.court_growth.reduce((s, r) => s + r.count, 0),
        totalBookings: data.booking_trends.reduce((s, r) => s + r.count, 0),
        totalRevenue: data.revenue_trends.reduce(
          (s, r) => s + r.revenue + r.penalties,
          0
        ),
      }
    : null

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">گزارشات سیستم</h1>
        <p className="text-muted-foreground">آمار و نمودارهای ۳۰ روز اخیر</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              کاربران جدید
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">
                {formatPersianNumber(summary?.totalUsers ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              مجموعه‌های جدید
            </CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">
                {formatPersianNumber(summary?.totalCourts ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              رزروها
            </CardTitle>
            <CalendarCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">
                {formatPersianNumber(summary?.totalBookings ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              گردش مالی
            </CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-green-600">
                {formatPersianNumber(summary?.totalRevenue ?? 0)}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  تومان
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts 2x2 grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Chart 1: User Growth */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-blue-500" />
                رشد کاربران
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.user_growth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => formatDate(d)}
                      fontSize={11}
                    />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip
                      labelFormatter={(d) => formatDate(d as string)}
                      formatter={(value) => [
                        formatPersianNumber(Number(value) || 0),
                        "کاربر جدید",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="کاربران جدید"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart 2: Court Growth */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4 text-orange-500" />
                رشد ثبت مجموعه‌ها
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.court_growth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => formatDate(d)}
                      fontSize={11}
                    />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip
                      labelFormatter={(d) => formatDate(d as string)}
                      formatter={(value) => [
                        formatPersianNumber(Number(value) || 0),
                        "مجموعه جدید",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                      name="مجموعه‌های جدید"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart 3: Bookings Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="size-4 text-green-500" />
                روند رزروها
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.booking_trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => formatDate(d)}
                      fontSize={11}
                    />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip
                      labelFormatter={(d) => formatDate(d as string)}
                      formatter={(value) => [
                        formatPersianNumber(Number(value) || 0),
                        "رزرو",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      name="رزروها"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart 4: Revenue / Financial Turnover */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-purple-500" />
                گردش مالی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.revenue_trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => formatDate(d)}
                      fontSize={11}
                    />
                    <YAxis fontSize={11} />
                    <Tooltip
                      labelFormatter={(d) => formatDate(d as string)}
                      formatter={(value, name) => [
                        formatPersianNumber(Number(value) || 0) + " تومان",
                        name === "revenue" ? "درآمد" : "جریمه",
                      ]}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value === "revenue" ? "درآمد" : "جریمه"
                      }
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                      name="revenue"
                    />
                    <Bar
                      dataKey="penalties"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      name="penalties"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
