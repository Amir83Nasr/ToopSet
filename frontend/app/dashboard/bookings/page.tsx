"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { api, ApiError } from "@/lib/api"
import { usePaginationLimit } from "@/hooks/use-pagination-limit"
import { toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/lib/toast"
import confetti from "canvas-confetti"
import { Input } from "@/components/ui/input"
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
  AlertTriangle,
  CalendarCheck,
  CreditCard,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Booking {
  id: number
  user_id: number
  slot_id: number
  status: "pending_payment" | "confirmed" | "cancelled"
  price_paid: number
  penalty_amount: number | null
  participants_count: number
  created_at: string
  updated_at: string
}

interface BookingDetail extends Booking {
  court_name: string
  court_address: string
  slot_start_time: string | null
  slot_end_time: string | null
  payment: { id: number; status: string } | null
}

const statusLabels: Record<
  string,
  {
    label: string
    variant: "default" | "secondary" | "outline" | "destructive"
  }
> = {
  pending_payment: { label: "در انتظار پرداخت", variant: "outline" },
  confirmed: { label: "تایید شده", variant: "default" },
  cancelled: { label: "لغو شده", variant: "secondary" },
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

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingDetail[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<number | null>(null)
  const [cancellingBooking, setCancellingBooking] =
    useState<BookingDetail | null>(null)
  const [cancellingLoading, setCancellingLoading] = useState(false)
  const [cancelDialogTimestamp, setCancelDialogTimestamp] = useState(0)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const limit = usePaginationLimit()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (debouncedSearch) params.set("search", debouncedSearch)
      const res = await api<{ bookings: BookingDetail[]; total: number }>(
        `/api/v1/bookings?${params}`
      )
      setBookings(res.bookings)
      setTotal(res.total)
    } catch {
      // not authenticated
    } finally {
      setLoading(false)
    }
  }, [page, limit, statusFilter, debouncedSearch])

  useEffect(() => {
    const timer = setTimeout(() => fetchBookings(), 0)
    return () => clearTimeout(timer)
  }, [fetchBookings])

  async function handlePay(bookingId: number) {
    setPayingId(bookingId)
    try {
      await api(`/api/v1/bookings/${bookingId}/pay`, { method: "POST" })
      toast.success("پرداخت با موفقیت انجام شد")
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#06b6d4", "#22c55e", "#eab308"],
      })
      fetchBookings()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در پرداخت"
      toast.error(msg)
    } finally {
      setPayingId(null)
    }
  }

  function getCancelPreview(
    b: BookingDetail,
    now: number
  ): {
    canCancel: boolean
    refundPercent: number
    penaltyPercent: number
    refundAmount: number
    penaltyAmount: number
    reason: string
  } {
    if (!b.slot_start_time) {
      return {
        canCancel: true,
        refundPercent: 100,
        penaltyPercent: 0,
        refundAmount: b.price_paid,
        penaltyAmount: 0,
        reason: "",
      }
    }
    const slotTime = new Date(b.slot_start_time).getTime()
    const hoursUntil = (slotTime - now) / (1000 * 60 * 60)

    if (hoursUntil < 2) {
      return {
        canCancel: false,
        refundPercent: 0,
        penaltyPercent: 0,
        refundAmount: 0,
        penaltyAmount: 0,
        reason: "امکان لغو کمتر از ۲ ساعت مانده به شروع سانس وجود ندارد",
      }
    }
    if (hoursUntil <= 24) {
      const penalty = b.price_paid * 0.5
      return {
        canCancel: true,
        refundPercent: 50,
        penaltyPercent: 50,
        refundAmount: b.price_paid * 0.5,
        penaltyAmount: penalty,
        reason: "لغو بین ۲ تا ۲۴ ساعت قبل: ۵۰٪ جریمه",
      }
    }
    return {
      canCancel: true,
      refundPercent: 100,
      penaltyPercent: 0,
      refundAmount: b.price_paid,
      penaltyAmount: 0,
      reason: "لغو بیش از ۲۴ ساعت قبل: بازگشت کامل وجه",
    }
  }

  function handleCancelClick(b: BookingDetail) {
    setCancellingBooking(b)
    setCancelDialogTimestamp(Date.now())
  }

  async function handleConfirmCancel() {
    if (!cancellingBooking) return
    setCancellingLoading(true)
    try {
      await api(`/api/v1/bookings/${cancellingBooking.id}/cancel`, {
        method: "POST",
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
  const preview = useMemo(
    () =>
      cancellingBooking
        ? getCancelPreview(cancellingBooking, cancelDialogTimestamp)
        : null,
    [cancellingBooking, cancelDialogTimestamp]
  )

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">رزروهای من</h1>
          <p className="text-muted-foreground">مدیریت رزروهای ورزشی شما</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchBookings()}>
          <RefreshCw className="ml-1.5 size-4" />
          بروزرسانی
        </Button>
      </div>

      {/* Search & filter bar */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجوی مجموعه..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <div>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
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
      </div>

      {loading ? (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>مجموعه</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>ساعت</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>تعداد</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
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
            <h3 className="mb-1 text-lg font-semibold">
              {bookings.length === 0
                ? "هنوز رزروی ندارید"
                : "نتیجه‌ای یافت نشد"}
            </h3>
            <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
              {bookings.length === 0
                ? "مجموعه مورد علاقه خود را انتخاب کنید و رزرو نمایید."
                : "با فیلترهای انتخاب شده هیچ رزروی یافت نشد"}
            </p>
            {bookings.length === 0 && (
              <Button asChild>
                <Link href="/dashboard/courts">
                  <CalendarCheck className="ml-2 size-4" />
                  مشاهده مجموعه‌ها
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>مجموعه</TableHead>
                <TableHead className="w-24">تاریخ</TableHead>
                <TableHead className="w-28">ساعت</TableHead>
                <TableHead className="w-28">مبلغ</TableHead>
                <TableHead className="w-16">تعداد</TableHead>
                <TableHead className="w-20">وضعیت</TableHead>
                <TableHead className="w-40 text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => {
                const st = statusLabels[b.status] || {
                  label: b.status,
                  variant: "outline",
                }
                return (
                  <TableRow key={b.id}>
                    <TableCell className="max-w-48 truncate font-medium">
                      {b.court_name}
                    </TableCell>
                    <TableCell>
                      {b.slot_start_time ? formatDate(b.slot_start_time) : "-"}
                    </TableCell>
                    <TableCell>
                      {b.slot_start_time && b.slot_end_time
                        ? `${formatTime(b.slot_start_time)} - ${formatTime(b.slot_end_time)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("fa-IR").format(b.price_paid)}{" "}
                      تومان
                    </TableCell>
                    <TableCell>
                      {toPersianDigits(b.participants_count)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {b.status === "pending_payment" && (
                          <>
                            <Button
                              size="sm"
                              disabled={payingId === b.id}
                              onClick={() => handlePay(b.id)}
                            >
                              {payingId === b.id ? (
                                <Loader2 className="ml-1 size-4 animate-spin" />
                              ) : (
                                <CreditCard className="ml-1 size-4" />
                              )}
                              پرداخت
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelClick(b)}
                            >
                              <XCircle className="ml-1 size-4" />
                              لغو
                            </Button>
                          </>
                        )}
                        {b.status === "confirmed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelClick(b)}
                          >
                            <XCircle className="ml-1 size-4" />
                            لغو
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
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

      {/* Cancel dialog with penalty preview */}
      <AlertDialog
        open={!!cancellingBooking}
        onOpenChange={(o) => {
          if (!o) setCancellingBooking(null)
        }}
      >
        <AlertDialogContent>
          {cancellingBooking && preview && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>لغو رزرو</AlertDialogTitle>
                <AlertDialogDescription>
                  آیا از لغو رزرو {cancellingBooking.court_name} مطمئن هستید؟
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-3 rounded-lg border p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مبلغ پرداختی</span>
                  <span>
                    {new Intl.NumberFormat("fa-IR").format(
                      cancellingBooking.price_paid
                    )}{" "}
                    تومان
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">درصد بازگشت</span>
                  <span
                    className={
                      preview.refundPercent >= 100
                        ? "text-status-confirmed"
                        : "text-status-pending"
                    }
                  >
                    {toPersianDigits(preview.refundPercent)}٪
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مبلغ بازگشتی</span>
                  <span className="font-medium text-status-confirmed">
                    {new Intl.NumberFormat("fa-IR").format(
                      preview.refundAmount
                    )}{" "}
                    تومان
                  </span>
                </div>
                {preview.penaltyAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">جریمه</span>
                    <span className="font-medium text-destructive">
                      {new Intl.NumberFormat("fa-IR").format(
                        preview.penaltyAmount
                      )}{" "}
                      تومان
                    </span>
                  </div>
                )}
                {!preview.canCancel && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>{preview.reason}</span>
                  </div>
                )}
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>انصراف</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!preview.canCancel || cancellingLoading}
                  onClick={handleConfirmCancel}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {cancellingLoading ? (
                    <>
                      <Loader2 className="ml-1 size-4 animate-spin" />
                      در حال لغو...
                    </>
                  ) : (
                    "تأیید لغو"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
