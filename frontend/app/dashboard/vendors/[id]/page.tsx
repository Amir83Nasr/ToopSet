"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm, useWatch, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { vendorUpdateSchema, type VendorUpdateInput } from "@/lib/validations"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  type VendorData,
  type TimeSlot,
} from "@/components/vendors/vendor-shared"
import type {
  ManagerBooking,
  FinanceSummary,
} from "@/components/vendors/dashboard/vendor-utils"
import {
  getWeekDays,
  formatPersianDate,
} from "@/components/dashboard/schedule/utils"
import { VendorHeader } from "@/components/vendors/dashboard/vendor-header"
import { VendorDetailsTab } from "@/components/vendors/dashboard/vendor-details-tab"
import { VendorScheduleTab } from "@/components/vendors/dashboard/vendor-schedule-tab"
import { VendorBookingsTab } from "@/components/vendors/dashboard/vendor-bookings-tab"
import { VendorFinanceTab } from "@/components/vendors/dashboard/vendor-finance-tab"
import {
  Building2,
  CalendarDays,
  ArrowRight,
  CalendarCheck,
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
  const [activeTab, setActiveTab] = useState("basic")

  // Slot state
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([])

  // Delete vendor
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Week navigation (shared between schedule + bookings tabs)
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date()
    const daysSinceSaturday = (today.getDay() + 1) % 7
    const saturday = new Date(today)
    saturday.setDate(today.getDate() - daysSinceSaturday)
    return saturday
  })

  // Bookings + Finance state
  const [bookings, setBookings] = useState<ManagerBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(
    null
  )
  const [financeLoading, setFinanceLoading] = useState(false)
  const [settlementRequesting, setSettlementRequesting] = useState(false)

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
        address: vendorRes.address,
        latitude: vendorRes.latitude,
        longitude: vendorRes.longitude,
        capacity: vendorRes.capacity,
        amenities: vendorRes.amenities || {},
      })
      setVendorImages(vendorRes.images || [])
      api<{ slots: TimeSlot[]; total: number }>(
        `/api/v1/vendors/${vendorId}/slots?limit=500`
      )
        .then((slotsRes) => setAllSlots(slotsRes.slots))
        .catch(() => {})
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

  // ── Bookings + Finance fetch ──

  const fetchBookings = useCallback(async () => {
    if (!canManage) return
    setBookingsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", "0")
      params.set("limit", "500")
      params.set("vendor_id", String(vendorId))
      const res = await api<{ bookings: ManagerBooking[]; total: number }>(
        `/api/v1/manager/bookings?${params}`
      )
      setBookings(res.bookings)
    } catch {
      toast.error("خطا در دریافت رزروها")
    } finally {
      setBookingsLoading(false)
    }
  }, [vendorId, canManage])

  const fetchFinance = useCallback(async () => {
    if (!canManage) return
    setFinanceLoading(true)
    try {
      const summary = await api<FinanceSummary>(
        `/api/v1/manager/finance/summary?vendor_id=${vendorId}`
      )
      setFinanceSummary(summary)
    } catch {
      toast.error("خطا در دریافت اطلاعات مالی")
    } finally {
      setFinanceLoading(false)
    }
  }, [vendorId, canManage])

  useEffect(() => {
    const timer = setTimeout(() => fetchBookings(), 0)
    return () => clearTimeout(timer)
  }, [fetchBookings])

  useEffect(() => {
    const timer = setTimeout(() => fetchFinance(), 0)
    return () => clearTimeout(timer)
  }, [fetchFinance])

  // ── Form submit ──

  async function onSubmit(data: VendorUpdateInput) {
    setSaving(true)
    try {
      await api(`/api/v1/vendors/${vendorId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...data,
          images: vendorImages,
          temp_ids: imageTempIds,
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

  // ── Delete vendor ──

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await api(`/api/v1/vendors/${vendorId}`, { method: "DELETE" })
      toast.success("مجموعه حذف شد")
      router.push("/dashboard/vendors")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در حذف")
    } finally {
      setDeleting(false)
    }
  }, [vendorId, router])

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
      fetchBookings()
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
        <Skeleton className="h-10 w-80 rounded-lg" />
        <Skeleton className="h-125 w-full rounded-xl" />
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
    <div className="flex flex-1 flex-col gap-6">
      <VendorHeader
        vendorId={vendorId}
        vendorName={vendor.name}
        activeTab={activeTab}
        saving={saving}
        isFormValid={isFormValid}
        isSubmitting={form.formState.isSubmitting}
        canManage={canManage}
        onDeleteClick={() => setDeleteDialogOpen(true)}
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col"
      >
        <TabsList className="w-fit self-start">
          <TabsTrigger value="basic" className="gap-2.5 px-6 py-3 text-base">
            <Building2 className="size-5" />
            مشخصات
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2.5 px-6 py-3 text-base">
            <CalendarDays className="size-5" />
            زمان‌بندی
          </TabsTrigger>
          {canManage && (
            <>
              <TabsTrigger
                value="bookings"
                className="gap-2.5 px-6 py-3 text-base"
              >
                <CalendarCheck className="size-5" />
                رزروها
              </TabsTrigger>
              <TabsTrigger
                value="finance"
                className="gap-2.5 px-6 py-3 text-base"
              >
                <Wallet className="size-5" />
                مالی
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="basic" className="mt-8 flex-1">
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

        <TabsContent value="schedule" className="mt-8 flex-1">
          <VendorScheduleTab
            vendorId={vendorId}
            allSlots={allSlots}
            weekStart={weekStart}
            weekLabel={weekLabel}
            canManage={canManage}
            loading={loading}
            onPrevWeek={goPrevWeek}
            onNextWeek={goNextWeek}
            onThisWeek={goThisWeek}
            onRefresh={fetchData}
          />
        </TabsContent>

        {canManage && (
          <>
            <TabsContent value="bookings" className="mt-8 flex-1">
              <VendorBookingsTab
                vendorId={vendorId}
                allSlots={allSlots}
                bookings={bookings}
                bookingsLoading={bookingsLoading}
                weekLabel={weekLabel}
                weekDays={weekDays}
                onPrevWeek={goPrevWeek}
                onNextWeek={goNextWeek}
                onThisWeek={goThisWeek}
                onRefresh={() => {
                  fetchData()
                  fetchBookings()
                }}
              />
            </TabsContent>

            <TabsContent value="finance" className="mt-8 flex-1">
              <VendorFinanceTab
                bookings={bookings}
                bookingsLoading={bookingsLoading}
                financeSummary={financeSummary}
                financeLoading={financeLoading}
                settlementRequesting={settlementRequesting}
                onRefresh={() => {
                  fetchFinance()
                  fetchBookings()
                }}
                onRequestSettlement={handleRequestSettlement}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Delete vendor dialog */}
      <ResponsiveAlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>حذف مجموعه</ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              آیا از حذف مجموعه «{vendor.name}» اطمینان دارید؟ این عمل قابل
              بازگشت نیست.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={deleting}>
              انصراف
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "در حال حذف..." : "حذف مجموعه"}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </div>
  )
}
