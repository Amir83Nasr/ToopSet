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
  Users,
} from "lucide-react"

interface AdminStats {
  total_courts: number
  total_users: number
  total_bookings: number
  total_revenue: number
  active_managers: number
  pending_bookings: number
}

function formatPersianNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(num)
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api<AdminStats>("/api/v1/dashboard/admin-stats")
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
      title: "کل زمین‌ها",
      value: stats?.total_courts,
      icon: Building2,
      description: "زمین فعال در سیستم",
    },
    {
      title: "کاربران",
      value: stats?.total_users,
      icon: Users,
      description: "کاربر ثبت‌نام کرده",
    },
    {
      title: "رزروها",
      value: stats?.total_bookings,
      icon: CalendarCheck,
      description: "کل رزروها",
    },
    {
      title: "درآمد کل",
      value: stats?.total_revenue,
      icon: CreditCard,
      description: "تومان",
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">داشبورد مدیر سیستم</h1>
        <p className="text-muted-foreground">
          مدیریت کامل سیستم و تمام داده‌ها
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
            <h2 className="mb-4 text-lg font-semibold">وضعیت سریع</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">مدیران فعال</span>
                <Badge variant="default">{formatPersianNumber(stats.active_managers)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">رزروهای در انتظار</span>
                <Badge variant="outline">{formatPersianNumber(stats.pending_bookings)}</Badge>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">دسترسی سریع</h2>
            <div className="flex flex-col gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/users">مدیریت کاربران</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/courts">مدیریت زمین‌ها</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/bookings">مدیریت رزروها</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}