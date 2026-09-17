"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm, useWatch, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { vendorUpdateSchema, type VendorUpdateInput } from "@/lib/validations"
import { api, ApiError } from "@/lib/api"
import { toEnglishDigits, toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/lib/toast"
import type { VendorData } from "@/components/vendors/vendor-shared"
import type {
  FinanceBooking,
  FinanceSummary,
  VendorSettlement,
} from "@/components/vendors/dashboard/vendor-utils"
import {
  getWeekDays,
  formatPersianDate,
} from "@/components/dashboard/schedule/utils"
import { VendorHeader } from "@/components/vendors/dashboard/vendor-header"
import { VendorDetailsTab } from "@/components/vendors/dashboard/vendor-details-tab"
import { VendorScheduleTab } from "@/components/vendors/dashboard/vendor-schedule-tab"
import { VendorFinanceTab } from "@/components/vendors/dashboard/vendor-finance-tab"
import { VendorReviewsTab } from "@/components/vendors/dashboard/vendor-reviews-tab"
import {
  Building2,
  CalendarDays,
  ArrowRight,
  MessageSquareText,
  Wallet,
} from "lucide-react"

export default function DashboardVendorEditPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const vendorId = Number(params.id)

  const [vendor, setVendor] = useState<VendorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("schedule")

  // Slot state

  // Delete vendor
  // Week navigation (shared between schedule + finance tabs)
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date()
    const daysSinceSaturday = (today.getDay() + 1) % 7
    const saturday = new Date(today)
    saturday.setDate(today.getDate() - daysSinceSaturday)
    return saturday
  })

  // Finance state
  const [financeBookings, setFinanceBookings] = useState<FinanceBooking[]>([])
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(
    null
  )
  const [financeLoading, setFinanceLoading] = useState(false)
  const [settlementRequesting, setSettlementRequesting] = useState(false)
  const [settlements, setSettlements] = useState<VendorSettlement[]>([])

  // Image state
  const [vendorImages, setVendorImages] = useState<string[]>([])
  const [imageTempIds, setImageTempIds] = useState<string[]>([])

  // Form
  const form = useForm<VendorUpdateInput>({
    resolver: zodResolver(vendorUpdateSchema) as Resolver<VendorUpdateInput>,
    defaultValues: {
      name: "",
      sport_types: [],
      address: "",
      latitude: undefined,
      longitude: undefined,
      capacity: 10,
      amenities: {},
      ball_available: false,
      ball_price: 0,
      manager_name: "",
      manager_phone: "",
    },
  })
  const watchSportTypes =
    (useWatch({ control: form.control, name: "sport_types" }) as string[]) || []
  const latitudeWatch = useWatch({ control: form.control, name: "latitude" })
  const longitudeWatch = useWatch({ control: form.control, name: "longitude" })

  const canManage = user?.role === "manager" || user?.role === "admin"

  // Week helpers
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const weekLabel = useMemo(() => {
    if (weekDays.length === 0) return ""
    const from = formatPersianDate(weekDays[0])
    const to = formatPersianDate(weekDays[6])
    return `${from} — ${to}`
  }, [weekDays])

  function goNextWeek() {
    setWeekStart((prev) => {
      const next = new Date(prev)
      next.setDate(next.getDate() + 7)
      return next
    })
  }

  function goPrevWeek() {
    setWeekStart((prev) => {
      const p = new Date(prev)
      p.setDate(p.getDate() - 7)
      return p
    })
  }

  function goThisWeek() {
    const today = new Date()
    const daysSinceSaturday = (today.getDay() + 1) % 7
    const saturday = new Date(today)
    saturday.setDate(today.getDate() - daysSinceSaturday)
    setWeekStart(saturday)
  }

  // ── Fetch data ──

  const fetchData = useCallback(async () => {
    try {
      const vendorRes = await api<VendorData>(`/api/v1/vendors/${vendorId}`)
      setVendor(vendorRes)
      form.reset({
        name: vendorRes.name,
        sport_types: vendorRes.sport_types as VendorUpdateInput["sport_types"],
        address: vendorRes.address ? toPersianDigits(vendorRes.address) : "",
        latitude: vendorRes.latitude,
        longitude: vendorRes.longitude,
        capacity: vendorRes.capacity,
        amenities: vendorRes.amenities || {},
        ball_available: vendorRes.ball_available,
        ball_price: vendorRes.ball_available ? vendorRes.ball_price : 0,
        manager_name: vendorRes.manager_name || "",
        manager_phone: vendorRes.manager_phone || "",
      })
      setVendorImages(vendorRes.images || [])
      setImageTempIds(Array(vendorRes.images?.length || 0).fill(""))
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true)
      else toast.error("خطا در دریافت اطلاعات")
    } finally {
      setLoading(false)
    }
  }, [vendorId, form])

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0)
    return () => clearTimeout(timer)
  }, [fetchData])

  // ── Finance fetch ──

  const fetchFinance = useCallback(async () => {
    if (!canManage) return
    setFinanceLoading(true)
    try {
      const [summary, history, financeBookingResult] = await Promise.all([
        api<FinanceSummary>(
          `/api/v1/manager/finance/summary?vendor_id=${vendorId}`
        ),
        api<{ settlements: VendorSettlement[] }>("/api/v1/manager/settlements"),
        api<{ bookings: FinanceBooking[]; total: number }>(
          `/api/v1/manager/bookings?finance_only=true&vendor_id=${vendorId}&limit=100`
        ),
      ])
      setFinanceSummary(summary)
      setFinanceBookings(financeBookingResult.bookings)
      setSettlements(
        history.settlements.filter((item) => item.vendor_id === vendorId)
      )
    } catch {
      toast.error("خطا در دریافت اطلاعات مالی")
    } finally {
      setFinanceLoading(false)
    }
  }, [vendorId, canManage])

  useEffect(() => {
    const timer = setTimeout(() => fetchFinance(), 0)
    return () => clearTimeout(timer)
  }, [fetchFinance])

  // ── Form submit ──

  async function onSubmit(data: VendorUpdateInput) {
    setSaving(true)
    try {
      const managerName = data.manager_name?.trim()
      const managerPhone = data.manager_phone
        ? toEnglishDigits(data.manager_phone).trim()
        : ""
      await api(`/api/v1/vendors/${vendorId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...data,
          manager_name: managerName || undefined,
          manager_phone: managerPhone || undefined,
          images: vendorImages,
          temp_ids: imageTempIds.filter(Boolean),
        }),
      })
      toast.success("تغییرات با موفقیت ذخیره شد")
      setImageTempIds([])
      fetchData()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ذخیره تغییرات"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Settlement request ──

  async function handleRequestSettlement() {
    setSettlementRequesting(true)
    try {
      await api("/api/v1/manager/settlements", {
        method: "POST",
        body: JSON.stringify({ vendor_id: vendorId }),
      })
      toast.success("درخواست تسویه ثبت شد")
      fetchFinance()
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "خطا در ثبت درخواست تسویه"
      toast.error(msg)
    } finally {
      setSettlementRequesting(false)
    }
  }

  // ── Loading / 404 ──

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-125 w-full" />
      </div>
    )
  }

  if (notFound || !vendor) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-xl text-muted-foreground">
          مجموعه مورد نظر یافت نشد
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/vendors")}
        >
          <ArrowRight className="me-2 size-4" />
          بازگشت به لیست
        </Button>
      </div>
    )
  }

  const isFormValid = watchSportTypes.length > 0

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-6">
      <VendorHeader
        vendorId={vendorId}
        vendorName={vendor.name}
        activeTab={activeTab}
        saving={saving}
        isFormValid={isFormValid}
        isSubmitting={form.formState.isSubmitting}
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="min-w-0 flex-1"
      >
        <TabsList className="grid h-auto! w-full grid-cols-2 gap-1 self-start sm:inline-flex sm:w-fit sm:grid-cols-none">
          <TabsTrigger
            value="basic"
            className="h-11 gap-1.5 px-2 py-2 text-sm sm:gap-2.5 sm:px-6 sm:py-3 sm:text-base"
          >
            <Building2 className="size-4 sm:size-5" />
            مشخصات
          </TabsTrigger>
          <TabsTrigger
            value="schedule"
            className="h-11 gap-1.5 px-2 py-2 text-sm sm:gap-2.5 sm:px-6 sm:py-3 sm:text-base"
          >
            <CalendarDays className="size-4 sm:size-5" />
            زمان‌بندی
          </TabsTrigger>
          {canManage && (
            <>
              <TabsTrigger
                value="finance"
                className="h-11 gap-1.5 px-2 py-2 text-sm sm:gap-2.5 sm:px-6 sm:py-3 sm:text-base"
              >
                <Wallet className="size-4 sm:size-5" />
                مالی
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="h-11 gap-1.5 px-2 py-2 text-sm sm:gap-2.5 sm:px-6 sm:py-3 sm:text-base"
              >
                <MessageSquareText className="size-4 sm:size-5" />
                نظرات
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="basic" className="mt-4 min-w-0 flex-1 sm:mt-8">
          <VendorDetailsTab
            vendor={vendor}
            form={form}
            watchSportTypes={watchSportTypes}
            latitudeWatch={latitudeWatch}
            longitudeWatch={longitudeWatch}
            vendorImages={vendorImages}
            imageTempIds={imageTempIds}
            onImagesChange={setVendorImages}
            onTempIdsChange={setImageTempIds}
            onSubmit={onSubmit}
          />
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 min-w-0 flex-1 sm:mt-8">
          <VendorScheduleTab
            vendorId={vendorId}
            weekStart={weekStart}
            weekLabel={weekLabel}
            canManage={canManage}
            onPrevWeek={goPrevWeek}
            onNextWeek={goNextWeek}
            onThisWeek={goThisWeek}
            onRefresh={fetchData}
          />
        </TabsContent>

        {canManage && (
          <>
            <TabsContent
              value="finance"
              className="mt-4 min-w-0 flex-1 sm:mt-8"
            >
              <VendorFinanceTab
                bookings={financeBookings}
                bookingsLoading={false}
                financeSummary={financeSummary}
                financeLoading={financeLoading}
                settlementRequesting={settlementRequesting}
                settlements={settlements}
                onRefresh={fetchFinance}
                onRequestSettlement={handleRequestSettlement}
              />
            </TabsContent>

            <TabsContent
              value="reviews"
              className="mt-4 min-w-0 flex-1 sm:mt-8"
            >
              <VendorReviewsTab vendorId={vendorId} canRespond={canManage} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
