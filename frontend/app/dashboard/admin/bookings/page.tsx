"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
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
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@/components/ui/responsive-alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/lib/toast"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"
import {
  Loader2,
  ShieldX,
  XCircle,
  CalendarCheck,
  RefreshCw,
} from "lucide-react"
import { TablePagination } from "@/components/ui/pagination"
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from "@/lib/constants"

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
  vendor_name: string
  vendor_address: string
  user_name: string
  user_phone: string
  slot_start_time: string | null
  slot_end_time: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR", { weekday: "long" })
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
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])
  const [cancellingBooking, setCancellingBooking] =
    useState<AdminBooking | null>(null)
  const [cancellingLoading, setCancellingLoading] = useState(false)
  const limit = usePaginationLimit()

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (statusFilter && statusFilter !== "all")
        params.set("status", statusFilter)
      if (debouncedSearch) params.set("search", debouncedSearch)
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
  }, [page, limit, statusFilter, debouncedSearch])

  useEffect(() => {
    const timer = setTimeout(() => fetchBookings(), 0)
    return () => clearTimeout(timer)
  }, [fetchBookings])

  async function handleCancelBooking(bookingId: number) {
    setCancellingLoading(true)
    try {
      await api(`/api/v1/manager/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          release_slot: true,
          reason: "لغو رزرو توسط مدیر سامانه",
        }),
      })
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">مدیریت رزروها</h1>
          <p className="text-muted-foreground">همه رزروهای سیستم</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchBookings()}>
            <RefreshCw className="me-1.5 size-4" />
            بروزرسانی
          </Button>
        </div>
      </div>

      {/* Search & filter bar */}
      <DataTableToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جستجوی کاربر یا مجموعه..."
        />
        <div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v)
              setPage(0)
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent>
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
      </DataTableToolbar>

      {loading ? (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">کاربر</TableHead>
                <TableHead className="w-28 text-right">شماره تماس</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>روز</TableHead>
                <TableHead>ساعت</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
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
                <TableHead className="w-44">کاربر</TableHead>
                <TableHead className="w-36 text-right">شماره تماس</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead className="w-24">تاریخ</TableHead>
                <TableHead className="w-20">روز</TableHead>
                <TableHead className="w-28">ساعت</TableHead>
                <TableHead className="w-28">مبلغ</TableHead>
                <TableHead className="w-20">وضعیت</TableHead>
                <TableHead className="w-32 text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <span className="text-sm font-medium">{b.user_name}</span>
                  </TableCell>
                  <TableCell
                    dir="ltr"
                    className="text-right text-sm text-muted-foreground"
                  >
                    {toPersianDigits(b.user_phone)}
                  </TableCell>
                  <TableCell className="max-w-48 truncate">
                    {b.vendor_name}
                  </TableCell>
                  <TableCell>
                    {b.slot_start_time ? formatDate(b.slot_start_time) : "-"}
                  </TableCell>
                  <TableCell>
                    {b.slot_start_time ? formatWeekday(b.slot_start_time) : "-"}
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
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${BOOKING_STATUS_STYLES[b.status] || ""}`}
                    >
                      {BOOKING_STATUS_LABELS[b.status]?.label || b.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {b.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancellingBooking(b)}
                      >
                        <XCircle className="me-1 size-4" />
                        لغو
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
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Cancel dialog */}
      <ResponsiveAlertDialog
        open={!!cancellingBooking}
        onOpenChange={(o) => {
          if (!o) setCancellingBooking(null)
        }}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>لغو رزرو</ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              آیا از لغو رزرو {cancellingBooking?.vendor_name} توسط{" "}
              {cancellingBooking?.user_name} مطمئن هستید؟
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>انصراف</ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              variant="destructive"
              disabled={cancellingLoading}
              onClick={() =>
                cancellingBooking && handleCancelBooking(cancellingBooking.id)
              }
            >
              {cancellingLoading ? (
                <>
                  <Loader2 className="me-1 size-4 animate-spin" /> در حال لغو...
                </>
              ) : (
                "تأیید لغو"
              )}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </div>
  )
}
