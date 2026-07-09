"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useForm, Controller, useWatch, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { vendorUpdateSchema, type VendorUpdateInput } from "@/lib/validations"
import { api, ApiError } from "@/lib/api"
import { toLocalDateStr } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { PersianInput } from "@/components/ui/persian-input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/lib/toast"
import type { DateRange } from "@daypicker/react"
import dynamic from "next/dynamic"
import { AmenityCheckboxes } from "@/components/vendors/amenity-checkboxes"
import { ImageUpload } from "@/components/vendors/image-upload"
import {
  type VendorData,
  type TimeSlot,
} from "@/components/vendors/vendor-shared"
import { WeeklyGrid } from "@/components/dashboard/schedule/weekly-grid"
import { BulkGenerator } from "@/components/dashboard/schedule/bulk-generator"
import { QuickSlotForm } from "@/components/dashboard/schedule/quick-slot-form"
import {
  getWeekDays,
  formatPersianDate,
} from "@/components/dashboard/schedule/utils"
import type { TimeSlotTemplate } from "@/components/dashboard/schedule/types"
import {
  Building2,
  MapPin,
  Loader2,
  Eye,
  CalendarDays,
  ArrowRight,
  Save,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Trash2,
  Plus,
  CalendarCheck,
  Wallet,
} from "lucide-react"

const LocationPicker = dynamic(
  () =>
    import("@/components/vendors/location-picker").then((m) => ({
      default: m.LocationPicker,
    })),
  { ssr: false }
)

const sportTypes = [
  { value: "volleyball", label: "والیبال" },
  { value: "basketball", label: "بسکتبال" },
  { value: "futsal", label: "فوتسال" },
  { value: "handball", label: "هندبال" },
  { value: "football", label: "فوتبال" },
]

interface ManagerBooking {
  id: number
  user_id: number
  slot_id: number
  status: string
  source?: string
  settlement_status?: string
  customer_full_name?: string | null
  customer_phone?: string | null
  price_paid: number
  penalty_amount: number | null
  participants_count: number
  created_at: string
  updated_at: string
  expires_at: string | null
  vendor_name: string
  vendor_address: string
  user_name: string
  user_phone?: string
  slot_start_time: string | null
  slot_end_time: string | null
}

interface FinanceSummary {
  total_online_revenue: number
  successful_online_bookings: number
  settled_bookings: number
  settlement_requested_bookings: number
  available_for_settlement_bookings: number
  not_due_bookings: number
  manual_bookings: number
  settlement_requested_amount: number
  settled_amount: number
  available_for_settlement: number
}

function formatBookingDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatBookingWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR", { weekday: "long" })
}

function formatBookingTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getTimeInputValue(iso: string): string {
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`
}

function getPersianDayIndex(date: Date): number {
  return (date.getDay() + 1) % 7
}

function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat("fa-IR").format(amount)} تومان`
}

export default function DashboardVendorEditPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const vendorId = Number(params.id)

  const [vendor, setVendor] = useState<VendorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)

  // Slot management state
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Schedule tab state
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date()
    const daysSinceSaturday = (today.getDay() + 1) % 7
    const saturday = new Date(today)
    saturday.setDate(today.getDate() - daysSinceSaturday)
    return saturday
  })
  const [showBulkGen, setShowBulkGen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [slotToDelete, setSlotToDelete] = useState<TimeSlot | null>(null)
  const [quickSlotDate, setQuickSlotDate] = useState<Date | null>(null)
  const [quickSlotSubmitting, setQuickSlotSubmitting] = useState(false)

  // Slot edit state
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null)
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editBallAvailable, setEditBallAvailable] = useState(false)
  const [editBallPrice, setEditBallPrice] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  // Bookings state
  const [bookings, setBookings] = useState<ManagerBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(
    null
  )
  const [financeLoading, setFinanceLoading] = useState(false)
  const [settlementRequesting, setSettlementRequesting] = useState(false)
  const [cancellingBooking, setCancellingBooking] =
    useState<ManagerBooking | null>(null)
  const [cancellingLoading, setCancellingLoading] = useState(false)
  const [selectedBookedSlot, setSelectedBookedSlot] = useState<TimeSlot | null>(
    null
  )
  const [manualBookingSlot, setManualBookingSlot] = useState<TimeSlot | null>(
    null
  )
  const [managerBookingName, setManagerBookingName] = useState("")
  const [managerBookingPhone, setManagerBookingPhone] = useState("")
  const [managerBookingWeeks, setManagerBookingWeeks] = useState("1")
  const [manualBookingLoading, setManualBookingLoading] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  // Week helpers
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const weekLabel = useMemo(() => {
    if (weekDays.length === 0) return ""
    const from = formatPersianDate(weekDays[0])
    const to = formatPersianDate(weekDays[6])
    return `${from} — ${to}`
  }, [weekDays])
  const bookingsBySlot = useMemo(() => {
    const map = new Map<number, ManagerBooking>()
    bookings.forEach((booking) => {
      if (booking.status !== "cancelled" && booking.status !== "expired") {
        map.set(booking.slot_id, booking)
      }
    })
    return map
  }, [bookings])
  const weekSlotsByDay = useMemo(() => {
    const groups = new Map<string, TimeSlot[]>()
    weekDays.forEach((day) => groups.set(toLocalDateStr(day), []))
    allSlots.forEach((slot) => {
      const key = toLocalDateStr(new Date(slot.start_time))
      const group = groups.get(key)
      if (group) group.push(slot)
    })
    groups.forEach((slots) =>
      slots.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    )
    return groups
  }, [allSlots, weekDays])

  // Edit form state
  const [vendorImages, setVendorImages] = useState<string[]>([])
  const [imageTempIds, setImageTempIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VendorUpdateInput>({
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
    (useWatch({ control, name: "sport_types" }) as string[]) || []
  const latitudeWatch = useWatch({ control, name: "latitude" })
  const longitudeWatch = useWatch({ control, name: "longitude" })

  const canManage = user?.role === "manager" || user?.role === "admin"

  // ── Fetch data ──

  const fetchData = useCallback(async () => {
    try {
      const vendorRes = await api<VendorData>(`/api/v1/vendors/${vendorId}`)
      setVendor(vendorRes)
      // Populate form
      reset({
        name: vendorRes.name,
        sport_types: vendorRes.sport_types as VendorUpdateInput["sport_types"],
        address: vendorRes.address,
        latitude: vendorRes.latitude,
        longitude: vendorRes.longitude,
        capacity: vendorRes.capacity,
        amenities: vendorRes.amenities || {},
      })
      setVendorImages(vendorRes.images || [])
      // Slots
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
  }, [vendorId, reset])

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0)
    return () => clearTimeout(timer)
  }, [fetchData])

  // ── Edit form submit ──

  async function onSubmit(data: VendorUpdateInput) {
    setSaving(true)
    try {
      await api(`/api/v1/vendors/${vendorId}`, {
        method: "PATCH",
        body: JSON.stringify({ ...data, images: vendorImages }),
      })
      toast.success("تغییرات با موفقیت ذخیره شد")
      fetchData()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ذخیره تغییرات"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  function toggleSportType(value: string) {
    const next = watchSportTypes.includes(value)
      ? watchSportTypes.filter((sport) => sport !== value)
      : [...watchSportTypes, value]

    setValue("sport_types", next as VendorUpdateInput["sport_types"], {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  // ── Slot management ──

  function goNextWeek() {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + 7)
    setWeekStart(next)
  }

  function goPrevWeek() {
    const prev = new Date(weekStart)
    prev.setDate(prev.getDate() - 7)
    setWeekStart(prev)
  }

  function goThisWeek() {
    const today = new Date()
    const daysSinceSaturday = (today.getDay() + 1) % 7
    const saturday = new Date(today)
    saturday.setDate(today.getDate() - daysSinceSaturday)
    setWeekStart(saturday)
  }

  async function confirmDeleteSlot() {
    if (!slotToDelete) return
    try {
      await api(`/api/v1/vendors/${vendorId}/slots/${slotToDelete.id}`, {
        method: "DELETE",
      })
      toast.success("زمان حذف شد")
      setSlotToDelete(null)
      fetchData()
    } catch {
      toast.error("خطا در حذف زمان")
    }
  }

  async function handleBulkGenerate(payload: {
    date_range: DateRange
    days: boolean[]
    templates: TimeSlotTemplate[]
  }) {
    const selectedDayIndices = payload.days
      .map((checked, i) => (checked ? i : -1))
      .filter((i) => i !== -1)

    if (selectedDayIndices.length === 0) {
      toast.error("حداقل یک روز هفته را انتخاب کنید")
      return
    }

    const validTemplates = payload.templates.filter(
      (t) => t.start_time && t.end_time && t.base_price
    )
    if (validTemplates.length === 0) {
      toast.error("حداقل یک بازه زمانی وارد کنید")
      return
    }

    if (!payload.date_range?.from || !payload.date_range?.to) {
      toast.error("بازه تاریخ را مشخص کنید")
      return
    }

    setGenerating(true)
    try {
      const res = await api<{
        created: number
        skipped: number
        total: number
      }>(`/api/v1/vendors/${vendorId}/slots/generate`, {
        method: "POST",
        body: JSON.stringify({
          date_from: toLocalDateStr(payload.date_range.from),
          date_to: toLocalDateStr(payload.date_range.to),
          days_of_week: selectedDayIndices,
          templates: validTemplates.map((t) => ({
            start_time: t.start_time,
            end_time: t.end_time,
            base_price: parseFloat(t.base_price),
            ball_available: t.ball_available,
            ball_price: t.ball_available ? parseFloat(t.ball_price || "0") : 0,
          })),
        }),
      })
      if (res.created > 0) {
        toast.success(`${res.created} زمان با موفقیت ایجاد شد`)
        if (res.skipped > 0) {
          toast.info(`${res.skipped} زمان تکراری نادیده گرفته شد`)
        }
      } else {
        toast.info("زمان جدیدی ایجاد نشد (تکرار یا تداخل)")
      }
      setShowBulkGen(false)
      fetchData()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ایجاد زمان‌ها"
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  async function handleQuickCreate(data: {
    start_time: string
    end_time: string
    base_price: number
    ball_available: boolean
    ball_price: number
  }) {
    if (!quickSlotDate) return
    setQuickSlotSubmitting(true)
    try {
      await api(`/api/v1/vendors/${vendorId}/slots`, {
        method: "POST",
        body: JSON.stringify({
          vendor_id: vendorId,
          start_time: `${toLocalDateStr(quickSlotDate)}T${data.start_time}:00`,
          end_time: `${toLocalDateStr(quickSlotDate)}T${data.end_time}:00`,
          base_price: data.base_price,
          ball_available: data.ball_available,
          ball_price: data.ball_price,
        }),
      })
      toast.success("سانس با موفقیت ایجاد شد")
      setQuickSlotDate(null)
      fetchData()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ایجاد سانس"
      toast.error(msg)
    } finally {
      setQuickSlotSubmitting(false)
    }
  }

  // ── Slot edit ──

  function handleEditSlot(slot: TimeSlot) {
    setEditingSlot(slot)
    // Convert ISO time strings to HH:MM format for the inputs
    const start = slot.start_time.split("T")[1]?.slice(0, 5) || ""
    const end = slot.end_time.split("T")[1]?.slice(0, 5) || ""
    setEditStartTime(start)
    setEditEndTime(end)
    setEditPrice(String(slot.base_price))
    setEditBallAvailable(slot.ball_available)
    setEditBallPrice(String(slot.ball_price || ""))
  }

  async function handleSaveEdit() {
    if (!editingSlot) return
    setEditLoading(true)
    try {
      await api(`/api/v1/vendors/${vendorId}/slots/${editingSlot.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          start_time: editStartTime,
          end_time: editEndTime,
          base_price: parseFloat(editPrice),
          ball_available: editBallAvailable,
          ball_price: editBallAvailable ? parseFloat(editBallPrice || "0") : 0,
        }),
      })
      toast.success("سانس با موفقیت ویرایش شد")
      setEditingSlot(null)
      fetchData()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ویرایش سانس"
      toast.error(msg)
    } finally {
      setEditLoading(false)
    }
  }

  // ── Bookings ──

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

  function settlementStateForBooking(booking: ManagerBooking): {
    label: string
    className: string
  } {
    if (booking.source !== "online" || booking.status !== "confirmed") {
      return {
        label: "غیرقابل تسویه",
        className: "bg-muted text-muted-foreground",
      }
    }
    if (booking.slot_end_time && new Date(booking.slot_end_time) > new Date()) {
      return {
        label: "هنوز موعد سانس نرسیده",
        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      }
    }
    switch (booking.settlement_status) {
      case "settled":
        return {
          label: "تسویه شده",
          className:
            "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        }
      case "settlement_requested":
      case "included_in_settlement":
        return {
          label: "در جریان تسویه",
          className:
            "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        }
      case "not_settled":
        return {
          label: "قابل تسویه",
          className: "bg-primary/10 text-primary",
        }
      default:
        return {
          label: "تسویه نشده",
          className: "bg-muted text-muted-foreground",
        }
    }
  }

  async function handleCancelBooking(bookingId: number, releaseSlot = true) {
    setCancellingLoading(true)
    try {
      await api(`/api/v1/manager/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          release_slot: releaseSlot,
          reason: cancelReason || undefined,
        }),
      })
      toast.success("رزرو لغو شد")
      setCancellingBooking(null)
      setSelectedBookedSlot(null)
      setCancelReason("")
      fetchData()
      fetchBookings()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در لغو رزرو"
      toast.error(msg)
    } finally {
      setCancellingLoading(false)
    }
  }

  async function handleManualSlotBooking() {
    if (!manualBookingSlot) return
    const weeks = Math.max(1, Number(managerBookingWeeks) || 1)
    const startDate = new Date(manualBookingSlot.start_time)
    const dateTo = new Date(startDate)
    dateTo.setDate(startDate.getDate() + (weeks - 1) * 7)

    setManualBookingLoading(true)
    try {
      await api("/api/v1/manager/bookings/recurring", {
        method: "POST",
        body: JSON.stringify({
          vendor_id: vendorId,
          full_name: managerBookingName,
          phone_number: managerBookingPhone,
          date_from: toLocalDateStr(startDate),
          date_to: toLocalDateStr(dateTo),
          days_of_week: [getPersianDayIndex(startDate)],
          start_time: getTimeInputValue(manualBookingSlot.start_time),
          end_time: getTimeInputValue(manualBookingSlot.end_time),
          allow_partial: true,
        }),
      })
      toast.success("رزرو سانس ثبت شد")
      setManualBookingSlot(null)
      setManagerBookingName("")
      setManagerBookingPhone("")
      setManagerBookingWeeks("1")
      fetchData()
      fetchBookings()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ثبت رزرو"
      toast.error(msg)
    } finally {
      setManualBookingLoading(false)
    }
  }

  function handleBookingSlotClick(slot: TimeSlot) {
    const booking = bookingsBySlot.get(slot.id)
    if (booking || slot.is_reserved || slot.status === "reserved") {
      setSelectedBookedSlot(slot)
      setCancellingBooking(booking ?? null)
      return
    }
    if (
      slot.status === "blocked" ||
      slot.status === "disabled" ||
      slot.status === "closed"
    ) {
      toast.error("این سانس قابل رزرو نیست")
      return
    }
    setManualBookingSlot(slot)
  }

  async function handleDeletePastSlots() {
    const now = new Date()
    const pastSlots = allSlots.filter(
      (s) => new Date(s.end_time) < now && !s.is_reserved
    )
    if (pastSlots.length === 0) {
      toast.info("سانس گذشته‌ای برای حذف وجود ندارد")
      return
    }
    let deleted = 0
    for (const slot of pastSlots) {
      try {
        await api(`/api/v1/vendors/${vendorId}/slots/${slot.id}`, {
          method: "DELETE",
        })
        deleted++
      } catch {
        // skip
      }
    }
    toast.success(`${deleted} سانس گذشته حذف شد`)
    fetchData()
  }

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
          <ArrowRight className="ml-2 size-4" />
          بازگشت به لیست
        </Button>
      </div>
    )
  }

  const isFormValid = watchSportTypes.length > 0

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* ══════ Top bar ══════ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">{vendor.name}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/vendors/${vendorId}`}>
              <Eye className="ml-1.5 size-4" />
              صفحه عمومی
            </Link>
          </Button>
          <Button
            type="submit"
            form="edit-form"
            size="sm"
            disabled={!isFormValid || isSubmitting || saving}
          >
            {saving || isSubmitting ? (
              <>
                <Loader2 className="ml-1.5 size-4 animate-spin" />
                در حال ذخیره...
              </>
            ) : (
              <>
                <Save className="ml-1.5 size-4" />
                ذخیره
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ══════ Tabbed Content ══════ */}
      <Tabs defaultValue="basic" className="flex flex-1 flex-col">
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

        {/* ═══ مشخصات Tab ═══ */}
        <TabsContent value="basic" className="mt-8 min-h-125 flex-1">
          <form id="edit-form" onSubmit={handleSubmit(onSubmit)}>
            <Card>
              <CardContent className="space-y-8 p-6">
                {/* ── اطلاعات اصلی ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-1 rounded-full bg-primary/60" />
                    <h3 className="text-sm font-semibold text-foreground">
                      اطلاعات اصلی
                    </h3>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">نام مجموعه</Label>
                      <Input
                        id="name"
                        placeholder="مثلاً مجموعه ورزشی آزادی"
                        className="h-10"
                        {...register("name")}
                      />
                      {errors.name?.message && (
                        <p className="text-xs text-destructive">
                          {String(errors.name.message)}
                        </p>
                      )}
                    </div>
                    <Controller
                      name="capacity"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Label htmlFor="capacity">ظرفیت (نفر)</Label>
                          <PersianInput
                            id="capacity"
                            placeholder="۱۰"
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(
                                Number.parseInt(e.target.value, 10) || 0
                              )
                            }
                            onBlur={field.onBlur}
                            className="h-10"
                          />
                          {errors.capacity?.message && (
                            <p className="text-xs text-destructive">
                              {String(errors.capacity.message)}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* ── ورزش‌های قابل ارائه ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-1 rounded-full bg-primary/60" />
                    <h3 className="text-sm font-semibold text-foreground">
                      ورزش‌های قابل ارائه
                    </h3>
                    {errors.sport_types?.message && (
                      <span className="mr-auto text-xs text-destructive">
                        {String(errors.sport_types.message)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {sportTypes.map((sport) => {
                      const checked = watchSportTypes.includes(sport.value)
                      return (
                        <button
                          type="button"
                          key={sport.value}
                          aria-pressed={checked}
                          onClick={() => toggleSportType(sport.value)}
                          className={`group flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-sm transition-all ${
                            checked
                              ? "border-primary bg-primary/4 shadow-sm ring-1 ring-primary/20"
                              : "border-border hover:border-primary/30 hover:bg-accent/30"
                          }`}
                        >
                          <div
                            className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 group-hover:border-primary/50"
                            }`}
                          >
                            {checked && (
                              <svg
                                className="size-3"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M2.5 6L5 8.5L9.5 3.5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium text-foreground/90">
                            {sport.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                {/* ── موقعیت مکانی ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-1 rounded-full bg-primary/60" />
                    <h3 className="text-sm font-semibold text-foreground">
                      موقعیت مکانی
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">آدرس</Label>
                      <Textarea
                        id="address"
                        placeholder="استان، شهر، خیابان، پلاک"
                        className="min-h-24"
                        {...register("address")}
                      />
                      {errors.address?.message && (
                        <p className="text-xs text-destructive">
                          {String(errors.address.message)}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          موقعیت روی نقشه — کلیک کنید یا نشانگر را بکشید
                        </span>
                      </div>
                      <LocationPicker
                        latitude={latitudeWatch ?? null}
                        longitude={longitudeWatch ?? null}
                        onLocationChange={(lat, lng, address) => {
                          setValue("latitude", lat, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                          setValue("longitude", lng, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                          if (address)
                            setValue("address", address, {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                        }}
                      />
                      {(errors.latitude?.message ||
                        errors.longitude?.message) && (
                        <p className="text-xs text-destructive">
                          {String(
                            errors.latitude?.message ||
                              errors.longitude?.message
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* ── امکانات + تصاویر ── */}
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-1 rounded-full bg-primary/60" />
                      <h3 className="text-sm font-semibold text-foreground">
                        امکانات
                      </h3>
                    </div>
                    <Controller
                      name="amenities"
                      control={control}
                      render={({ field }) => (
                        <AmenityCheckboxes
                          value={(field.value || {}) as Record<string, boolean>}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-1 rounded-full bg-primary/60" />
                      <h3 className="text-sm font-semibold text-foreground">
                        تصاویر
                      </h3>
                    </div>
                    <ImageUpload
                      images={vendorImages}
                      onChange={setVendorImages}
                      tempIds={imageTempIds}
                      onTempIdsChange={setImageTempIds}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* ═══ Scheduling Tab ═══ */}
        <TabsContent value="schedule" className="mt-8 min-h-125 space-y-4">
          {/* Week navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={goPrevWeek}>
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goThisWeek}>
                امروز
              </Button>
              <Button variant="outline" size="icon-sm" onClick={goNextWeek}>
                <ChevronLeft className="size-4" />
              </Button>
            </div>
            <div className="text-sm font-medium">{weekLabel}</div>
            <div className="flex items-center gap-2">
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkGen(true)}
                  >
                    <Plus className="ml-1 size-3.5" />
                    ایجاد گروهی
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeletePastSlots}
                  >
                    <Trash2 className="ml-1 size-3.5" />
                    پاکسازی گذشته
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={() => fetchData()}>
                <RefreshCw
                  className={`size-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {/* Quick slot form */}
          {quickSlotDate && (
            <QuickSlotForm
              date={quickSlotDate}
              onClose={() => setQuickSlotDate(null)}
              onSubmit={handleQuickCreate}
              submitting={quickSlotSubmitting}
            />
          )}

          {/* Weekly grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>جدول هفتگی</CardTitle>
              <CardDescription>
                {allSlots.length > 0
                  ? `${allSlots.length} زمان ثبت شده`
                  : "این مجموعه هنوز زمانی ندارد"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyGrid
                slots={allSlots}
                weekStart={weekStart}
                onSlotDelete={setSlotToDelete}
                onSlotEdit={handleEditSlot}
                onCellClick={(day) => setQuickSlotDate(day)}
                onAddSlot={(day) => setQuickSlotDate(day)}
              />
            </CardContent>
          </Card>

          {/* Bulk generator */}
          <BulkGenerator
            open={showBulkGen}
            onOpenChange={setShowBulkGen}
            onGenerate={handleBulkGenerate}
            generating={generating}
            currentSlots={allSlots}
          />

          {/* Slot delete confirmation */}
          <AlertDialog
            open={!!slotToDelete}
            onOpenChange={(open) => {
              if (!open) setSlotToDelete(null)
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>حذف زمان</AlertDialogTitle>
                <AlertDialogDescription>
                  آیا از حذف این زمان اطمینان دارید؟ این عمل قابل بازگشت نیست.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>انصراف</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={confirmDeleteSlot}
                >
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Slot edit dialog */}
          <Dialog
            open={!!editingSlot}
            onOpenChange={(open) => {
              if (!open) setEditingSlot(null)
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ویرایش سانس</DialogTitle>
                <DialogDescription>
                  زمان و قیمت سانس را ویرایش کنید
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-start">زمان شروع</Label>
                    <Input
                      id="edit-start"
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-end">زمان پایان</Label>
                    <Input
                      id="edit-end"
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price">قیمت (تومان)</Label>
                  <PersianInput
                    id="edit-price"
                    placeholder="مثلاً ۵۰۰,۰۰۰"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2 rounded-lg border p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={editBallAvailable}
                      onCheckedChange={(checked) =>
                        setEditBallAvailable(checked === true)
                      }
                    />
                    امکان رزرو توپ برای این سانس
                  </label>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ball-price">قیمت توپ (تومان)</Label>
                    <PersianInput
                      id="edit-ball-price"
                      placeholder="مثلاً ۵۰,۰۰۰"
                      value={editBallPrice}
                      onChange={(e) => setEditBallPrice(e.target.value)}
                      disabled={!editBallAvailable}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingSlot(null)}>
                  انصراف
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={
                    editLoading || !editStartTime || !editEndTime || !editPrice
                  }
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="ml-1 size-4 animate-spin" />
                      در حال ذخیره...
                    </>
                  ) : (
                    "ذخیره"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ═══ رزروها Tab ═══ */}
        <TabsContent value="bookings" className="mt-8 min-h-125 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={goPrevWeek}>
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goThisWeek}>
                این هفته
              </Button>
              <Button variant="outline" size="icon-sm" onClick={goNextWeek}>
                <ChevronLeft className="size-4" />
              </Button>
            </div>
            <div className="text-sm font-medium">{weekLabel}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchData()
                fetchBookings()
              }}
            >
              <RefreshCw className="ml-1.5 size-4" />
              بروزرسانی
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>رزروهای هفته</CardTitle>
              <CardDescription>
                روی سانس رزرو شده برای مشاهده اطلاعات و لغو کلیک کنید؛ روی سانس
                آزاد برای ثبت رزرو چند هفته‌ای کلیک کنید.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <div className="grid gap-3 md:grid-cols-7">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-56 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div className="grid min-w-[1120px] grid-cols-7 gap-3">
                    {weekDays.map((day) => {
                      const dayKey = toLocalDateStr(day)
                      const daySlots = weekSlotsByDay.get(dayKey) ?? []

                      return (
                        <section
                          key={dayKey}
                          className="flex min-h-[420px] flex-col rounded-lg border bg-muted/10"
                        >
                          <div className="border-b bg-card px-3 py-2">
                            <div className="text-sm font-semibold">
                              {day.toLocaleDateString("fa-IR", {
                                weekday: "long",
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {day.toLocaleDateString("fa-IR", {
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          </div>

                          <div className="flex-1 space-y-2 p-2">
                            {daySlots.length === 0 ? (
                              <div className="flex h-32 items-center justify-center rounded-md border border-dashed px-3 text-center text-xs text-muted-foreground">
                                سانسی ثبت نشده
                              </div>
                            ) : (
                              daySlots.map((slot) => {
                                const booking = bookingsBySlot.get(slot.id)
                                const isBooked =
                                  !!booking ||
                                  slot.is_reserved ||
                                  slot.status === "reserved" ||
                                  slot.status === "reserving"
                                const blocked =
                                  slot.status === "blocked" ||
                                  slot.status === "disabled" ||
                                  slot.status === "closed"
                                const statusLabel = blocked
                                  ? "غیرفعال"
                                  : isBooked
                                    ? "رزرو شده"
                                    : "آزاد"
                                const personName =
                                  booking?.user_name ||
                                  booking?.customer_full_name ||
                                  "رزروکننده نامشخص"
                                const personPhone =
                                  booking?.user_phone || booking?.customer_phone

                                return (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => handleBookingSlotClick(slot)}
                                    className={`block w-full rounded-lg border p-3 text-right text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                      blocked
                                        ? "border-muted bg-muted/40 text-muted-foreground"
                                        : isBooked
                                          ? "border-destructive/30 bg-destructive/5"
                                          : "border-primary/30 bg-primary/5"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="text-sm font-semibold whitespace-nowrap">
                                          {formatBookingTime(slot.start_time)} -{" "}
                                          {formatBookingTime(slot.end_time)}
                                        </div>
                                        <div className="mt-1 truncate text-muted-foreground">
                                          {isBooked && booking
                                            ? personName
                                            : formatMoney(slot.base_price)}
                                        </div>
                                      </div>
                                      <span
                                        className={`shrink-0 rounded-full px-2 py-1 text-[11px] ${
                                          blocked
                                            ? "bg-muted text-muted-foreground"
                                            : isBooked
                                              ? "bg-destructive/10 text-destructive"
                                              : "bg-primary/10 text-primary"
                                        }`}
                                      >
                                        {statusLabel}
                                      </span>
                                    </div>

                                    <div className="mt-3 grid gap-1 border-t pt-2 text-muted-foreground">
                                      {isBooked && booking ? (
                                        <>
                                          <div className="truncate">
                                            تماس: {personPhone || "نامشخص"}
                                          </div>
                                          <div className="truncate">
                                            مبلغ:{" "}
                                            {formatMoney(booking.price_paid)}
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div>
                                            قیمت سانس:{" "}
                                            {formatMoney(slot.base_price)}
                                          </div>
                                          {slot.ball_available && (
                                            <div>
                                              توپ:{" "}
                                              {formatMoney(slot.ball_price)}
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </button>
                                )
                              })
                            )}
                          </div>
                        </section>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog
            open={!!selectedBookedSlot}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedBookedSlot(null)
                setCancellingBooking(null)
                setCancelReason("")
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>جزئیات رزرو سانس</DialogTitle>
                <DialogDescription>
                  اطلاعات رزروکننده و عملیات لغو این سانس
                </DialogDescription>
              </DialogHeader>
              {selectedBookedSlot && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-3 text-sm">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">تاریخ: </span>
                        {formatBookingDate(selectedBookedSlot.start_time)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">ساعت: </span>
                        {formatBookingTime(
                          selectedBookedSlot.start_time
                        )} - {formatBookingTime(selectedBookedSlot.end_time)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">نام: </span>
                        {cancellingBooking?.user_name ||
                          cancellingBooking?.customer_full_name ||
                          "نامشخص"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">تماس: </span>
                        {cancellingBooking?.user_phone ||
                          cancellingBooking?.customer_phone ||
                          "نامشخص"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          نوع رزرو:{" "}
                        </span>
                        {cancellingBooking?.source === "manager_manual"
                          ? "دستی سالندار"
                          : "آنلاین کاربر"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">مبلغ: </span>
                        {formatMoney(cancellingBooking?.price_paid ?? 0)}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cancel-reason">علت لغو</Label>
                    <Textarea
                      id="cancel-reason"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="مثلاً تعمیرات، مشکل مجموعه، تعطیلی..."
                    />
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedBookedSlot(null)
                    setCancellingBooking(null)
                  }}
                >
                  بستن
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={!cancellingBooking || cancellingLoading}
                    onClick={() =>
                      cancellingBooking &&
                      handleCancelBooking(cancellingBooking.id, false)
                    }
                  >
                    {cancellingLoading && (
                      <Loader2 className="ml-1 size-4 animate-spin" />
                    )}
                    لغو بدون آزادسازی
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={!cancellingBooking || cancellingLoading}
                    onClick={() =>
                      cancellingBooking &&
                      handleCancelBooking(cancellingBooking.id, true)
                    }
                  >
                    {cancellingLoading && (
                      <Loader2 className="ml-1 size-4 animate-spin" />
                    )}
                    لغو و آزادسازی
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!manualBookingSlot}
            onOpenChange={(open) => {
              if (!open) setManualBookingSlot(null)
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>رزرو سانس آزاد</DialogTitle>
                <DialogDescription>
                  رزرو توسط سالندار بدون پرداخت آنلاین ثبت می‌شود.
                </DialogDescription>
              </DialogHeader>
              {manualBookingSlot && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-3 text-sm">
                    <div>
                      {formatBookingDate(manualBookingSlot.start_time)}،{" "}
                      {formatBookingTime(manualBookingSlot.start_time)} -{" "}
                      {formatBookingTime(manualBookingSlot.end_time)}
                    </div>
                    {(() => {
                      const weeks = Math.max(
                        1,
                        Number(managerBookingWeeks) || 1
                      )
                      const start = new Date(manualBookingSlot.start_time)
                      const end = new Date(start)
                      end.setDate(start.getDate() + (weeks - 1) * 7)
                      return (
                        <div className="mt-1 text-xs text-muted-foreground">
                          بازه ثبت: {start.toLocaleDateString("fa-IR")} تا{" "}
                          {end.toLocaleDateString("fa-IR")}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="manager-booking-name">نام کامل</Label>
                      <Input
                        id="manager-booking-name"
                        value={managerBookingName}
                        onChange={(e) => setManagerBookingName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manager-booking-phone">شماره تماس</Label>
                      <Input
                        id="manager-booking-phone"
                        value={managerBookingPhone}
                        onChange={(e) => setManagerBookingPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manager-booking-weeks">
                        تعداد هفته‌های رزرو
                      </Label>
                      <Input
                        id="manager-booking-weeks"
                        type="number"
                        min={1}
                        max={26}
                        value={managerBookingWeeks}
                        onChange={(e) => setManagerBookingWeeks(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setManualBookingSlot(null)}
                >
                  انصراف
                </Button>
                <Button
                  disabled={
                    manualBookingLoading ||
                    !managerBookingName ||
                    !managerBookingPhone
                  }
                  onClick={handleManualSlotBooking}
                >
                  {manualBookingLoading && (
                    <Loader2 className="ml-1 size-4 animate-spin" />
                  )}
                  ثبت رزرو
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ═══ مالی Tab ═══ */}
        <TabsContent value="finance" className="mt-8 min-h-125 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
            <div>
              <h2 className="text-base font-semibold">داشبورد مالی مجموعه</h2>
              <p className="text-sm text-muted-foreground">
                تسویه فقط برای رزروهای آنلاین تاییدشده‌ای فعال است که موعد سانس
                آن‌ها گذشته باشد.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchFinance()
                  fetchBookings()
                }}
                disabled={financeLoading || bookingsLoading}
              >
                <RefreshCw className="ml-1.5 size-4" />
                بروزرسانی
              </Button>
              <Button
                size="sm"
                onClick={handleRequestSettlement}
                disabled={
                  settlementRequesting ||
                  financeLoading ||
                  !financeSummary ||
                  financeSummary.available_for_settlement <= 0
                }
              >
                {settlementRequesting ? (
                  <Loader2 className="ml-1.5 size-4 animate-spin" />
                ) : (
                  <Wallet className="ml-1.5 size-4" />
                )}
                درخواست تسویه موارد قابل تسویه
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>رزرو آنلاین موفق</CardDescription>
                <CardTitle className="text-2xl">
                  {financeSummary?.successful_online_bookings ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {formatMoney(financeSummary?.total_online_revenue ?? 0)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>قابل تسویه</CardDescription>
                <CardTitle className="text-2xl">
                  {financeSummary?.available_for_settlement_bookings ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {formatMoney(financeSummary?.available_for_settlement ?? 0)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>در جریان تسویه</CardDescription>
                <CardTitle className="text-2xl">
                  {financeSummary?.settlement_requested_bookings ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {formatMoney(financeSummary?.settlement_requested_amount ?? 0)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>تسویه شده</CardDescription>
                <CardTitle className="text-2xl">
                  {financeSummary?.settled_bookings ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {formatMoney(financeSummary?.settled_amount ?? 0)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>هنوز موعد نرسیده</CardDescription>
                <CardTitle className="text-2xl">
                  {financeSummary?.not_due_bookings ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                قابل تسویه بعد از برگزاری سانس
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>رکورد رزروها</CardTitle>
              <CardDescription>
                وضعیت تسویه هر رزرو بر اساس پرداخت آنلاین، تایید رزرو، وضعیت
                تسویه و زمان پایان سانس نمایش داده می‌شود.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookingsLoading || financeLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-md" />
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  رزروی برای این مجموعه ثبت نشده است.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">مشتری</TableHead>
                        <TableHead className="text-right">تاریخ سانس</TableHead>
                        <TableHead className="text-right">روز</TableHead>
                        <TableHead className="text-right">ساعت</TableHead>
                        <TableHead className="text-right">مبلغ</TableHead>
                        <TableHead className="text-right">نوع رزرو</TableHead>
                        <TableHead className="text-right">
                          وضعیت تسویه
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => {
                        const state = settlementStateForBooking(booking)
                        const sourceLabel =
                          booking.source === "manager_manual"
                            ? "دستی سالندار"
                            : "آنلاین"
                        return (
                          <TableRow key={booking.id}>
                            <TableCell className="min-w-40 font-medium">
                              <div>
                                {booking.user_name ||
                                  booking.customer_full_name ||
                                  "نامشخص"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {booking.user_phone ||
                                  booking.customer_phone ||
                                  "بدون شماره"}
                              </div>
                            </TableCell>
                            <TableCell className="min-w-28">
                              {booking.slot_start_time
                                ? formatBookingDate(booking.slot_start_time)
                                : "-"}
                            </TableCell>
                            <TableCell className="min-w-24">
                              {booking.slot_start_time
                                ? formatBookingWeekday(booking.slot_start_time)
                                : "-"}
                            </TableCell>
                            <TableCell className="min-w-32">
                              {booking.slot_start_time && booking.slot_end_time
                                ? `${formatBookingTime(
                                    booking.slot_start_time
                                  )} - ${formatBookingTime(
                                    booking.slot_end_time
                                  )}`
                                : "-"}
                            </TableCell>
                            <TableCell className="min-w-28">
                              {formatMoney(booking.price_paid)}
                            </TableCell>
                            <TableCell className="min-w-28">
                              {sourceLabel}
                            </TableCell>
                            <TableCell className="min-w-40">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${state.className}`}
                              >
                                {state.label}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ══════ Delete vendor dialog ══════ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مجموعه</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف مجموعه «{vendor.name}» اطمینان دارید؟ این عمل قابل
              بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "در حال حذف..." : "حذف مجموعه"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
