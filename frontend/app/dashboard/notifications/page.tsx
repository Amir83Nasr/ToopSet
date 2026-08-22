"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { NotificationFilters } from "@/components/notifications/notification-filters"
import { NotificationTableSkeleton } from "@/components/notifications/notification-table-skeleton"
import { NotificationEmptyState } from "@/components/notifications/notification-empty-state"
import { NotificationTable } from "@/components/notifications/notification-table"
import { NotificationBroadcastDialog } from "@/components/notifications/notification-broadcast-dialog"
import { toast } from "@/lib/toast"
import { CheckCheck, Loader2, Send } from "lucide-react"
import { MobileBackButton } from "@/components/dashboard/mobile-back-button"

interface Notification {
  id: number
  user_id: number
  type: string
  message: string
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const limit = 20

  // ── Search ──
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  // ── Filters ──
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  // ── Broadcast dialog ──
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

  async function handleBroadcast() {
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            اعلان‌ها
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {toPersianDigits(total)} اعلان — {toPersianDigits(unreadCount)}{" "}
            خوانده نشده
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MobileBackButton />

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <Loader2 className="me-1.5 size-4 animate-spin" />
              ) : (
                <CheckCheck className="me-1.5 size-4" />
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
              <Send className="me-1 size-4" />
              اعلان جدید
            </Button>
          )}
        </div>
      </div>

      {/* Search & filter bar */}
      <NotificationFilters
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        typeFilter={typeFilter}
        onTypeFilterChange={(val) => {
          setTypeFilter(val)
          setPage(0)
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          setStatusFilter(val)
          setPage(0)
        }}
      />

      {loading ? (
        <NotificationTableSkeleton />
      ) : notifications.length === 0 ? (
        <NotificationEmptyState />
      ) : (
        <NotificationTable
          notifications={notifications}
          totalPages={totalPages}
          page={page}
          onPageChange={setPage}
          onMarkRead={handleMarkRead}
        />
      )}

      {/* Broadcast dialog */}
      <NotificationBroadcastDialog
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
        message={broadcastMessage}
        onMessageChange={setBroadcastMessage}
        onSend={handleBroadcast}
        broadcasting={broadcasting}
      />
    </div>
  )
}
