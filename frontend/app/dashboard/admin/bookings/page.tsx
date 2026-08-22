"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toPersianDigits, formatPrice, formatPersianDate } from "@/lib/utils"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"
import { ShieldX, CalendarCheck } from "lucide-react"
import { MobileBackButton } from "@/components/dashboard/mobile-back-button"
import { TablePagination } from "@/components/ui/pagination"
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from "@/lib/constants"

interface AdminBooking {
  id: number
  user_id: number
  slot_id: number
  status: string
  price_paid: number
  penalty_amount: number | null
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
  return formatPersianDate(iso)
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
        <MobileBackButton />
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
          <Table className="min-w-285 table-fixed">
            <colgroup>
              <col className="w-44" />
              <col className="w-36" />
              <col className="w-52" />
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-36" />
              <col className="w-36" />
              <col className="w-28" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>کاربر</TableHead>
                <TableHead className="text-center">شماره تماس</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead className="text-center">تاریخ</TableHead>
                <TableHead className="text-center">روز</TableHead>
                <TableHead className="text-center">ساعت</TableHead>
                <TableHead className="text-center">مبلغ</TableHead>
                <TableHead className="text-center">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j} className={j > 2 ? "text-center" : ""}>
                      <Skeleton
                        className={j > 2 ? "mx-auto h-4 w-20" : "h-4 w-20"}
                      />
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
          <Table className="min-w-285 table-fixed">
            <colgroup>
              <col className="w-44" />
              <col className="w-36" />
              <col className="w-52" />
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-36" />
              <col className="w-36" />
              <col className="w-28" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>کاربر</TableHead>
                <TableHead className="text-center">شماره تماس</TableHead>
                <TableHead>مجموعه</TableHead>
                <TableHead className="text-center">تاریخ</TableHead>
                <TableHead className="text-center">روز</TableHead>
                <TableHead className="text-center">ساعت</TableHead>
                <TableHead className="text-center">مبلغ</TableHead>
                <TableHead className="text-center">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <span className="text-sm font-medium">{b.user_name}</span>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    <span dir="ltr" className="inline-block">
                      {toPersianDigits(b.user_phone)}
                    </span>
                  </TableCell>
                  <TableCell className="truncate">{b.vendor_name}</TableCell>
                  <TableCell className="text-center">
                    {b.slot_start_time ? formatDate(b.slot_start_time) : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {b.slot_start_time ? formatWeekday(b.slot_start_time) : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <span dir="ltr" className="inline-block">
                      {b.slot_start_time && b.slot_end_time
                        ? `${formatTime(b.slot_start_time)} - ${formatTime(b.slot_end_time)}`
                        : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {formatPrice(b.price_paid)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${BOOKING_STATUS_STYLES[b.status] || ""}`}
                    >
                      {BOOKING_STATUS_LABELS[b.status]?.label || b.status}
                    </span>
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
    </div>
  )
}
