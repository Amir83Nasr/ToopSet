"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { usePaginationLimit } from "@/hooks/use-pagination-limit"
import { Button } from "@/components/ui/button"
import { BookingFilters } from "@/components/bookings/booking-filters"
import { BookingTableSkeleton } from "@/components/bookings/booking-table-skeleton"
import { BookingEmptyState } from "@/components/bookings/booking-empty-state"
import { BookingTable } from "@/components/bookings/booking-table"
import { BookingCancelDialog } from "@/components/bookings/booking-cancel-dialog"
import type { BookingDetail } from "@/components/bookings/types"
import { toast } from "@/lib/toast"
import confetti from "canvas-confetti"
import { RefreshCw } from "lucide-react"

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingDetail[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<number | null>(null)
  const [cancellingBooking, setCancellingBooking] =
    useState<BookingDetail | null>(null)
  const [cancellingLoading, setCancellingLoading] = useState(false)
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

  function handleCancelClick(b: BookingDetail) {
    setCancellingBooking(b)
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

      <BookingFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          setStatusFilter(val)
          setPage(0)
        }}
      />

      {loading ? (
        <BookingTableSkeleton />
      ) : bookings.length === 0 ? (
        <BookingEmptyState hasActiveFilters={!!debouncedSearch} />
      ) : (
        <BookingTable
          bookings={bookings}
          totalPages={totalPages}
          page={page}
          onPageChange={setPage}
          payingId={payingId}
          onPay={handlePay}
          onCancelClick={handleCancelClick}
        />
      )}

      <BookingCancelDialog
        booking={cancellingBooking}
        onOpenChange={(o) => {
          if (!o) setCancellingBooking(null)
        }}
        onConfirm={handleConfirmCancel}
        loading={cancellingLoading}
      />
    </div>
  )
}
