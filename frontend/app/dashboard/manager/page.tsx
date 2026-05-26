"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CreditCard,
  RefreshCw,
  Wallet,
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

function formatPersianNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(num)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState<ManagerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api<ManagerStats>("/api/v1/dashboard/manager-stats")
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
      title: "زمین‌های من",
      value: stats?.my_courts,
      icon: Building2,
      description: "در مدیریت من",
    },
    {
      title: "رزروهای آینده",
      value: stats?.upcoming_bookings,
      icon: CalendarCheck,
      description: "رزروهای پیش‌رو",
    },
    {
      title: "درآمد امروز",
      value: stats?.today_earnings,
      icon: CreditCard,
      description: "تومان",
    },
    {
      title: "کیف پول",
      value: stats?.wallet_balance,
      icon: Wallet,
      description: "تومان",
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">داشبورد مدیرمجموعه</h1>
        <p className="text-muted-foreground">
          مدیریت زمین‌های شما و درآمد
        </p>
      </div>

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

      {!loading && !error && stats && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">رزروهای اخیر</h2>
            {stats.recent_bookings && stats.recent_bookings.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_bookings.map((booking) => (
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
                          {formatTime(booking.start_time)}
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
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">دسترسی سریع</h2>
            {" "}
              <div className="flex flex-col gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/courts">مدیریت زمین‌ها</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/courts/schedule">زمان‌بندی</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/wallet">کیف پول</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}