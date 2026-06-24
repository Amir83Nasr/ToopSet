"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits, toEnglishDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { usePaginationLimit } from "@/hooks/use-pagination-limit"
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/lib/toast"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  ShieldX,
  Clock,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface ManagerSlot {
  id: number
  court_id: number
  start_time: string
  end_time: string
  base_price: number
  is_reserved: boolean
  version: number
  court_name: string
  court_address: string
  court_sport_type: string
  booking_id: number | null
  booking_user_name: string | null
  booking_status: string | null
}

interface CourtOption {
  id: number
  name: string
}

const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
  football: "فوتبال",
}

const sportColors: Record<string, string> = {
  volleyball:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  basketball:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  futsal:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  handball:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  football: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
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

function toLocalISO(value: string): string {
  // Extract HH:MM from the datetime-local value
  const d = new Date(value)
  return d.toISOString()
}

function formatForDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ManagerSlotsPage() {
  const { user } = useAuth()
  const [slots, setSlots] = useState<ManagerSlot[]>([])
  const [courts, setCourts] = useState<CourtOption[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [courtFilter, setCourtFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState(true)
  const limit = usePaginationLimit()

  // Edit state
  const [editingSlot, setEditingSlot] = useState<ManagerSlot | null>(null)
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  // Delete state
  const [deletingSlot, setDeletingSlot] = useState<ManagerSlot | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Fetch courts for filter dropdown
  useEffect(() => {
    api<{ courts: CourtOption[] }>("/api/v1/courts?limit=100")
      .then((res) => setCourts(res.courts))
      .catch(() => {})
  }, [])

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (courtFilter && courtFilter !== "all")
        params.set("court_id", courtFilter)
      if (statusFilter === "reserved") params.set("is_reserved", "true")
      else if (statusFilter === "available") params.set("is_reserved", "false")
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)
      const res = await api<{ slots: ManagerSlot[]; total: number }>(
        `/api/v1/manager/slots?${params}`
      )
      setSlots(res.slots)
      setTotal(res.total)
    } catch {
      toast.error("خطا در دریافت سانس‌ها")
    } finally {
      setLoading(false)
    }
  }, [page, limit, courtFilter, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    const timer = setTimeout(() => fetchSlots(), 0)
    return () => clearTimeout(timer)
  }, [fetchSlots])

  function handleEdit(slot: ManagerSlot) {
    setEditingSlot(slot)
    setEditStartTime(formatForDatetimeLocal(slot.start_time))
    setEditEndTime(formatForDatetimeLocal(slot.end_time))
    setEditPrice(String(slot.base_price))
  }

  async function handleSaveEdit() {
    if (!editingSlot) return
    setEditLoading(true)
    try {
      const body: Record<string, string | number> = {}
      const newStart = toLocalISO(editStartTime)
      const newEnd = toLocalISO(editEndTime)
      body.start_time = newStart
      body.end_time = newEnd
      body.base_price = toEnglishDigits(editPrice)

      await api(
        `/api/v1/courts/${editingSlot.court_id}/slots/${editingSlot.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        }
      )
      toast.success("سانس با موفقیت ویرایش شد")
      setEditingSlot(null)
      fetchSlots()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ویرایش سانس"
      toast.error(msg)
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete() {
    if (!deletingSlot) return
    setDeleteLoading(true)
    try {
      await api(
        `/api/v1/courts/${deletingSlot.court_id}/slots/${deletingSlot.id}`,
        { method: "DELETE" }
      )
      toast.success("سانس با موفقیت حذف شد")
      setDeletingSlot(null)
      fetchSlots()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در حذف سانس"
      toast.error(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  // Access denied
  if (user && user.role !== "manager" && user.role !== "admin") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
        <ShieldX className="size-16" />
        <p className="text-xl">شما دسترسی به این بخش را ندارید</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">مدیریت سانس‌ها</h1>
          <p className="text-muted-foreground">
            مشاهده و مدیریت تمام سانس‌های مجموعه‌های شما
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchSlots()}>
            <RefreshCw className="ml-1.5 size-4" />
            بروزرسانی
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex flex-wrap gap-3">
          <div>
            <Select
              value={courtFilter}
              onValueChange={(v) => {
                setCourtFilter(v)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="همه مجموعه‌ها" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectLabel>مجموعه</SelectLabel>
                  <SelectItem value="all">همه مجموعه‌ها</SelectItem>
                  {courts.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectLabel>وضعیت</SelectLabel>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="available">آزاد</SelectItem>
                  <SelectItem value="reserved">رزرو شده</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(0)
              }}
              className="w-full sm:w-40"
              placeholder="از تاریخ"
            />
          </div>
          <div>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(0)
              }}
              className="w-full sm:w-40"
              placeholder="تا تاریخ"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>مجموعه</TableHead>
                <TableHead>ورزش</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>ساعت</TableHead>
                <TableHead>قیمت</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>رزرو شده توسط</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : slots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Clock className="size-10 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">هیچ سانسی یافت نشد</h3>
            <p className="text-sm text-muted-foreground">
              هنوز سانسی برای مجموعه‌های شما ثبت نشده است
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>مجموعه</TableHead>
                <TableHead className="w-20">ورزش</TableHead>
                <TableHead className="w-24">تاریخ</TableHead>
                <TableHead className="w-28">ساعت</TableHead>
                <TableHead className="w-24">قیمت</TableHead>
                <TableHead className="w-24">وضعیت</TableHead>
                <TableHead>رزرو شده توسط</TableHead>
                <TableHead className="w-28 text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="max-w-36 truncate font-medium">
                    {s.court_name}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        sportColors[s.court_sport_type] ||
                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {sportLabels[s.court_sport_type] || s.court_sport_type}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(s.start_time)}</TableCell>
                  <TableCell>
                    {formatTime(s.start_time)} - {formatTime(s.end_time)}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("fa-IR").format(s.base_price)} تومان
                  </TableCell>
                  <TableCell>
                    {s.is_reserved ? (
                      <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        رزرو شده
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        آزاد
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-36 truncate text-muted-foreground">
                    {s.booking_user_name || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(s)}
                        disabled={s.is_reserved}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingSlot(s)}
                        disabled={s.is_reserved}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
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

      {/* Edit dialog */}
      <Dialog
        open={!!editingSlot}
        onOpenChange={(o) => {
          if (!o) setEditingSlot(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ویرایش سانس</DialogTitle>
            <DialogDescription>
              تغییر زمان یا قیمت سانس برای {editingSlot?.court_name || ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">زمان شروع</label>
                <Input
                  type="datetime-local"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">زمان پایان</label>
                <Input
                  type="datetime-local"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">قیمت (تومان)</label>
              <Input
                type="text"
                inputMode="numeric"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSlot(null)}>
              انصراف
            </Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading ? (
                <>
                  <Loader2 className="ml-1 size-4 animate-spin" /> در حال
                  ذخیره...
                </>
              ) : (
                "ذخیره تغییرات"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingSlot}
        onOpenChange={(o) => {
          if (!o) setDeletingSlot(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف سانس</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این سانس مطمئن هستید؟
              <br />
              <span className="text-muted-foreground">
                {deletingSlot
                  ? `${deletingSlot.court_name} — ${formatDate(deletingSlot.start_time)} ${formatTime(deletingSlot.start_time)}`
                  : ""}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteLoading}
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="ml-1 size-4 animate-spin" /> در حال حذف...
                </>
              ) : (
                "تأیید حذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
