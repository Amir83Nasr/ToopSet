"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablePagination } from "@/components/ui/pagination"
import { CheckCheck } from "lucide-react"

/* ── Helpers ── */

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("fa-IR")
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
}

/* ── Type-specific labels/colors ── */

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

/* ── Types ── */

interface Notification {
  id: number
  user_id: number
  type: string
  message: string
  is_read: boolean
  created_at: string
}

/* ── Props ── */

interface NotificationTableProps {
  notifications: Notification[]
  totalPages: number
  page: number
  onPageChange: (page: number) => void
  onMarkRead: (id: number) => void
}

export function NotificationTable({
  notifications,
  totalPages,
  page,
  onPageChange,
  onMarkRead,
}: NotificationTableProps) {
  return (
    <div>
      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={cn(
              "flex flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/10",
              !n.is_read && "bg-muted/30"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <Badge
                className={notificationColors[n.type] || ""}
                variant="secondary"
              >
                {notificationLabels[n.type] || n.type}
              </Badge>
              <Badge variant={n.is_read ? "outline" : "default"}>
                {n.is_read ? "خوانده شده" : "جدید"}
              </Badge>
            </div>

            <p className="text-sm leading-relaxed">{n.message}</p>

            <div className="flex items-center justify-between gap-2 border-t pt-3">
              <span className="text-xs text-muted-foreground">
                {formatDate(n.created_at)} · {formatTime(n.created_at)}
              </span>
              {!n.is_read && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMarkRead(n.id)}
                >
                  <CheckCheck className="ml-1 size-4" />
                  خواندم
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop / tablet: full data table */}
      <Table tableWrapperClassName="hidden md:block">
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
                    size="icon-sm"
                    onClick={() => onMarkRead(n.id)}
                  >
                    <CheckCheck className="size-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  )
}
