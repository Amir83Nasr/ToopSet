"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { courtUpdateSchema, type CourtUpdateInput } from "@/lib/validations"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { TimePicker } from "@/components/ui/time-picker"
import { Skeleton } from "@/components/ui/skeleton"
import { PersianInput } from "@/components/ui/persian-input"
import { toast } from "@/lib/toast"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import type { DateRange } from "@daypicker/react"
import dynamic from "next/dynamic"
import { AmenityCheckboxes } from "@/components/courts/amenity-checkboxes"
import { ImageUpload } from "@/components/courts/image-upload"
import {
  formatTime,
  formatPrice,
  formatDate,
  type CourtData,
  type TimeSlot,
} from "@/components/courts/court-shared"
import {
  Building2,
  MapPin,
  Image as ImageIcon,
  Users,
  Settings2,
  CalendarPlus,
  Loader2,
  Trash2,
  ToggleRight,
  Eye,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Save,
  ArrowLeft,
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createCount, setCreateCount] = useState(0)
  const [createTotal, setCreateTotal] = useState(0)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeDateIndex, setActiveDateIndex] = useState(0)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  // Edit form state
  const [courtImages, setCourtImages] = useState<string[]>([])
  const [imageTempIds, setImageTempIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
    watch,
  } = useForm<CourtUpdateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(courtUpdateSchema) as any,
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
  const isAdmin = user?.role === "admin"

  // ── Date helpers ──

  const next30Days = useMemo(() => {
    const result: string[] = []
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      result.push(d.toLocaleDateString("en-CA"))
    }
    return result
  }, [])

  const activeDate = next30Days[activeDateIndex] || next30Days[0]

  const slotsForDate = useMemo(
    () => allSlots.filter((s) => s.start_time.startsWith(activeDate)),
    [allSlots, activeDate]
  )

  const totalAvailable = useMemo(
    () => allSlots.filter((s) => !s.is_reserved).length,
    [allSlots]
  )

  const totalReserved = useMemo(
    () => allSlots.filter((s) => s.is_reserved).length,
    [allSlots]
  )

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

  function toggleSport(value: string) {
    const current = watchSportTypes
    if (current.includes(value)) {
      setValue(
        "sport_types",
        current.filter((s) => s !== value) as CourtUpdateInput["sport_types"],
        { shouldValidate: true, shouldDirty: true }
      )
    } else {
      setValue(
        "sport_types",
        [...current, value] as CourtUpdateInput["sport_types"],
        { shouldValidate: true, shouldDirty: true }
      )
    }
  }

  // ── Slot management ──

  async function handleCreateSlot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!dateRange?.from) {
      toast.error("لطفاً بازه تاریخ را انتخاب کنید")
      return
    }
    if (!startTime || !endTime) {
      toast.error("لطفاً ساعت شروع و پایان را وارد کنید")
      return
    }
    setCreating(true)
    const form = new FormData(e.currentTarget)
    const price = form.get("base_price") as string
    const dates: string[] = []
    const from = new Date(dateRange.from)
    const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from)
    const current = new Date(from)
    while (current <= to) {
      dates.push(current.toLocaleDateString("en-CA"))
      current.setDate(current.getDate() + 1)
    }
    setCreateCount(0)
    setCreateTotal(dates.length)
    let successCount = 0
    for (let i = 0; i < dates.length; i++) {
      try {
        await api(`/api/v1/courts/${courtId}/slots`, {
          method: "POST",
          body: JSON.stringify({
            date: dates[i],
            start_time: startTime,
            end_time: endTime,
            base_price: Number(price.replace(/,/g, "")),
          }),
        })
        successCount++
      } catch {}
      setCreateCount(i + 1)
    }
    if (successCount > 0) {
      toast.success(`${toPersianDigits(successCount)} زمان با موفقیت ایجاد شد`)
      fetchData()
    } else {
      toast.error("هیچ زمانی ایجاد نشد")
    }
    setCreating(false)
    setDialogOpen(false)
    setDateRange(undefined)
  }

  const handleToggleActive = useCallback(async () => {
    if (!court) return
    try {
      await api(`/api/v1/courts/${courtId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !court.is_active }),
      })
      toast.success(court.is_active ? "مجموعه غیرفعال شد" : "مجموعه فعال شد")
      fetchData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا")
    }
  }, [court, courtId, fetchData])

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

  const handleDeleteSlot = useCallback(
    async (slot: TimeSlot) => {
      try {
        await api(`/api/v1/courts/${courtId}/slots/${slot.id}`, {
          method: "DELETE",
        })
        toast.success("زمان حذف شد")
        fetchData()
      } catch {
        toast.error("خطا در حذف زمان")
      }
    },
    [courtId, fetchData]
  )

  // ── Loading / 404 ──

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
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

  const { dayName, dayNum, month } = formatDate(activeDate)
  const activeDateLabel = `${dayName} ${dayNum} ${month}`

  const isFormValid = watchSportTypes.length > 0

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* ══════ Top bar ══════ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/courts")}
        >
          <ArrowLeft className="ml-1.5 size-4" />
          برگشت
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToggleActive}>
            <ToggleRight data-icon="inline-start" />
            {court.is_active ? "غیرفعال‌سازی" : "فعال‌سازی"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/courts/${courtId}`}>
              <Eye className="ml-1.5 size-4" />
              صفحه عمومی
            </Link>
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="ml-1.5 size-4" />
              حذف
            </Button>
          )}
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

      {/* ══════ Main grid ══════ */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* ====== Left column: Edit form ====== */}
        <div className="space-y-6 lg:col-span-3">
          <form
            id="edit-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* ── Basic Info ── */}
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">اطلاعات پایه</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      نام و نوع ورزش‌های مجموعه
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="space-y-1.5">
                  <Label htmlFor="name">نام مجموعه</Label>
                  <Input
                    id="name"
                    placeholder="مثلاً مجموعه ورزشی آزادی"
                    {...register("name")}
                  />
                  {errors.name?.message && (
                    <p className="text-xs text-destructive">
                      {String(errors.name.message)}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>نوع ورزش‌های موجود</Label>
                  <p className="text-xs text-muted-foreground">
                    حداقل یک نوع ورزش را انتخاب کنید
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {sportTypes.map((sport) => {
                      const checked = watchSportTypes.includes(sport.value)
                      return (
                        <label
                          key={sport.value}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-all ${
                            checked
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/30 hover:bg-accent/30"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleSport(sport.value)}
                          />
                          <span className="font-medium">{sport.label}</span>
                        </label>
                      )
                    })}
                  </div>
                  {errors.sport_types?.message && (
                    <p className="text-xs text-destructive">
                      {String(errors.sport_types.message)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Location ── */}
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">موقعیت و آدرس</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      مکان دقیق مجموعه را مشخص کنید
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="space-y-1.5">
                  <Label htmlFor="address">آدرس کامل</Label>
                  <Textarea
                    id="address"
                    placeholder="استان، شهر، خیابان، پلاک"
                    className="min-h-20"
                    {...register("address")}
                  />
                  {errors.address?.message && (
                    <p className="text-xs text-destructive">
                      {String(errors.address.message)}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>موقعیت روی نقشه</Label>
                  <p className="text-xs text-muted-foreground">
                    روی نقشه کلیک کنید یا نشانگر را بکشید
                  </p>
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
                  {(errors.latitude?.message || errors.longitude?.message) && (
                    <p className="text-xs text-destructive">
                      {String(
                        errors.latitude?.message || errors.longitude?.message
                      )}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Capacity ── */}
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">ظرفیت</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      تعداد نفراتی که هم‌زمان می‌توانند حضور داشته باشند
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <Controller
                  name="capacity"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="capacity">ظرفیت مجموعه</Label>
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
                        className="max-w-30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      {errors.capacity?.message && (
                        <p className="text-xs text-destructive">
                          {String(errors.capacity.message)}
                        </p>
                      )}
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            {/* ── Amenities ── */}
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Settings2 className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">امکانات</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      امکانات موجود در مجموعه را انتخاب کنید
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
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
              </CardContent>
            </Card>

            {/* ── Images ── */}
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ImageIcon className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">تصاویر</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      حداقل ۳ تصویر از مجموعه آپلود کنید
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <ImageUpload
                  images={courtImages}
                  onChange={setCourtImages}
                  tempIds={imageTempIds}
                  onTempIdsChange={setImageTempIds}
                />
              </CardContent>
            </Card>

            {/* ── Submit ── */}
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:text-right">
                  <div className="flex-1 text-center sm:text-right">
                    <h3 className="text-sm font-semibold">ذخیره تغییرات</h3>
                    <p className="text-xs text-muted-foreground">
                      تغییرات خود را ذخیره کنید
                    </p>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-11 min-w-40 gap-2"
                    disabled={!isFormValid || isSubmitting || saving}
                  >
                    {saving || isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        در حال ذخیره...
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        ذخیره تغییرات
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* ====== Right column: Slot Management ====== */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:col-span-2 lg:self-start">
          {/* Stats bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-around text-center">
                <div>
                  <p className="text-2xl font-bold">
                    {toPersianDigits(allSlots.length)}
                  </p>
                  <p className="text-xs text-muted-foreground">کل</p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {toPersianDigits(totalAvailable)}
                  </p>
                  <p className="text-xs text-muted-foreground">آزاد</p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div>
                  <p className="text-2xl font-bold text-red-500">
                    {toPersianDigits(totalReserved)}
                  </p>
                  <p className="text-xs text-muted-foreground">رزرو</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date navigation + Add slot */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={activeDateIndex <= 0}
                    onClick={() =>
                      setActiveDateIndex((i) => Math.max(0, i - 1))
                    }
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <div className="min-w-0 text-center">
                    <p className="text-sm leading-tight font-semibold">
                      {activeDateLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {toPersianDigits(slotsForDate.length)} سانس
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={activeDateIndex >= next30Days.length - 1}
                    onClick={() =>
                      setActiveDateIndex((i) =>
                        Math.min(next30Days.length - 1, i + 1)
                      )
                    }
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>
                {canManage && (
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <CalendarPlus className="ml-1.5 size-4" />
                        افزودن
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      onOpenAutoFocus={() => {
                        setStartTime("")
                        setEndTime("")
                      }}
                    >
                      <DialogHeader>
                        <DialogTitle>افزودن سانس جدید</DialogTitle>
                        <DialogDescription>
                          برای مجموعه {court.name} سانس جدید ثبت کنید
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateSlot} className="space-y-4">
                        <div className="space-y-2">
                          <Label>بازه تاریخ</Label>
                          <DateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder="از تاریخ تا تاریخ"
                          />
                          {dateRange?.from && dateRange?.to && (
                            <p className="text-xs text-muted-foreground">
                              {dateRange.from.toLocaleDateString("fa-IR")} تا{" "}
                              {dateRange.to.toLocaleDateString("fa-IR")}
                              {dateRange.from.toLocaleDateString("en-CA") !==
                                dateRange.to.toLocaleDateString("en-CA") &&
                                ` (${toPersianDigits(
                                  Math.ceil(
                                    (dateRange.to.getTime() -
                                      dateRange.from.getTime()) /
                                      (1000 * 60 * 60 * 24) +
                                      1
                                  )
                                )} روز)`}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>ساعت شروع</Label>
                            <TimePicker
                              value={startTime}
                              onChange={setStartTime}
                              placeholder="--:--"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>ساعت پایان</Label>
                            <TimePicker
                              value={endTime}
                              onChange={setEndTime}
                              placeholder="--:--"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="base_price">قیمت (تومان)</Label>
                          <PersianInput
                            id="base_price"
                            name="base_price"
                            min="0"
                            placeholder="۵۰۰۰۰۰"
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={creating}>
                            {creating ? (
                              <>
                                <Loader2 className="ml-1.5 size-4 animate-spin" />
                                {toPersianDigits(createCount)}/
                                {toPersianDigits(createTotal)}
                              </>
                            ) : (
                              "ثبت سانس‌ها"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Slot list */}
          <div className="space-y-2">
            {slotsForDate.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center text-muted-foreground">
                <CalendarDays className="size-10 opacity-30" />
                <div>
                  <p className="text-sm font-medium">
                    سانسی برای این تاریخ ثبت نشده
                  </p>
                  <p className="mt-1 text-xs opacity-70">
                    {canManage
                      ? "از دکمه افزودن استفاده کنید"
                      : "تاریخ دیگری انتخاب کنید"}
                  </p>
                </div>
              </div>
            ) : (
              slotsForDate.map((slot) => (
                <div
                  key={slot.id}
                  className={`group flex items-center justify-between rounded-xl border-2 p-4 transition-all ${
                    slot.is_reserved
                      ? "border-destructive/30 bg-destructive/5 dark:border-destructive/20"
                      : "border-border/50 bg-card hover:border-primary/30 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex size-11 items-center justify-center rounded-xl ${
                        slot.is_reserved
                          ? "bg-red-100 text-red-500 dark:bg-red-900/20"
                          : "bg-green-100 text-green-600 dark:bg-green-900/20"
                      }`}
                    >
                      {slot.is_reserved ? (
                        <XCircle className="size-5" />
                      ) : (
                        <CheckCircle2 className="size-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm leading-tight font-bold">
                        {formatTime(slot.start_time)}
                        <span className="mx-1.5 text-muted-foreground/40">
                          —
                        </span>
                        {formatTime(slot.end_time)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatPrice(slot.base_price)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={slot.is_reserved ? "secondary" : "outline"}
                      className={`shrink-0 ${
                        slot.is_reserved
                          ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          : "border-primary/30 text-green-600 dark:border-primary/30"
                      }`}
                    >
                      {slot.is_reserved ? "رزرو" : "آزاد"}
                    </Badge>
                    {!slot.is_reserved && canManage && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleDeleteSlot(slot)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
