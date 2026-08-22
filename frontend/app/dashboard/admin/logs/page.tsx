"use client"

import { useCallback, useEffect, useState } from "react"
import * as React from "react"
import { api } from "@/lib/api"
import {
  toPersianDigits,
  toLocalDateStr,
  todayStr,
  formatPersianDate,
} from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { usePaginationLimit } from "@/hooks/use-pagination-limit"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TablePagination } from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/lib/toast"
import { ShieldX, History, Trash2, X } from "lucide-react"
import { MobileBackButton } from "@/components/dashboard/mobile-back-button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
  ResponsiveAlertDialogTrigger,
} from "@/components/ui/responsive-alert-dialog"

interface LogEntry {
  id: number
  user_id: number | null
  user_name: string | null
  action: string
  details: string | null
  created_at: string
}

function formatDate(iso: string): string {
  const normalized = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z"
  return formatPersianDate(normalized)
}

function formatTime(iso: string): string {
  const normalized = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z"
  return new Date(normalized).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
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
  user_registered: "ثبت‌نام کاربر",
  user_login: "ورود کاربر",
  vendor_created: "ایجاد مجموعه",
  vendor_updated: "ویرایش مجموعه",
  vendor_deleted: "حذف مجموعه",
  vendor_hard_deleted: "حذف دائمی مجموعه",
  vendor_toggled: "تغییر وضعیت مجموعه",
  vendor_approved: "تایید مجموعه",
  vendor_rejected: "رد مجموعه",
  review_deleted: "حذف نظر",
  setting_updated: "ویرایش تنظیمات",
  settings_seeded: "مقداردهی تنظیمات",
  profile_updated: "ویرایش پروفایل",
  avatar_updated: "تغییر تصویر پروفایل",
  avatar_deleted: "حذف تصویر پروفایل",
  payment_failed: "پرداخت ناموفق",
  penalty_created: "جریمه لغو رزرو",
  wallet_credited: "بازگشت وجه به کیف پول",
  logs_cleared: "پاکسازی لاگ‌ها",
  hero_image_uploaded: "آپلود تصویر لاگین",
  hero_image_deleted: "حذف تصویر لاگین",
}

const actionGroups: { label: string; actions: string[] }[] = [
  {
    label: "رزروها",
    actions: ["booking_created", "booking_cancelled", "booking_confirmed"],
  },
  {
    label: "کاربران",
    actions: [
      "user_role_changed",
      "user_toggled",
      "user_created",
      "user_deleted",
      "user_registered",
      "user_login",
    ],
  },
  {
    label: "مجموعه‌ها",
    actions: [
      "vendor_created",
      "vendor_updated",
      "vendor_deleted",
      "vendor_hard_deleted",
      "vendor_toggled",
      "vendor_approved",
      "vendor_rejected",
    ],
  },
  {
    label: "مالی",
    actions: ["payment_failed", "penalty_created", "wallet_credited"],
  },
  {
    label: "پروفایل",
    actions: ["profile_updated", "avatar_updated", "avatar_deleted"],
  },
  {
    label: "سیستم",
    actions: [
      "broadcast",
      "review_deleted",
      "setting_updated",
      "settings_seeded",
      "logs_cleared",
      "hero_image_uploaded",
      "hero_image_deleted",
    ],
  },
]

export default function AdminLogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState(todayStr())
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const limit = usePaginationLimit()

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (actionFilter) params.set("action", actionFilter)
      if (dateFrom) params.set("date_from", dateFrom + "T00:00:00")
      if (dateTo) params.set("date_to", dateTo + "T23:59:59")
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
  }, [page, limit, actionFilter, dateFrom, dateTo])

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(), 0)
    return () => clearTimeout(timer)
  }, [fetchLogs])

  const handleDelete = async () => {
    if (deletingLogId === null) return
    setDeleteDialogOpen(false)
    try {
      await api(`/api/v1/admin/logs/${deletingLogId}`, { method: "DELETE" })
      toast.success("لاگ با موفقیت حذف شد")
      setDeletingLogId(null)
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
          <div>
            <Select
              value={actionFilter}
              onValueChange={(val) => {
                setActionFilter(val === "all" ? "" : val)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="همه عملیات" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>همه</SelectLabel>
                  <SelectItem value="all">همه عملیات</SelectItem>
                </SelectGroup>
                {actionGroups.map((group) => (
                  <React.Fragment key={group.label}>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.actions.map((key) => (
                        <SelectItem key={key} value={key}>
                          {actionLabels[key]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            className="w-fit"
          />

          {hasActiveFilter && (
            <Button variant="outline" onClick={clearFilters}>
              <X className="me-1.5 size-4" />
              حذف فیلتر
            </Button>
          )}

          <MobileBackButton />

          <ResponsiveAlertDialog
            open={clearDialogOpen}
            onOpenChange={setClearDialogOpen}
          >
            <ResponsiveAlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="me-1.5 size-4" />
                پاکسازی همه
              </Button>
            </ResponsiveAlertDialogTrigger>
            <ResponsiveAlertDialogContent>
              <ResponsiveAlertDialogHeader>
                <ResponsiveAlertDialogTitle>
                  پاکسازی لاگ‌ها
                </ResponsiveAlertDialogTitle>
                <ResponsiveAlertDialogDescription>
                  آیا از پاکسازی تمام لاگ‌ها اطمینان دارید؟ این عمل قابل بازگشت
                  نیست.
                </ResponsiveAlertDialogDescription>
              </ResponsiveAlertDialogHeader>
              <ResponsiveAlertDialogFooter>
                <ResponsiveAlertDialogCancel>
                  انصراف
                </ResponsiveAlertDialogCancel>
                <ResponsiveAlertDialogAction
                  onClick={handleClearAll}
                  variant="destructive"
                >
                  پاکسازی همه
                </ResponsiveAlertDialogAction>
              </ResponsiveAlertDialogFooter>
            </ResponsiveAlertDialogContent>
          </ResponsiveAlertDialog>
        </div>
      </div>

      <ResponsiveAlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>حذف لاگ</ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              آیا از حذف این لاگ اطمینان دارید؟ این عمل قابل بازگشت نیست.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>انصراف</ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              onClick={handleDelete}
              variant="destructive"
            >
              حذف
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>

      {loading ? (
        <div>
          <Table className="min-w-270 table-fixed">
            <colgroup>
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-40" />
              <col className="w-44" />
              <col className="w-72" />
              <col className="w-20" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">تاریخ</TableHead>
                <TableHead className="text-center">ساعت</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead className="text-center">رویداد</TableHead>
                <TableHead>جزئیات</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell
                      key={j}
                      className={
                        j < 2 || j === 3 || j === 5 ? "text-center" : ""
                      }
                    >
                      <Skeleton
                        className={
                          j < 2 || j === 3 || j === 5
                            ? "mx-auto h-4 w-24"
                            : "h-4 w-24"
                        }
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <History className="mb-4 size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              {hasActiveFilter
                ? "رویدادی با فیلترهای انتخاب شده یافت نشد"
                : "رویدادی ثبت نشده است"}
            </p>
            {hasActiveFilter && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                حذف فیلترها
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-270 table-fixed">
              <colgroup>
                <col className="w-28" />
                <col className="w-24" />
                <col className="w-40" />
                <col className="w-44" />
                <col className="w-72" />
                <col className="w-20" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">تاریخ</TableHead>
                  <TableHead className="text-center">ساعت</TableHead>
                  <TableHead>کاربر</TableHead>
                  <TableHead className="text-center">رویداد</TableHead>
                  <TableHead>جزئیات</TableHead>
                  <TableHead className="text-center">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-center text-sm whitespace-nowrap text-muted-foreground">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell className="text-center text-sm whitespace-nowrap text-muted-foreground">
                      <span dir="ltr" className="inline-block">
                        {formatTime(log.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.user_name ||
                        (log.user_id ? toPersianDigits(log.user_id) : "سیستم")}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </TableCell>
                    <TableCell className="truncate text-sm text-muted-foreground">
                      {log.details ? toPersianDigits(log.details) : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => {
                              setDeletingLogId(log.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>حذف لاگ</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
