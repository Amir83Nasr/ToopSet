"use client"

import { useCallback, useEffect, useState } from "react"
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
  const [total, setTotal] = useState(0)
  const [tabCounts, setTabCounts] = useState({
    current: 0,
    past: 0,
    cancelled: 0,
  })
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
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      params.set("category", activeTab)
      if (debouncedSearch) params.set("search", debouncedSearch)
      const res = await api<{
        bookings: BookingDetail[]
        total: number
        category_counts?: Record<BookingTab, number>
      }>(`/api/v1/bookings?${params}`)
      setBookings(res.bookings)
      setTotal(res.total)
      if (res.category_counts) setTabCounts(res.category_counts)
    } catch {
      // not authenticated
    } finally {
      setLoading(false)
    }
  }, [activeTab, debouncedSearch, limit, page])

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
      const result = await api<BookingDetail>(
        `/api/v1/bookings/${cancellingBooking.id}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({
            accepted_terms: acceptedCancelTerms,
            ...(cancelTerms?.requires_bank_card &&
            !cancelTerms.has_verified_bank_card
              ? { card_number: cancelCardNumber.replace(/\D/g, "") }
              : {}),
          }),
        }
      )
      toast.success(
        result.status === "pending_cancellation"
          ? "درخواست ثبت شد؛ رزرو در انتظار جایگزین است"
          : "رزرو لغو شد"
      )
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

  const totalPages = Math.ceil(total / limit)

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
          <RefreshCw className="me-1.5 size-4" />
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
            ) : bookings.length === 0 ? (
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
                bookings={bookings}
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
