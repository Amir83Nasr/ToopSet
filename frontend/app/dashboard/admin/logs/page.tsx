"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toPersianDigits, toLocalDateStr, todayStr } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  ShieldX,
  History,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface LogEntry {
  id: number
  user_id: number | null
  action: string
  details: string | null
  created_at: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const actionLabels: Record<string, string> = {
  booking_created: "ایجاد رزرو",
  booking_cancelled: "لغو رزرو",
  booking_confirmed: "تایید رزرو",
  broadcast: "اعلان همگانی",
  user_role_changed: "تغییر نقش کاربر",
  user_toggled: "تغییر وضعیت کاربر",
  user_created: "ایجاد کاربر",
  user_deleted: "حذف کاربر",
  court_created: "ایجاد مجموعه",
  court_updated: "ویرایش مجموعه",
  court_deleted: "حذف مجموعه",
  court_toggled: "تغییر وضعیت مجموعه",
  court_approved: "تایید مجموعه",
  court_rejected: "رد مجموعه",
  review_deleted: "حذف نظر",
  setting_updated: "ویرایش تنظیمات",
  user_registered: "ثبت‌نام کاربر",
}

export default function AdminLogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState(todayStr())
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const limit = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (actionFilter) params.set("action", actionFilter)
      if (dateFrom) {
        params.set("date_from", dateFrom)
        params.set("date_to", dateTo)
      }
      const res = await api<{ logs: LogEntry[]; total: number }>(
        `/api/v1/admin/logs?${params}`
      )
      setLogs(res.logs)
      setTotal(res.total)
    } catch {
      toast.error("خطا در بارگذاری لاگ‌ها")
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, dateFrom, dateTo])

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(), 0)
    return () => clearTimeout(timer)
  }, [fetchLogs])

  const handleDelete = async (logId: number) => {
    try {
      await api(`/api/v1/admin/logs/${logId}`, { method: "DELETE" })
      toast.success("لاگ با موفقیت حذف شد")
      fetchLogs()
    } catch (err) {
      console.error("Failed to delete log:", err)
      toast.error("خطا در حذف لاگ")
    }
  }

  const handleClearAll = async () => {
    setClearDialogOpen(false)
    try {
      await api("/api/v1/admin/logs/clear", { method: "DELETE" })
      toast.success("لاگ‌ها با موفقیت پاک شدند")
      setPage(0)
      fetchLogs()
    } catch (err) {
      console.error("Failed to clear logs:", err)
      toast.error("خطا در پاکسازی لاگ‌ها")
    }
  }

  const hasActiveFilter = actionFilter !== "" || dateFrom !== ""

  function clearFilters() {
    setActionFilter("")
    setDateFrom("")
    setDateTo(todayStr())
    setPage(0)
  }

  const totalPages = Math.ceil(total / limit)

  if (user && user.role !== "admin") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
        <ShieldX className="size-16" />
        <p className="text-xl">شما دسترسی به این بخش را ندارید</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">لاگ سیستم</h1>
          <p className="text-muted-foreground">رویدادهای اخیر سیستم</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={actionFilter}
            onValueChange={(val) => {
              setActionFilter(val === "all" ? "" : val)
              setPage(0)
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="همه عملیات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه عملیات</SelectItem>
              {Object.entries(actionLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DateRangePicker
            value={{
              from: dateFrom ? new Date(dateFrom + "T12:00:00") : undefined,
              to: dateTo ? new Date(dateTo + "T12:00:00") : undefined,
            }}
            onChange={(range) => {
              setDateFrom(range?.from ? toLocalDateStr(range.from) : "")
              setDateTo(range?.to ? toLocalDateStr(range.to) : todayStr())
              setPage(0)
            }}
            className="w-64"
          />

          {hasActiveFilter && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="ml-1 size-3.5" />
              حذف فیلتر
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw
              className={`ml-1.5 size-4 ${loading ? "animate-spin" : ""}`}
            />
            بروزرسانی
          </Button>

          <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="ml-1.5 size-4" />
                پاکسازی همه
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>پاکسازی لاگ‌ها</AlertDialogTitle>
                <AlertDialogDescription>
                  آیا از پاکسازی تمام لاگ‌ها اطمینان دارید؟ این عمل قابل بازگشت
                  نیست.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>انصراف</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  variant="destructive"
                >
                  پاکسازی همه
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {loading ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ</TableHead>
                <TableHead>ساعت</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>عملیات</TableHead>
                <TableHead>جزئیات</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <History className="mb-4 size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              رویدادی ثبت نشده است
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>ساعت</TableHead>
                  <TableHead>کاربر</TableHead>
                  <TableHead>عملیات</TableHead>
                  <TableHead>جزئیات</TableHead>
                  <TableHead className="w-16">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell
                      className="text-sm whitespace-nowrap text-muted-foreground"
                      dir="ltr"
                    >
                      {formatTime(log.created_at)}
                    </TableCell>
                    <TableCell>
                      {log.user_id ? toPersianDigits(log.user_id) : "سیستم"}
                    </TableCell>
                    <TableCell>
                      <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {log.details || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(log.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                صفحه {toPersianDigits(page + 1)} از{" "}
                {toPersianDigits(totalPages)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronRight className="ml-1 size-4" /> قبلی
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  بعدی <ChevronLeft className="mr-1 size-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
