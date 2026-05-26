"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CreditCard,
  RefreshCw,
  Users,
} from "lucide-react"

interface DashboardStats {
  active_courts: number
  today_bookings: number
  today_revenue: number
  total_users: number
  recent_bookings: Array<{
    id: number
    court_name: string
    user_name: string
    price_paid: number
    status: string
    start_time: string
  }>
  popular_courts: Array<{
    court_id: number
    court_name: string
    booking_count: number
  }>
}

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pending_payment: { label: "در انتظار پرداخت", variant: "outline" },
  confirmed: { label: "تایید شده", variant: "default" },
  cancelled: { label: "لغو شده", variant: "secondary" },
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api<DashboardStats>("/api/v1/dashboard/stats")
      setStats(data)
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "خطا در دریافت اطلاعات"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const statCards = [
    {
      title: "زمین‌های فعال",
      value: stats?.active_courts,
      icon: Building2,
      description: "زمین فعال در سیستم",
    },
    {
      title: "رزروهای امروز",
      value: stats?.today_bookings,
      icon: CalendarCheck,
      description: "رزرو فعال امروز",
    },
    {
      title: "پرداخت‌های امروز",
      value: stats?.today_revenue,
      icon: CreditCard,
      description: "تومان",
    },
    {
      title: "کاربران",
      value: stats?.total_users,
      icon: Users,
      description: "کاربر ثبت‌نام کرده",
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">داشبورد</h1>
        <p className="text-muted-foreground">
          خلاصه فعالیت‌های ورزشی امروز
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm"
              >
                <Skeleton className="size-12 rounded-lg" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          : statCards.map((stat) => (
              <div
                key={stat.title}
                className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    <stat.icon className="size-6 text-primary" />
                  </div>
                </div>
                <div className="mt-4 text-right">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">
                    {stat.value != null
                      ? formatPersianNumber(stat.value)
                      : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </div>
              </div>
            ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="size-5" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className="ml-1 size-4" />
            تلاش مجدد
          </Button>
        </div>
      )}

      {/* Recent Bookings & Popular Courts */}
      {!loading && !error && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Recent Bookings */}
          <div className="col-span-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">رزروهای اخیر</h2>
            {stats.recent_bookings && stats.recent_bookings.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_bookings.map((booking) => {
                  const st =
                    statusLabels[booking.status] || {
                      label: booking.status,
                      variant: "outline",
                    }
                  return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between rounded-lg border p-3"
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
                            {booking.user_name} · {formatTime(booking.start_time)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatPersianNumber(booking.price_paid)} تومان
                        </span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                رزروی وجود ندارد
              </div>
            )}
          </div>

          {/* Popular Courts */}
          <div className="col-span-3 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">زمین‌های محبوب</h2>
            {stats.popular_courts && stats.popular_courts.length > 0 ? (
              <div className="space-y-2">
                {stats.popular_courts.map((court, index) => (
                  <div
                    key={court.court_id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium">
                        {court.court_name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatPersianNumber(court.booking_count)} رزرو
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                آماری وجود ندارد
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
