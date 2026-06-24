"use client"

import { toPersianDigits } from "@/lib/utils"
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-muted-foreground">
            صفحه {toPersianDigits(page + 1)} از {toPersianDigits(totalPages)}
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  text="قبلی"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    onPageChange(page - 1)
                  }}
                  className={page === 0 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  text="بعدی"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    onPageChange(page + 1)
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
  )
}
