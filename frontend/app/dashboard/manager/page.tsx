"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CreditCard,
  Plus,
  RefreshCw,
  Wallet,
  Calendar,
  TrendingUp,
} from "lucide-react"

interface ManagerStats {
  my_courts: number
  upcoming_bookings: number
  today_earnings: number
  wallet_balance: number
  recent_bookings: Array<{
    id: number
    court_name: string
    start_time: string
    price_paid: number
  }>
}

interface RevenueRow {
  date: string
  revenue: number
  penalties: number
  bookings_count: number
}

function formatPersianNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(num)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

const quickActions = [
  {
    title: "مجموعه‌های من",
    href: "/dashboard/courts",
    icon: Building2,
    variant: "default" as const,
  },
  {
    title: "زمان‌بندی",
    href: "/dashboard/courts/schedule",
    icon: Calendar,
    variant: "outline" as const,
  },
  {
    title: "مجموعه جدید",
    href: "/dashboard/courts/create",
    icon: Plus,
    variant: "outline" as const,
  },
]

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState<ManagerStats | null>(null)
  const [revenue, setRevenue] = useState<RevenueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, revenueData] = await Promise.all([
        api<ManagerStats>("/api/v1/dashboard/manager-stats"),
        api<RevenueRow[]>("/api/v1/dashboard/manager/revenue"),
      ])
      setStats(statsData)
      setRevenue((revenueData || []).reverse().slice(-7))
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در دریافت اطلاعات"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0)
    return () => clearTimeout(timer)
  }, [fetchData])

  const statCards = [
    {
      title: "مجموعه‌های من",
      value: stats?.my_courts,
      icon: Building2,
      desc: "در مدیریت من",
    },
    {
      title: "رزروهای آینده",
      value: stats?.upcoming_bookings,
      icon: CalendarCheck,
      desc: "رزروهای پیش‌رو",
    },
    {
      title: "درآمد امروز",
      value: stats?.today_earnings,
      icon: CreditCard,
      desc: "تومان",
      isCurrency: true,
    },
    {
      title: "کیف پول",
      value: stats?.wallet_balance,
      icon: Wallet,
      desc: "تومان",
      isCurrency: true,
    },
  ]

  const totalRevenue = revenue.reduce((s, r) => s + r.revenue, 0)
  const totalBookings = revenue.reduce((s, r) => s + r.bookings_count, 0)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">داشبورد مدیر مجموعه</h1>
        <p className="text-muted-foreground">مدیریت مجموعه‌ها، رزروها و درآمد</p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Button key={action.title} variant={action.variant} asChild>
            <Link href={action.href}>
              <action.icon className="ml-2 size-4" />
              {action.title}
            </Link>
          </Button>
        ))}
        <Button variant="ghost" size="icon" onClick={fetchData}>
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="ml-1 size-4" />
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="mt-1 h-3 w-16" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {stat.value != null
                      ? stat.isCurrency
                        ? formatPersianNumber(stat.value)
                        : formatPersianNumber(stat.value)
                      : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.desc}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Revenue chart + Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              روند درآمد (۷ روز اخیر)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : revenue.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                داده‌ای برای نمایش وجود ندارد
              </div>
            ) : (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => formatDate(d)}
                      fontSize={11}
                    />
                    <YAxis fontSize={11} />
                    <Tooltip
                      labelFormatter={(d) => formatDate(d as string)}
                      formatter={(value) => [
                        formatPersianNumber(Number(value) || 0) + " تومان",
                        "درآمد",
                      ]}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary mini-card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">خلاصه هفتگی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-green-600" />
                    <span className="text-sm">کل درآمد</span>
                  </div>
                  <span className="font-bold">
                    {formatPersianNumber(totalRevenue)} تومان
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="size-4 text-blue-600" />
                    <span className="text-sm">رزروها</span>
                  </div>
                  <span className="font-bold">
                    {formatPersianNumber(totalBookings)}
                  </span>
                </div>
                {stats && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-orange-600" />
                      <span className="text-sm">مجموعه‌ها</span>
                    </div>
                    <span className="font-bold">
                      {formatPersianNumber(stats.my_courts)}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent bookings */}
      {!loading && !error && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="size-4" />
              رزروهای اخیر
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recent_bookings && stats.recent_bookings.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border bg-background/40 p-3 transition-colors hover:bg-background/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                        <CalendarCheck className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {booking.court_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.start_time
                            ? `${formatDate(booking.start_time)} - ${formatTime(booking.start_time)}`
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      {formatPersianNumber(booking.price_paid)} تومان
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                رزروی وجود ندارد
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
