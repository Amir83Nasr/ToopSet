"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  XCircle,
  Loader2,
} from "lucide-react"

interface Booking {
  id: number
  user_id: number
  slot_id: number
  status: "pending_payment" | "confirmed" | "cancelled"
  price_paid: number
  penalty_amount: number | null
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

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending_payment: { label: "در انتظار پرداخت", variant: "outline" },
  confirmed: { label: "تایید شده", variant: "default" },
  cancelled: { label: "لغو شده", variant: "secondary" },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingDetail[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<number | null>(null)
  const limit = 20

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ bookings: BookingDetail[]; total: number }>(
        `/api/v1/bookings?skip=${page * limit}&limit=${limit}`
      )
      setBookings(res.bookings)
      setTotal(res.total)
    } catch {
      // not authenticated
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  async function handlePay(bookingId: number) {
    setPayingId(bookingId)
    try {
      await api(`/api/v1/bookings/${bookingId}/pay`, { method: "POST" })
      toast.success("پرداخت با موفقیت انجام شد")
      fetchBookings()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در پرداخت"
      toast.error(msg)
    } finally {
      setPayingId(null)
    }
  }

  async function handleCancel(bookingId: number) {
    try {
      await api(`/api/v1/bookings/${bookingId}/cancel`, { method: "POST" })
      toast.success("رزرو لغو شد")
      fetchBookings()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در لغو رزرو"
      toast.error(msg)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">رزروهای من</h1>
        <p className="text-muted-foreground">مدیریت رزروهای ورزشی شما</p>
      </div>

      {loading ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>زمین</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <CalendarCheck className="size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">هنوز رزروی ندارید</p>
            <Button asChild variant="outline">
              <a href="/dashboard/courts">مشاهده زمین‌ها</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>زمین</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>ساعت</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => {
                const st = statusLabels[b.status] || { label: b.status, variant: "outline" }
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.court_name}</TableCell>
                    <TableCell>{b.slot_start_time ? formatDate(b.slot_start_time) : "-"}</TableCell>
                    <TableCell>
                      {b.slot_start_time && b.slot_end_time
                        ? `${formatTime(b.slot_start_time)} - ${formatTime(b.slot_end_time)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("fa-IR").format(b.price_paid)} تومان
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
                              onClick={() => handleCancel(b.id)}
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
                            onClick={() => handleCancel(b.id)}
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
