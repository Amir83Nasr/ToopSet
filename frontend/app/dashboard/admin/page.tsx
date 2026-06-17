"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { toLocalDateStr, todayStr } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { toast } from "@/lib/toast"
import {
  LineChart,
  Line,
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
  RefreshCw,
  Send,
  ShieldCheck,
  TrendingUp,
  Users,
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
  booking_trends: Array<{
    date: string
    count: number
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
  pending_payment: "bg-status-pending-bg text-status-pending",
  confirmed: "bg-status-confirmed-bg text-status-confirmed",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
}

const statusLabels: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "تایید شده",
  cancelled: "لغو شده",
}

export default function AdminDashboardPage() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState(todayStr())
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
      const params = new URLSearchParams()
      if (dateFrom) params.set("date_from", dateFrom + "T00:00:00")
      if (dateTo) params.set("date_to", dateTo + "T23:59:59")

      const data = await api<AdminStats>(
        `/api/v1/dashboard/admin-stats?${params}`
      )
      setStats(data)
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "خطا در دریافت اطلاعات"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

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
    },
    {
      title: "کل مجموعه‌ها",
      value: stats?.total_courts,
      icon: Building2,
      description: "مجموعه فعال در سیستم",
      href: "/dashboard/courts",
    },
    {
      title: "کل رزروها",
      value: stats?.total_bookings,
      icon: CalendarCheck,
      description: "رزرو ثبت‌شده",
      href: "/dashboard/bookings",
    },
    {
      title: "درآمد کل",
      value: stats?.total_revenue,
      icon: TrendingUp,
      description: "تومان",
      href: "/dashboard/payments",
    },
    {
      title: "مدیران فعال",
      value: stats?.active_managers,
      icon: ShieldCheck,
      description: `از ${stats?.total_managers || 0} مدیر کل`,
      href: "/dashboard/users?role=manager",
    },
    {
      title: "رزروهای امروز",
      value: stats?.today_bookings,
      icon: CalendarCheck,
      description: "رزرو امروز",
      href: "/dashboard/bookings",
    },
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden px-4 py-6">
      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Header */}
        <ScrollReveal>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-gradient-primary text-3xl font-bold tracking-tight">
                داشبورد مدیریت سیستم
              </h1>
              <p className="mt-1 text-muted-foreground">
                نمای کلی و تحلیل عملکرد پلتفرم
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="glass-card"
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw
                className={`ml-1 size-4 ${loading ? "animate-spin" : ""}`}
              />
              بروزرسانی
            </Button>
          </div>
          <div className="mt-6">
            <DateRangePicker
              value={{
                from: dateFrom ? new Date(dateFrom + "T12:00:00") : undefined,
                to: dateTo ? new Date(dateTo + "T12:00:00") : undefined,
              }}
              onChange={(range) => {
                setDateFrom(range?.from ? toLocalDateStr(range.from) : "")
                setDateTo(range?.to ? toLocalDateStr(range.to) : todayStr())
              }}
              className="glass-card w-full sm:w-72"
            />
          </div>
        </ScrollReveal>

        {/* Stats grid */}
        <ScrollReveal className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border bg-card/60 p-5 backdrop-blur-md"
                  >
                    <Skeleton className="size-10 rounded-lg" />
                    <Skeleton className="mt-3 h-4 w-20" />
                    <Skeleton className="mt-1 h-7 w-16" />
                  </div>
                ))
              : statCards.map((stat) => (
                  <Link
                    key={stat.title}
                    href={stat.href}
                    className="block transition-all hover:-translate-y-1"
                  >
                    <div className="h-full rounded-2xl border bg-card/60 p-5 backdrop-blur-md transition-shadow hover:shadow-xl hover:shadow-primary/5">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <stat.icon className="size-5" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {stat.value != null
                          ? formatPersianNumber(stat.value)
                          : "-"}
                      </p>
                    </div>
                  </Link>
                ))}
          </div>
        </ScrollReveal>

        {/* Error state */}
        {error && (
          <ScrollReveal>
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="size-5" />
                    <span>{error}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchStats}>
                    تلاش مجدد
                  </Button>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        )}

        {/* Monthly Recap */}
        {!recapLoading && monthlyRecap && (
          <ScrollReveal className="mt-8">
            <Card className="glass-card rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      خلاصه {monthlyRecap.current_month.label}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      مقایسه با {monthlyRecap.last_month.label}
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
                      className="rounded-xl border bg-background/50 p-5"
                    >
                      <p className="text-sm font-medium text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-2 text-3xl font-bold">
                        {formatPersianNumber(item.current)}
                        {item.isCurrency && (
                          <span className="mr-1 text-sm font-normal text-muted-foreground">
                            تومان
                          </span>
                        )}
                      </p>
                      <div
                        className={`mt-2 flex items-center gap-1 text-sm font-medium ${
                          item.change >= 0
                            ? "text-status-confirmed"
                            : "text-status-cancelled"
                        }`}
                      >
                        {item.change >= 0 ? (
                          <ArrowUp className="size-4" />
                        ) : (
                          <ArrowDown className="size-4" />
                        )}
                        <span>
                          {item.change >= 0 ? "+" : ""}
                          {item.change}% نسبت به ماه قبل
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        )}

        {!loading && !error && stats && (
          <>
            {/* Today's overview */}
            <ScrollReveal className="mt-8">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "درآمد امروز",
                    value: Math.round(stats.today_revenue),
                    unit: "تومان",
                  },
                  {
                    label: "رزروهای امروز",
                    value: stats.today_bookings,
                    unit: "رزرو",
                  },
                  {
                    label: "در انتظار پرداخت",
                    value: stats.pending_bookings,
                    unit: "رزرو نیازمند پیگیری",
                  },
                  {
                    label: "مدیران فعال",
                    value: stats.active_managers,
                    unit: `از ${stats.total_managers} مدیر`,
                  },
                ].map((item, i) => (
                  <Card key={i} className="glass-card rounded-2xl">
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1 text-3xl font-bold">
                        {formatPersianNumber(item.value)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.unit}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollReveal>

            {/* Recent bookings & Chart */}
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <ScrollReveal className="lg:col-span-2">
                <Card className="glass-card h-full rounded-2xl">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold">آخرین رزروها</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      ۱۰ رزرو آخر سیستم
                    </p>
                    <div className="mt-6">
                      {stats.recent_bookings.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                          رزروی ثبت نشده است
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>مجموعه</TableHead>
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
                                  {b.start_time
                                    ? formatDate(b.start_time)
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {formatPersianNumber(
                                    Math.round(b.price_paid)
                                  )}{" "}
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
                  </CardContent>
                </Card>
              </ScrollReveal>

              <ScrollReveal>
                <Card className="glass-card h-full rounded-2xl">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold">
                      روند رزروها (۷ روز اخیر)
                    </h2>
                    <div className="mt-6 h-75 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.booking_trends}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="hsl(var(--border) / 0.3)"
                          />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(date) => formatDate(date)}
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip
                            labelFormatter={(date) =>
                              formatDate(date as string)
                            }
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              borderColor: "hsl(var(--border))",
                              borderRadius: "12px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            dot={{ fill: "hsl(var(--primary))", r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            </div>

            {/* Popular courts */}
            {stats.popular_courts.length > 0 && (
              <ScrollReveal className="mt-8">
                <Card className="glass-card rounded-2xl">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold">
                      محبوب‌ترین مجموعه‌ها
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      مجموعه‌های با بیشترین رزرو
                    </p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      {stats.popular_courts.map((court, idx) => (
                        <Link
                          key={court.court_id}
                          href={`/dashboard/courts/${court.court_id}`}
                          className="flex items-center gap-4 rounded-xl border bg-background/50 p-4 transition-all hover:-translate-y-1 hover:bg-background/80"
                        >
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {court.court_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatPersianNumber(court.booking_count)} رزرو
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            )}

            {/* Broadcast Notification */}
            <ScrollReveal className="mt-8">
              <Card className="glass-card rounded-2xl">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold">اعلان همگانی</h2>
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
                    <div className="mt-6 flex gap-2">
                      <Input
                        name="message"
                        placeholder="متن اعلان..."
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        required
                        className="flex-1 rounded-xl"
                      />
                      <Button
                        type="submit"
                        disabled={broadcasting}
                        className="rounded-xl px-6"
                      >
                        <Send className="ml-2 size-4" />
                        {broadcasting ? "در حال ارسال..." : "ارسال"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </ScrollReveal>
          </>
        )}
      </div>
    </div>
  )
}
