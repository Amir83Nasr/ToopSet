"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
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
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldX,
  XCircle,
  CalendarCheck,
} from "lucide-react"

interface AdminBooking {
  id: number
  user_id: number
  slot_id: number
  status: string
  price_paid: number
  penalty_amount: number | null
  participants_count: number
  created_at: string
  updated_at: string
  expires_at: string | null
  court_name: string
  court_address: string
  user_name: string
  slot_start_time: string | null
  slot_end_time: string | null
}

const statusLabels: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "تایید شده",
  cancelled: "لغو شده",
}

const statusStyles: Record<string, string> = {
  pending_payment: "bg-status-pending-bg text-status-pending",
  confirmed: "bg-status-confirmed-bg text-status-confirmed",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
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

export default function AdminBookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [cancellingBooking, setCancellingBooking] =
    useState<AdminBooking | null>(null)
  const [cancellingLoading, setCancellingLoading] = useState(false)
  const limit = 20

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (statusFilter && statusFilter !== "all")
        params.set("status", statusFilter)
      const res = await api<{ bookings: AdminBooking[]; total: number }>(
        `/api/v1/bookings/all?${params}`
      )
      setBookings(res.bookings)
      setTotal(res.total)
    } catch {
      // not admin or error
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => fetchBookings(), 0)
    return () => clearTimeout(timer)
  }, [fetchBookings])

  async function handleCancelBooking(bookingId: number) {
    setCancellingLoading(true)
    try {
      await api(`/api/v1/bookings/${bookingId}/cancel`, { method: "POST" })
      toast.success("رزرو لغو شد")
      setCancellingBooking(null)
      fetchBookings()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در لغو رزرو"
      toast.error(msg)
    } finally {
      setCancellingLoading(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  // Access denied
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
          <h1 className="text-2xl font-bold tracking-tight">مدیریت رزروها</h1>
          <p className="text-muted-foreground">همه رزروهای سیستم</p>
        </div>
        <div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v)
              setPage(0)
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectGroup>
                <SelectLabel>وضعیت رزرو</SelectLabel>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="pending_payment">
                  در انتظار پرداخت
                </SelectItem>
                <SelectItem value="confirmed">تایید شده</SelectItem>
                <SelectItem value="cancelled">لغو شده</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کاربر</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>ساعت</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-muted p-4">
              <CalendarCheck className="size-10 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">هیچ رزروی یافت نشد</h3>
            <p className="text-sm text-muted-foreground">
              هنوز رزروی در سیستم ثبت نشده است
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کاربر</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>ساعت</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.user_name}</TableCell>
                  <TableCell>{b.court_name}</TableCell>
                  <TableCell>
                    {b.slot_start_time ? formatDate(b.slot_start_time) : "-"}
                  </TableCell>
                  <TableCell>
                    {b.slot_start_time && b.slot_end_time
                      ? `${formatTime(b.slot_start_time)} - ${formatTime(b.slot_end_time)}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("fa-IR").format(b.price_paid)} تومان
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[b.status] || ""}`}
                    >
                      {statusLabels[b.status] || b.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {b.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancellingBooking(b)}
                      >
                        <XCircle className="ml-1 size-4" />
                        لغو
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
        </div>
      )}

      {/* Cancel dialog */}
      <AlertDialog
        open={!!cancellingBooking}
        onOpenChange={(o) => {
          if (!o) setCancellingBooking(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لغو رزرو</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از لغو رزرو {cancellingBooking?.court_name} توسط{" "}
              {cancellingBooking?.user_name} مطمئن هستید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancellingLoading}
              onClick={() =>
                cancellingBooking && handleCancelBooking(cancellingBooking.id)
              }
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancellingLoading ? (
                <>
                  <Loader2 className="ml-1 size-4 animate-spin" /> در حال لغو...
                </>
              ) : (
                "تأیید لغو"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
