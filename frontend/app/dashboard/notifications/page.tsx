"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { toast } from "@/lib/toast"
import {
  Bell,
  CheckCheck,
  Loader2,
  RefreshCw,
  Search,
  Send,
} from "lucide-react"

interface Notification {
  id: number
  user_id: number
  type: string
  message: string
  is_read: boolean
  created_at: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("fa-IR")
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
}

const notificationLabels: Record<string, string> = {
  booking_created: "رزرو جدید",
  booking_confirmed: "تایید رزرو",
  booking_cancelled: "لغو رزرو",
  broadcast: "اعلان همگانی",
}

const notificationColors: Record<string, string> = {
  booking_created: "bg-notif-info-bg text-notif-info",
  booking_confirmed: "bg-notif-success-bg text-notif-success",
  booking_cancelled: "bg-notif-error-bg text-notif-error",
  broadcast: "bg-notif-info-bg text-notif-info",
}

const typeOptions = [
  { value: "booking_created", label: "رزرو جدید" },
  { value: "booking_confirmed", label: "تایید رزرو" },
  { value: "booking_cancelled", label: "لغو رزرو" },
  { value: "broadcast", label: "اعلان همگانی" },
]

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const limit = 20

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  // ── Filters ───────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  // ── Broadcast dialog ──────────────────────────────────────────────────────
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [broadcasting, setBroadcasting] = useState(false)

  // Debounce search input — 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (search) params.set("search", search)
      if (statusFilter === "unread") params.set("unread_only", "true")
      if (typeFilter !== "all") params.set("type", typeFilter)

      const res = await api<{ notifications: Notification[]; total: number }>(
        `/api/v1/notifications?${params}`
      )
      setNotifications(res.notifications)
      setTotal(res.total)
    } catch {
      // not authenticated
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, statusFilter, typeFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications()
    }, 0)
    return () => clearTimeout(timer)
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

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (!broadcastMessage.trim()) return
    setBroadcasting(true)
    try {
      await api("/api/v1/admin/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({ message: broadcastMessage.trim() }),
      })
      toast.success("اعلان همگانی برای همه کاربران ارسال شد")
      setBroadcastMessage("")
      setBroadcastOpen(false)
      // refresh after a short delay so the backend has committed
      setTimeout(() => fetchNotifications(), 500)
    } catch {
      toast.error("خطا در ارسال اعلان همگانی")
    } finally {
      setBroadcasting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)
  const unreadCount = notifications.filter((n) => !n.is_read).length
  const isAdmin = user?.role === "admin"

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">اعلان‌ها</h1>
          <p className="text-muted-foreground">
            {toPersianDigits(total)} اعلان — {toPersianDigits(unreadCount)}{" "}
            خوانده نشده
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications()}
          >
            <RefreshCw className="ml-1.5 size-4" />
            بروزرسانی
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <Loader2 className="ml-2 size-4 animate-spin" />
              ) : (
                <CheckCheck className="ml-2 size-4" />
              )}
              علامت همه
            </Button>
          )}

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBroadcastOpen(true)}
            >
              <Send className="ml-1 size-4" />
              اعلان جدید
            </Button>
          )}
        </div>
      </div>

      {/* Search & filter bar */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجوی اعلان..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="flex gap-2">
            <div>
              <Select
                value={typeFilter}
                onValueChange={(val) => {
                  setTypeFilter(val)
                  setPage(0)
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="نوع اعلان" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    <SelectLabel>نوع اعلان</SelectLabel>
                    <SelectItem value="all">همه</SelectItem>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val)
                  setPage(0)
                }}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="وضعیت" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    <SelectLabel>وضعیت</SelectLabel>
                    <SelectItem value="all">همه</SelectItem>
                    <SelectItem value="unread">خوانده نشده</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نوع</TableHead>
                <TableHead>پیام</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>ساعت</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-60" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-14" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Bell className="size-10 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">
              هیچ اعلانی وجود ندارد
            </h3>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              اعلان‌های مربوط به رزروها و رویدادها در اینجا نمایش داده می‌شوند.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نوع</TableHead>
                <TableHead>پیام</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>ساعت</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((n) => (
                <TableRow key={n.id} className={n.is_read ? "" : "bg-muted/30"}>
                  <TableCell>
                    <Badge
                      className={notificationColors[n.type] || ""}
                      variant="secondary"
                    >
                      {notificationLabels[n.type] || n.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-60">
                    <p className="truncate">{n.message}</p>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDate(n.created_at)}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatTime(n.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={n.is_read ? "outline" : "default"}>
                      {n.is_read ? "خوانده شده" : "جدید"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkRead(n.id)}
                      >
                        <CheckCheck className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-muted-foreground">
                صفحه {toPersianDigits(page + 1)} از{" "}
                {toPersianDigits(totalPages)}
              </p>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      text="قبلی"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setPage((p) => p - 1)
                      }}
                      className={
                        page === 0 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      text="بعدی"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setPage((p) => p + 1)
                      }}
                      className={
                        page >= totalPages - 1
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}

      {/* Broadcast dialog */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="p-3">
            <DialogTitle className="text-lg font-bold">
              اعلان همگانی جدید
            </DialogTitle>
            <DialogDescription>
              پیام خود را وارد کنید. این اعلان برای همه کاربران ارسال خواهد شد.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBroadcast} className="space-y-4">
            <Textarea
              id="broadcast-msg"
              placeholder="متن اعلان را وارد کنید..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={4}
              required
              autoFocus
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBroadcastOpen(false)
                  setBroadcastMessage("")
                }}
                disabled={broadcasting}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                disabled={broadcasting || !broadcastMessage.trim()}
              >
                {broadcasting ? (
                  <>
                    <Loader2 className="ml-1 size-4 animate-spin" />
                    در حال ارسال...
                  </>
                ) : (
                  <>
                    <Send className="ml-1 size-4" />
                    ارسال برای همه
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
