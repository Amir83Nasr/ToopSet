"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import Link from "next/link"
import { AlertCircle, CalendarCheck, RefreshCw, Wallet } from "lucide-react"

interface UserStats {
  upcoming_bookings: number
  completed_bookings: number
  wallet_balance: number
  favorite_sport: string
  recent_bookings: Array<{
    id: number
    court_name: string
    start_time: string
    status: string
    price_paid: number
  }>
}

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
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

export default function UserDashboardPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api<UserStats>("/api/v1/dashboard/user-stats")
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
    const timer = setTimeout(() => fetchStats(), 0)
    return () => clearTimeout(timer)
  }, [fetchStats])

  const statCards = [
    {
      title: "رزروهای پیش‌رو",
      value: stats?.upcoming_bookings,
      icon: CalendarCheck,
      description: "رزروهای فعال",
    },
    {
      title: "رزروهای تکمیل‌شده",
      value: stats?.completed_bookings,
      icon: CalendarCheck,
      description: "رزروهای گذشته",
    },
    {
      title: "کیف پول",
      value: stats?.wallet_balance,
      icon: Wallet,
      description: "موجودی",
    },
  ]

  return (
    <div className="relative flex flex-1 flex-col gap-6 overflow-hidden px-4 py-6">
      {/* Neon orbs + mesh background */}
      <div className="neon-orb neon-orb-3 !top-[-100px] !right-[-80px]" />
      <div className="neon-orb neon-orb-green !bottom-[-80px] !left-[-60px]" />
      <div className="bg-mesh pointer-events-none absolute inset-0" />
      <div className="bg-dots pointer-events-none absolute inset-0" />

      <div className="relative z-10">
        <ScrollReveal>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-gradient-primary">داشبورد</span> کاربر
            </h1>
            <p className="text-muted-foreground">
              رزروهای شما و مدیریت حساب کاربری
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-6">
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
                    className="glass-card neon-border-hover rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                        <stat.icon className="size-6 text-primary" />
                      </div>
                    </div>
                    <div className="mt-4 text-right">
                      <p className="text-sm text-muted-foreground">
                        {stat.title}
                      </p>
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
        </ScrollReveal>

        {error && (
          <ScrollReveal>
            <div className="glass-card rounded-2xl p-4 text-center">
              <div className="mb-2 flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="size-5" />
                <span>{error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={fetchStats}>
                <RefreshCw className="ml-1 size-4" />
                تلاش مجدد
              </Button>
            </div>
          </ScrollReveal>
        )}

        {!loading && !error && stats && (
          <ScrollReveal>
            <div className="glass-card neon-border-hover rounded-2xl p-6">
              <h2 className="mb-4 text-lg font-semibold">رزروهای اخیر</h2>
              {stats.recent_bookings && stats.recent_bookings.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_bookings.map((booking) => {
                    const st = statusLabels[booking.status] || {
                      label: booking.status,
                      variant: "outline",
                    }
                    return (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between rounded-xl border bg-background/40 p-3 transition-colors hover:bg-background/60"
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
          </ScrollReveal>
        )}
      </div>
    </div>
  )
}
