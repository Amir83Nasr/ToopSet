"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { Bell, ChevronLeft, ChevronRight, CheckCheck, Loader2 } from "lucide-react"

interface Notification {
  id: number
  user_id: number
  type: string
  message: string
  is_read: boolean
  created_at: string
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString("fa-IR")} ${d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`
}

const notificationLabels: Record<string, string> = {
  booking_created: "رزرو جدید",
  booking_confirmed: "تایید رزرو",
  booking_cancelled: "لغو رزرو",
}

const notificationColors: Record<string, string> = {
  booking_created: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  booking_confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  booking_cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const limit = 20

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ notifications: Notification[]; total: number }>(
        `/api/v1/notifications?skip=${page * limit}&limit=${limit}`
      )
      setNotifications(res.notifications)
      setTotal(res.total)
    } catch {
      // not authenticated
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  async function handleMarkRead(id: number) {
    try {
      await api(`/api/v1/notifications/${id}/read`, { method: "POST" })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch {
      toast.error("خطا در به‌روزرسانی")
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      await api("/api/v1/notifications/read-all", { method: "POST" })
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      toast.success("همه اعلان‌ها به عنوان خوانده شده علامت خوردند")
    } catch {
      toast.error("خطا در به‌روزرسانی")
    } finally {
      setMarkingAll(false)
    }
  }

  const totalPages = Math.ceil(total / limit)
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">اعلان‌ها</h1>
          <p className="text-muted-foreground">
            {toPersianDigits(total)} اعلان — {toPersianDigits(unreadCount)} خوانده نشده
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markingAll}>
            {markingAll ? (
              <Loader2 className="ml-2 size-4 animate-spin" />
            ) : (
              <CheckCheck className="ml-2 size-4" />
            )}
            علامت همه به عنوان خوانده شده
          </Button>
        )}
      </div>

      {loading ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نوع</TableHead>
                <TableHead>پیام</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-60" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 rounded-md" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Bell className="size-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">هیچ اعلانی وجود ندارد</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              اعلان‌های مربوط به رزروها و رویدادها در اینجا نمایش داده می‌شوند.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نوع</TableHead>
                <TableHead>پیام</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((n) => (
                <TableRow key={n.id} className={n.is_read ? "" : "bg-muted/30"}>
                  <TableCell>
                    <Badge className={notificationColors[n.type] || ""} variant="secondary">
                      {notificationLabels[n.type] || n.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="truncate">{n.message}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(n.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={n.is_read ? "outline" : "default"}>
                      {n.is_read ? "خوانده شده" : "جدید"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!n.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => handleMarkRead(n.id)}>
                        <CheckCheck className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                صفحه {toPersianDigits(page + 1)} از {toPersianDigits(totalPages)}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronRight className="ml-1 size-4" />
                  قبلی
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  بعدی
                  <ChevronLeft className="mr-1 size-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
