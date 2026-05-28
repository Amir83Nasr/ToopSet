"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CreditCard,
  Gavel,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"

interface AdminStats {
  total_courts: number
  total_users: number
  total_bookings: number
  total_revenue: number
  active_managers: number
  pending_bookings: number
  today_bookings: number
  today_revenue: number
  total_managers: number
  recent_bookings: Array<{
    id: number
    court_name: string
    user_name: string
    price_paid: number
    status: string
    start_time: string | null
  }>
  popular_courts: Array<{
    court_id: number
    court_name: string
    booking_count: number
  }>
}

function formatPersianNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(num)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
}

const statusStyles: Record<string, string> = {
  pending_payment: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
}

const statusLabels: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "تایید شده",
  cancelled: "لغو شده",
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
      const msg = err instanceof ApiError ? err.message : "خطا در دریافت اطلاعات"
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
      title: "کل کاربران",
      value: stats?.total_users,
      icon: Users,
      description: "کاربر ثبت‌نام کرده",
      href: "/dashboard/users",
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      title: "کل زمین‌ها",
      value: stats?.total_courts,
      icon: Building2,
      description: "زمین فعال در سیستم",
      href: "/dashboard/courts",
      color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    {
      title: "کل رزروها",
      value: stats?.total_bookings,
      icon: CalendarCheck,
      description: "رزرو ثبت‌شده",
      href: "/dashboard/bookings",
      color: "text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400",
    },
    {
      title: "درآمد کل",
      value: stats?.total_revenue,
      icon: TrendingUp,
      description: "تومان",
      href: "/dashboard/payments",
      color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
    },
    {
      title: "مدیران فعال",
      value: stats?.active_managers,
      icon: ShieldCheck,
      description: `از ${stats?.total_managers || 0} مدیر کل`,
      href: "/dashboard/users?role=manager",
      color: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400",
    },
    {
      title: "رزروهای امروز",
      value: stats?.today_bookings,
      icon: CalendarCheck,
      description: "رزرو امروز",
      href: "/dashboard/bookings",
      color: "text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400",
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">داشبورد مدیریت سیستم</h1>
          <p className="text-muted-foreground">نمای کلی و کنترل کامل سیستم</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`ml-1 size-4 ${loading ? "animate-spin" : ""}`} />
          بروزرسانی
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="size-10 rounded-lg" />
                  <Skeleton className="mt-3 h-4 w-20" />
                  <Skeleton className="mt-1 h-7 w-16" />
                  <Skeleton className="mt-1 h-3 w-12" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Link key={stat.title} href={stat.href} className="block transition-colors hover:opacity-80">
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <div className={`inline-flex size-10 items-center justify-center rounded-lg ${stat.color}`}>
                      <stat.icon className="size-5" />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{stat.title}</p>
                    <p className="mt-1 text-2xl font-bold">
                      {stat.value != null ? formatPersianNumber(stat.value) : "-"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStats}>
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && stats && (
        <>
          {/* Today's overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">درآمد امروز</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">
                  {formatPersianNumber(Math.round(stats.today_revenue))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">تومان</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber/5 to-amber/10 border-amber/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">رزروهای امروز</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {formatPersianNumber(stats.today_bookings)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">رزرو</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-rose/5 to-rose/10 border-rose/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">در انتظار پرداخت</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                  {formatPersianNumber(stats.pending_bookings)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">رزرو نیازمند پیگیری</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-cyan/5 to-cyan/10 border-cyan/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">مدیران فعال</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                  {formatPersianNumber(stats.active_managers)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">از {formatPersianNumber(stats.total_managers)} مدیر</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent bookings + Quick actions */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Recent bookings table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">آخرین رزروها</CardTitle>
                <CardDescription>۱۰ رزرو آخر سیستم</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recent_bookings.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    رزروی ثبت نشده است
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>زمین</TableHead>
                        <TableHead>کاربر</TableHead>
                        <TableHead>تاریخ</TableHead>
                        <TableHead>مبلغ</TableHead>
                        <TableHead>وضعیت</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recent_bookings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.court_name}</TableCell>
                          <TableCell>{b.user_name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {b.start_time ? formatDate(b.start_time) : "-"}
                          </TableCell>
                          <TableCell>{formatPersianNumber(Math.round(b.price_paid))} تومان</TableCell>
                          <TableCell>
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[b.status] || ""}`}>
                              {statusLabels[b.status] || b.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">دسترسی سریع</CardTitle>
                <CardDescription>مدیریت بخش‌های مختلف</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/users">
                    <Users className="ml-2 size-4" />
                    مدیریت کاربران
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/courts">
                    <Building2 className="ml-2 size-4" />
                    مدیریت زمین‌ها
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/bookings">
                    <CalendarCheck className="ml-2 size-4" />
                    مدیریت رزروها
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/payments">
                    <CreditCard className="ml-2 size-4" />
                    تراکنش‌ها
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/contact">
                    <MessageSquare className="ml-2 size-4" />
                    پیام‌های تماس
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/wallet">
                    <Wallet className="ml-2 size-4" />
                    کیف پول
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/penalties">
                    <Gavel className="ml-2 size-4" />
                    جریمه‌ها
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/reports">
                    <TrendingUp className="ml-2 size-4" />
                    گزارشات
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Popular courts */}
          {stats.popular_courts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">محبوب‌ترین زمین‌ها</CardTitle>
                <CardDescription>زمین‌های با بیشترین رزرو</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {stats.popular_courts.map((court, idx) => (
                    <Link
                      key={court.court_id}
                      href={`/dashboard/courts/${court.court_id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{court.court_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPersianNumber(court.booking_count)} رزرو
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
