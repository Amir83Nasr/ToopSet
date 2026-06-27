"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useForm, Controller, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { courtUpdateSchema, type CourtUpdateInput } from "@/lib/validations"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits, toLocalDateStr } from "@/lib/utils"
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { toast } from "@/lib/toast"
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from "@/lib/constants"
import type { DateRange } from "@daypicker/react"
import dynamic from "next/dynamic"
import { AmenityCheckboxes } from "@/components/courts/amenity-checkboxes"
import { ImageUpload } from "@/components/courts/image-upload"
import { type CourtData, type TimeSlot } from "@/components/courts/court-shared"
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
  XCircle,
  Search,
} from "lucide-react"

const LocationPicker = dynamic(
  () =>
    import("@/components/courts/location-picker").then((m) => ({
      default: m.LocationPicker,
    })),
  { ssr: false }
)

const sportTypes = [
  { value: "volleyball", label: "والیبال" },
  { value: "basketball", label: "بسکتبال" },
  { value: "futsal", label: "فوتسال" },
  { value: "handball", label: "هندبال" },
]

interface ManagerBooking {
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
  court_name: string
  court_address: string
  user_name: string
  slot_start_time: string | null
  slot_end_time: string | null
}

function formatBookingDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatBookingTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function DashboardCourtEditPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const courtId = Number(params.id)

  const [court, setCourt] = useState<CourtData | null>(null)
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
  const [editLoading, setEditLoading] = useState(false)

  // Bookings state
  const [bookings, setBookings] = useState<ManagerBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsPage, setBookingsPage] = useState(0)
  const [bookingsTotal, setBookingsTotal] = useState(0)
  const [bookingsStatusFilter, setBookingsStatusFilter] = useState("all")
  const [cancellingBooking, setCancellingBooking] =
    useState<ManagerBooking | null>(null)
  const [cancellingLoading, setCancellingLoading] = useState(false)

  // Week helpers
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const weekLabel = useMemo(() => {
    if (weekDays.length === 0) return ""
    const from = formatPersianDate(weekDays[0])
    const to = formatPersianDate(weekDays[6])
    return `${from} — ${to}`
  }, [weekDays])

  // Edit form state
  const [courtImages, setCourtImages] = useState<string[]>([])
  const [imageTempIds, setImageTempIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CourtUpdateInput>({
    resolver: zodResolver(courtUpdateSchema) as Resolver<CourtUpdateInput>,
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
  const watchSportTypes = (watch("sport_types") || []) as string[]
  const latitudeWatch = watch("latitude")
  const longitudeWatch = watch("longitude")

  const canManage = user?.role === "manager" || user?.role === "admin"

  // ── Fetch data ──

  const fetchData = useCallback(async () => {
    try {
      const courtRes = await api<CourtData>(`/api/v1/courts/${courtId}`)
      setCourt(courtRes)
      // Populate form
      reset({
        name: courtRes.name,
        sport_types: courtRes.sport_types as CourtUpdateInput["sport_types"],
        address: courtRes.address,
        latitude: courtRes.latitude,
        longitude: courtRes.longitude,
        capacity: courtRes.capacity,
        amenities: courtRes.amenities || {},
      })
      setCourtImages(courtRes.images || [])
      // Slots
      api<{ slots: TimeSlot[]; total: number }>(
        `/api/v1/courts/${courtId}/slots?limit=500`
      )
        .then((slotsRes) => setAllSlots(slotsRes.slots))
        .catch(() => {})
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true)
      else toast.error("خطا در دریافت اطلاعات")
    } finally {
      setLoading(false)
    }
  }, [courtId, reset])

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0)
    return () => clearTimeout(timer)
  }, [fetchData])

  // ── Edit form submit ──

  async function onSubmit(data: CourtUpdateInput) {
    setSaving(true)
    try {
      await api(`/api/v1/courts/${courtId}`, {
        method: "PATCH",
        body: JSON.stringify({ ...data, images: courtImages }),
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
      await api(`/api/v1/courts/${courtId}/slots/${slotToDelete.id}`, {
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
      }>(`/api/v1/courts/${courtId}/slots/generate`, {
        method: "POST",
        body: JSON.stringify({
          date_from: toLocalDateStr(payload.date_range.from),
          date_to: toLocalDateStr(payload.date_range.to),
          days_of_week: selectedDayIndices,
          templates: validTemplates.map((t) => ({
            start_time: t.start_time,
            end_time: t.end_time,
            base_price: parseFloat(t.base_price),
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
  }) {
    if (!quickSlotDate) return
    setQuickSlotSubmitting(true)
    try {
      await api(`/api/v1/courts/${courtId}/slots`, {
        method: "POST",
        body: JSON.stringify({
          start_time: `${toLocalDateStr(quickSlotDate)}T${data.start_time}:00`,
          end_time: `${toLocalDateStr(quickSlotDate)}T${data.end_time}:00`,
          base_price: data.base_price,
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
  }

  async function handleSaveEdit() {
    if (!editingSlot) return
    setEditLoading(true)
    try {
      await api(`/api/v1/courts/${courtId}/slots/${editingSlot.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          start_time: editStartTime,
          end_time: editEndTime,
          base_price: parseFloat(editPrice),
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
      params.set("skip", String(bookingsPage * 20))
      params.set("limit", "20")
      params.set("court_id", String(courtId))
      if (bookingsStatusFilter !== "all")
        params.set("status", bookingsStatusFilter)
      const res = await api<{ bookings: ManagerBooking[]; total: number }>(
        `/api/v1/manager/bookings?${params}`
      )
      setBookings(res.bookings)
      setBookingsTotal(res.total)
    } catch {
      toast.error("خطا در دریافت رزروها")
    } finally {
      setBookingsLoading(false)
    }
  }, [bookingsPage, courtId, bookingsStatusFilter, canManage])

  useEffect(() => {
    const timer = setTimeout(() => fetchBookings(), 0)
    return () => clearTimeout(timer)
  }, [fetchBookings])

  async function handleCancelBooking(bookingId: number) {
    setCancellingLoading(true)
    try {
      await api(`/api/v1/bookings/${bookingId}/cancel`, { method: "POST" })
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
        await api(`/api/v1/courts/${courtId}/slots/${slot.id}`, {
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
      await api(`/api/v1/courts/${courtId}`, { method: "DELETE" })
      toast.success("مجموعه حذف شد")
      router.push("/dashboard/courts")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در حذف")
    } finally {
      setDeleting(false)
    }
  }, [courtId, router])

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

  if (notFound || !court) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-xl text-muted-foreground">
          مجموعه مورد نظر یافت نشد
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/courts")}
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
        <h1 className="text-xl font-bold tracking-tight">{court.name}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/courts/${courtId}`}>
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
            <TabsTrigger
              value="bookings"
              className="gap-2.5 px-6 py-3 text-base"
            >
              <CalendarCheck className="size-5" />
              رزروها
            </TabsTrigger>
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
                        <label
                          key={sport.value}
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
                        </label>
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
                      images={courtImages}
                      onChange={setCourtImages}
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
              <Button variant="outline" size="sm" onClick={goPrevWeek}>
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goThisWeek}>
                امروز
              </Button>
              <Button variant="outline" size="sm" onClick={goNextWeek}>
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
                    variant="ghost"
                    size="sm"
                    onClick={handleDeletePastSlots}
                  >
                    <Trash2 className="ml-1 size-3.5 text-destructive" />
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
                <AlertDialogAction onClick={confirmDeleteSlot}>
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
        <TabsContent value="bookings" className="mt-8 min-h-125">
          {bookingsLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>کاربر</TableHead>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>ساعت</TableHead>
                  <TableHead>مبلغ</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="text-right">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : bookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <CalendarCheck className="size-10 text-muted-foreground" />
                </div>
                <h3 className="mb-1 text-lg font-semibold">
                  هیچ رزروی یافت نشد
                </h3>
                <p className="text-sm text-muted-foreground">
                  هنوز رزروی برای این مجموعه ثبت نشده است
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <Select
                  value={bookingsStatusFilter}
                  onValueChange={(v) => {
                    setBookingsStatusFilter(v)
                    setBookingsPage(0)
                  }}
                >
                  <SelectTrigger className="w-44">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBookings()}
                >
                  <RefreshCw className="ml-1.5 size-4" />
                  بروزرسانی
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">کاربر</TableHead>
                    <TableHead className="w-24">تاریخ</TableHead>
                    <TableHead className="w-28">ساعت</TableHead>
                    <TableHead className="w-28">مبلغ</TableHead>
                    <TableHead className="w-20">وضعیت</TableHead>
                    <TableHead className="w-32 text-right">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="max-w-32 truncate">
                        {b.user_name}
                      </TableCell>
                      <TableCell>
                        {b.slot_start_time
                          ? formatBookingDate(b.slot_start_time)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {b.slot_start_time && b.slot_end_time
                          ? `${formatBookingTime(b.slot_start_time)} - ${formatBookingTime(b.slot_end_time)}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("fa-IR").format(b.price_paid)}{" "}
                        تومان
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${BOOKING_STATUS_STYLES[b.status] || ""}`}
                        >
                          {BOOKING_STATUS_LABELS[b.status]?.label || b.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {b.status !== "cancelled" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancellingBooking(b)}
                          >
                            <XCircle className="ml-1 size-4" />
                            لغو
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {Math.ceil(bookingsTotal / 20) > 1 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    صفحه {toPersianDigits(bookingsPage + 1)} از{" "}
                    {toPersianDigits(Math.ceil(bookingsTotal / 20))}
                  </p>
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          text="قبلی"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setBookingsPage((p) => p - 1)
                          }}
                          className={
                            bookingsPage === 0
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          text="بعدی"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setBookingsPage((p) => p + 1)
                          }}
                          className={
                            bookingsPage >= Math.ceil(bookingsTotal / 20) - 1
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

          {/* Booking cancel dialog */}
          <AlertDialog
            open={!!cancellingBooking}
            onOpenChange={(o) => {
              if (!o) setCancellingBooking(null)
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>لغو رزرو</AlertDialogTitle>
                <AlertDialogDescription>
                  آیا از لغو این رزرو توسط {cancellingBooking?.user_name} مطمئن
                  هستید؟
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>انصراف</AlertDialogCancel>
                <AlertDialogAction
                  disabled={cancellingLoading}
                  onClick={() =>
                    cancellingBooking &&
                    handleCancelBooking(cancellingBooking.id)
                  }
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {cancellingLoading ? (
                    <>
                      <Loader2 className="ml-1 size-4 animate-spin" /> در حال
                      لغو...
                    </>
                  ) : (
                    "تأیید لغو"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>

      {/* ══════ Delete court dialog ══════ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مجموعه</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف مجموعه «{court.name}» اطمینان دارید؟ این عمل قابل
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
