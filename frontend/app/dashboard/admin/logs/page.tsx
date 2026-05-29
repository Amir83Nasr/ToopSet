"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChevronLeft,
  ChevronRight,
  ShieldX,
  History,
  RefreshCw,
} from "lucide-react"

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
  court_created: "ایجاد زمین",
  court_updated: "ویرایش زمین",
  court_deleted: "حذف زمین",
  court_toggled: "تغییر وضعیت زمین",
}

export default function AdminLogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const limit = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (actionFilter) params.set("action", actionFilter)
      const res = await api<{ logs: LogEntry[]; total: number }>(
        `/api/v1/admin/logs?${params}`
      )
      setLogs(res.logs)
      setTotal(res.total)
    } catch {
      // not admin
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter])

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(), 0)
    return () => clearTimeout(timer)
  }, [fetchLogs])

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
        <div className="flex gap-2">
          <Input
            placeholder="فیلتر بر اساس عملیات..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPage(0)
            }}
            className="w-48"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>زمان</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>عملیات</TableHead>
                <TableHead>جزئیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
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
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>زمان</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>عملیات</TableHead>
                <TableHead>جزئیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    {formatDate(log.created_at)} {formatTime(log.created_at)}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
