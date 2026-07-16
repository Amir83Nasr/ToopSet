"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { usePaginationLimit } from "@/hooks/use-pagination-limit"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookingFilters } from "@/components/bookings/booking-filters"
import { BookingTableSkeleton } from "@/components/bookings/booking-table-skeleton"
import { BookingEmptyState } from "@/components/bookings/booking-empty-state"
import { BookingTable } from "@/components/bookings/booking-table"
import { BookingCancelDialog } from "@/components/bookings/booking-cancel-dialog"
import type {
  BookingCancellationTerms,
  BookingDetail,
} from "@/components/bookings/types"
import { toast } from "@/lib/toast"
import confetti from "canvas-confetti"
import { RefreshCw } from "lucide-react"

type BookingTab = "current" | "past" | "cancelled"

const emptyStateByTab: Record<
  BookingTab,
  { title: string; description: string; showAction: boolean }
> = {
  current: {
    title: "سانس جاری ندارید",
    description: "برای رزرو سانس جدید، مجموعه مورد علاقه خود را انتخاب کنید.",
    showAction: true,
  },
  past: {
    title: "سانس قبلی ندارید",
    description:
      "بعد از برگزاری سانس‌ها، رزروهای تمام‌شده اینجا نمایش داده می‌شوند.",
    showAction: false,
  },
  cancelled: {
    title: "سانس لغوشده ندارید",
    description:
      "رزروهای لغوشده و وضعیت عودت مبلغ آن‌ها اینجا نمایش داده می‌شوند.",
    showAction: false,
  },
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingDetail[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<number | null>(null)
  const [cancellingBooking, setCancellingBooking] =
    useState<BookingDetail | null>(null)
  const [cancelTerms, setCancelTerms] =
    useState<BookingCancellationTerms | null>(null)
  const [cancelCardNumber, setCancelCardNumber] = useState("")
  const [acceptedCancelTerms, setAcceptedCancelTerms] = useState(false)
  const [cancellingLoading, setCancellingLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeTab, setActiveTab] = useState<BookingTab>("current")
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
      params.set("skip", "0")
      params.set("limit", "20")
      const res = await api<{ bookings: BookingDetail[]; total: number }>(
        `/api/v1/bookings?${params}`
      )
      setBookings(res.bookings)
    } catch {
      // not authenticated
    } finally {
      setLoading(false)
    }
  }, [])

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

  async function handleCancelClick(b: BookingDetail) {
    setCancellingBooking(b)
    setCancelTerms(null)
    setCancelCardNumber("")
    setAcceptedCancelTerms(false)
    try {
      const terms = await api<BookingCancellationTerms>(
        `/api/v1/bookings/${b.id}/cancellation-terms`
      )
      setCancelTerms(terms)
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "خطا در دریافت شروط لغو"
      toast.error(msg)
      setCancellingBooking(null)
    }
  }

  async function handleConfirmCancel() {
    if (!cancellingBooking) return
    setCancellingLoading(true)
    try {
      await api(`/api/v1/bookings/${cancellingBooking.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          accepted_terms: acceptedCancelTerms,
          ...(cancelTerms?.requires_bank_card &&
          !cancelTerms.has_verified_bank_card
            ? { card_number: cancelCardNumber.replace(/\D/g, "") }
            : {}),
        }),
      })
      toast.success("رزرو لغو شد")
      setCancellingBooking(null)
      setCancelTerms(null)
      setCancelCardNumber("")
      setAcceptedCancelTerms(false)
      fetchBookings()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در لغو رزرو"
      toast.error(msg)
    } finally {
      setCancellingLoading(false)
    }
  }

  const filteredBookings = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    const now = new Date()

    return bookings.filter((booking) => {
      if (query && !booking.vendor_name.toLowerCase().includes(query)) {
        return false
      }

      const isCancelled =
        booking.status === "cancelled" || booking.status === "expired"
      if (activeTab === "cancelled") return isCancelled
      if (isCancelled) return false

      const slotEnd = booking.slot_end_time
        ? new Date(booking.slot_end_time)
        : null
      if (activeTab === "past") {
        return !!slotEnd && slotEnd <= now
      }
      return !slotEnd || slotEnd > now
    })
  }, [bookings, debouncedSearch, activeTab])

  const tabCounts = useMemo(() => {
    const now = new Date()
    return bookings.reduce(
      (counts, booking) => {
        const isCancelled =
          booking.status === "cancelled" || booking.status === "expired"
        if (isCancelled) {
          counts.cancelled += 1
          return counts
        }
        const slotEnd = booking.slot_end_time
          ? new Date(booking.slot_end_time)
          : null
        if (slotEnd && slotEnd <= now) {
          counts.past += 1
        } else {
          counts.current += 1
        }
        return counts
      },
      { current: 0, past: 0, cancelled: 0 }
    )
  }, [bookings])

  const paginatedBookings = useMemo(() => {
    const start = page * limit
    return filteredBookings.slice(start, start + limit)
  }, [filteredBookings, page, limit])

  const totalPages = Math.ceil(filteredBookings.length / limit)

  function handleTabChange(value: string) {
    setActiveTab(value as BookingTab)
    setPage(0)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">رزروهای من</h1>
          <p className="text-muted-foreground">مدیریت رزروهای ورزشی شما</p>
        </div>
        <Button variant="outline" onClick={() => fetchBookings()}>
          <RefreshCw className="ml-1.5 size-4" />
          بروزرسانی
        </Button>
      </div>

      <BookingFilters search={search} onSearchChange={setSearch} />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-fit gap-x-2">
          <TabsTrigger value="current">
            سانس‌های جاری ({tabCounts.current.toLocaleString("fa-IR")})
          </TabsTrigger>
          <TabsTrigger value="past">
            سانس‌های قبلی ({tabCounts.past.toLocaleString("fa-IR")})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            سانس‌های لغو شده ({tabCounts.cancelled.toLocaleString("fa-IR")})
          </TabsTrigger>
        </TabsList>

        {(["current", "past", "cancelled"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {loading ? (
              <BookingTableSkeleton />
            ) : filteredBookings.length === 0 ? (
              <BookingEmptyState
                hasActiveFilters={!!debouncedSearch}
                title={
                  debouncedSearch ? undefined : emptyStateByTab[activeTab].title
                }
                description={
                  debouncedSearch
                    ? undefined
                    : emptyStateByTab[activeTab].description
                }
                showAction={
                  debouncedSearch
                    ? false
                    : emptyStateByTab[activeTab].showAction
                }
              />
            ) : (
              <BookingTable
                bookings={paginatedBookings}
                totalPages={totalPages}
                page={page}
                onPageChange={setPage}
                payingId={payingId}
                onPay={handlePay}
                onCancelClick={handleCancelClick}
                showRefundStatus={activeTab === "cancelled"}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      <BookingCancelDialog
        booking={cancellingBooking}
        terms={cancelTerms}
        cardNumber={cancelCardNumber}
        acceptedTerms={acceptedCancelTerms}
        onCardNumberChange={setCancelCardNumber}
        onAcceptedTermsChange={setAcceptedCancelTerms}
        onOpenChange={(o) => {
          if (!o) {
            setCancellingBooking(null)
            setCancelTerms(null)
            setCancelCardNumber("")
            setAcceptedCancelTerms(false)
          }
        }}
        onConfirm={handleConfirmCancel}
        loading={cancellingLoading}
      />
    </div>
  )
}
