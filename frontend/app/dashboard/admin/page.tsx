"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { toast } from "sonner"
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CreditCard,
  Gavel,
  History,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  ArrowUp,
  ArrowDown,
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

interface MonthlyRecap {
  current_month: {
    label: string
    bookings: number
    revenue: number
    new_users: number
  }
  last_month: {
    label: string
    bookings: number
    revenue: number
    new_users: number
  }
  changes: {
    bookings_pct: number
    revenue_pct: number
    users_pct: number
  }
}

function formatPersianNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(num)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

const statusStyles: Record<string, string> = {
  pending_payment:
    "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  confirmed:
    "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
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
  const [monthlyRecap, setMonthlyRecap] = useState<MonthlyRecap | null>(null)
  const [recapLoading, setRecapLoading] = useState(true)
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [broadcasting, setBroadcasting] = useState(false)

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

  const fetchMonthlyRecap = useCallback(async () => {
    setRecapLoading(true)
    try {
      const data = await api<MonthlyRecap>(
        "/api/v1/dashboard/admin/monthly-recap"
      )
      setMonthlyRecap(data)
    } catch {
      // Non-critical
    } finally {
      setRecapLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchStats(), 0)
    return () => clearTimeout(timer)
  }, [fetchStats])

  useEffect(() => {
    const timer = setTimeout(() => fetchMonthlyRecap(), 100)
    return () => clearTimeout(timer)
  }, [fetchMonthlyRecap])

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
      color:
        "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    {
      title: "کل رزروها",
      value: stats?.total_bookings,
      icon: CalendarCheck,
      description: "رزرو ثبت‌شده",
      href: "/dashboard/bookings",
      color:
        "text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400",
    },
    {
      title: "درآمد کل",
      value: stats?.total_revenue,
      icon: TrendingUp,
      description: "تومان",
      href: "/dashboard/payments",
      color:
        "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
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
    <div className="relative flex flex-1 flex-col gap-6 overflow-hidden px-4 py-6">
      {/* Neon orbs + mesh background */}
      <div className="neon-orb neon-orb-1 !top-[-150px] !right-[-100px]" />
      <div className="neon-orb neon-orb-purple !bottom-[-120px] !left-[-80px]" />
      <div className="neon-orb neon-orb-cyan !top-[40%] !left-[10%]" />
      <div className="bg-mesh pointer-events-none absolute inset-0" />
      <div className="bg-dots pointer-events-none absolute inset-0" />

      <div className="relative z-10">
        {/* Header */}
        <ScrollReveal>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-gradient-primary">داشبورد</span> مدیریت
                سیستم
              </h1>
              <p className="text-muted-foreground">
                نمای کلی و کنترل کامل سیستم
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
              className="neon-border-hover"
            >
              <RefreshCw
                className={`ml-1 size-4 ${loading ? "animate-spin" : ""}`}
              />
              بروزرسانی
            </Button>
          </div>
        </ScrollReveal>

        {/* Stats grid */}
        <ScrollReveal className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-5">
                    <Skeleton className="size-10 rounded-lg" />
                    <Skeleton className="mt-3 h-4 w-20" />
                    <Skeleton className="mt-1 h-7 w-16" />
                    <Skeleton className="mt-1 h-3 w-12" />
                  </div>
                ))
              : statCards.map((stat) => (
                  <Link
                    key={stat.title}
                    href={stat.href}
                    className="block transition-all hover:-translate-y-0.5"
                  >
                    <div className="glass-card neon-border-hover h-full rounded-2xl p-5">
                      <div
                        className={`inline-flex size-10 items-center justify-center rounded-xl ${stat.color}`}
                      >
                        <stat.icon className="size-5" />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {stat.value != null
                          ? formatPersianNumber(stat.value)
                          : "-"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {stat.description}
                      </p>
                    </div>
                  </Link>
                ))}
          </div>
        </ScrollReveal>

        {/* Error state */}
        {error && (
          <ScrollReveal>
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-5" />
                  <span>{error}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStats}
                  className="neon-border-hover"
                >
                  تلاش مجدد
                </Button>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Monthly Recap */}
        {!recapLoading && monthlyRecap && (
          <ScrollReveal className="mt-6">
            <div className="glass-card neon-border-hover rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    خلاصه {monthlyRecap.current_month.label}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    مقایسه با {monthlyRecap.last_month.label}
                  </p>
                </div>
                <div className="rounded-full border bg-muted/50 px-3.5 py-1 text-xs text-muted-foreground">
                  گزارش ماهانه
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: "رزروها",
                    current: monthlyRecap.current_month.bookings,
                    change: monthlyRecap.changes.bookings_pct,
                  },
                  {
                    label: "درآمد",
                    current: Math.round(monthlyRecap.current_month.revenue),
                    change: monthlyRecap.changes.revenue_pct,
                    isCurrency: true,
                  },
                  {
                    label: "کاربران جدید",
                    current: monthlyRecap.current_month.new_users,
                    change: monthlyRecap.changes.users_pct,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border bg-background/40 p-4"
                  >
                    <p className="text-sm text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {formatPersianNumber(item.current)}
                      {item.isCurrency && (
                        <span className="mr-1 text-xs font-normal text-muted-foreground">
                          تومان
                        </span>
                      )}
                    </p>
                    <div
                      className={`mt-1 flex items-center gap-1 text-xs ${
                        item.change >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {item.change >= 0 ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )}
                      <span>
                        {item.change >= 0 ? "+" : ""}
                        {item.change}% نسبت به ماه قبل
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {!loading && !error && stats && (
          <>
            {/* Today's overview */}
            <ScrollReveal className="mt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="glass-card rounded-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5">
                  <p className="text-sm font-medium text-muted-foreground">
                    درآمد امروز
                  </p>
                  <p className="mt-1 text-3xl font-bold text-primary">
                    {formatPersianNumber(Math.round(stats.today_revenue))}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">تومان</p>
                </div>
                <div className="glass-card from-amber/5 to-amber/10 border-amber/20 rounded-2xl bg-gradient-to-br p-5">
                  <p className="text-sm font-medium text-muted-foreground">
                    رزروهای امروز
                  </p>
                  <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {formatPersianNumber(stats.today_bookings)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">رزرو</p>
                </div>
                <div className="glass-card from-rose/5 to-rose/10 border-rose/20 rounded-2xl bg-gradient-to-br p-5">
                  <p className="text-sm font-medium text-muted-foreground">
                    در انتظار پرداخت
                  </p>
                  <p className="mt-1 text-3xl font-bold text-rose-600 dark:text-rose-400">
                    {formatPersianNumber(stats.pending_bookings)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    رزرو نیازمند پیگیری
                  </p>
                </div>
                <div className="glass-card from-cyan/5 to-cyan/10 border-cyan/20 rounded-2xl bg-gradient-to-br p-5">
                  <p className="text-sm font-medium text-muted-foreground">
                    مدیران فعال
                  </p>
                  <p className="mt-1 text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                    {formatPersianNumber(stats.active_managers)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    از {formatPersianNumber(stats.total_managers)} مدیر
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Recent bookings + Quick actions */}
            <div className="mt-6">
              <ScrollReveal>
                <div className="glass-card neon-border-hover rounded-2xl p-6">
                  <h2 className="text-lg font-semibold">آخرین رزروها</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ۱۰ رزرو آخر سیستم
                  </p>
                  <div className="mt-4">
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
                              <TableCell className="font-medium">
                                {b.court_name}
                              </TableCell>
                              <TableCell>{b.user_name}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {b.start_time ? formatDate(b.start_time) : "-"}
                              </TableCell>
                              <TableCell>
                                {formatPersianNumber(Math.round(b.price_paid))}{" "}
                                تومان
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[b.status] || ""}`}
                                >
                                  {statusLabels[b.status] || b.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Popular courts */}
            {stats.popular_courts.length > 0 && (
              <ScrollReveal className="mt-6">
                <div className="glass-card neon-border-hover rounded-2xl p-6">
                  <h2 className="text-lg font-semibold">محبوب‌ترین زمین‌ها</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    زمین‌های با بیشترین رزرو
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {stats.popular_courts.map((court, idx) => (
                      <Link
                        key={court.court_id}
                        href={`/dashboard/courts/${court.court_id}`}
                        className="flex items-center gap-3 rounded-xl border bg-background/40 p-3 transition-all hover:-translate-y-0.5 hover:bg-background/60"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {court.court_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatPersianNumber(court.booking_count)} رزرو
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Broadcast Notification */}
            <ScrollReveal className="mt-6">
              <div className="glass-card neon-border-hover rounded-2xl p-6">
                <h2 className="text-lg font-semibold">اعلان همگانی</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  ارسال پیام به تمام کاربران
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!broadcastMessage.trim()) return
                    setBroadcasting(true)
                    try {
                      await api("/api/v1/admin/notifications/broadcast", {
                        method: "POST",
                        body: JSON.stringify({
                          message: broadcastMessage,
                          type: "broadcast",
                        }),
                      })
                      toast.success("اعلان برای تمام کاربران ارسال شد")
                      setBroadcastMessage("")
                    } catch (err) {
                      toast.error(
                        err instanceof ApiError ? err.message : "خطا در ارسال"
                      )
                    } finally {
                      setBroadcasting(false)
                    }
                  }}
                >
                  <div className="mt-4 flex gap-2">
                    <Input
                      name="message"
                      placeholder="متن اعلان..."
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button type="submit" disabled={broadcasting}>
                      <Send className="ml-2 size-4" />
                      {broadcasting ? "در حال ارسال..." : "ارسال"}
                    </Button>
                  </div>
                </form>
              </div>
            </ScrollReveal>
          </>
        )}
      </div>
    </div>
  )
}
