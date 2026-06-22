"use client"

import { useCallback, useEffect, useState } from "react"
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
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  type CourtData,
  type TimeSlot,
} from "@/components/courts/court-shared"
import { SlotCalendar } from "@/components/courts/slot-calendar"
import {
  Building2,
  MapPin,
  CalendarPlus,
  Loader2,
  Trash2,
  Eye,
  CalendarDays,
  ArrowRight,
  Save,
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
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [selectedDays, setSelectedDays] = useState<boolean[]>([
    true,
    true,
    true,
    true,
    true,
    true,
    true,
  ])

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
    if (!selectedDays.some(Boolean)) {
      toast.error("حداقل یک روز از هفته را انتخاب کنید")
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
      // Filter by selected days of week
      const persianDayIndex = (current.getDay() + 1) % 7 // 0=Sat … 6=Fri
      if (selectedDays[persianDayIndex]) {
        dates.push(current.toLocaleDateString("en-CA"))
      }
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
          {/* Add button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              مشاهده و مدیریت سانس‌ها در تقویم هفتگی
            </p>
            {canManage && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <CalendarPlus className="ml-1.5 size-4" />
                    افزودن سانس
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
                  <form onSubmit={handleCreateSlot} className="space-y-5">
                    {/* ── Row 1: Date + Time ── */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>بازه تاریخ</Label>
                        <DateRangePicker
                          value={dateRange}
                          onChange={setDateRange}
                          placeholder="از تاریخ تا تاریخ"
                        />
                        {dateRange?.from && dateRange?.to && (
                          <p className="text-[11px] leading-tight text-muted-foreground/70">
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

                      <div className="space-y-1.5">
                        <Label>ساعت</Label>
                        <div className="flex items-center gap-2">
                          <TimePicker
                            value={startTime}
                            onChange={setStartTime}
                            placeholder="شروع"
                          />
                          <span className="shrink-0 text-xs text-muted-foreground/50">
                            تا
                          </span>
                          <TimePicker
                            value={endTime}
                            onChange={setEndTime}
                            placeholder="پایان"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-border/60" />

                    {/* ── Row 2: Days of week ── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>روزهای هفته</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedDays([
                                true,
                                true,
                                true,
                                true,
                                true,
                                true,
                                true,
                              ])
                            }
                            className="text-xs font-medium text-primary/70 transition-colors hover:text-primary"
                          >
                            انتخاب همه
                          </button>
                          <span className="text-muted-foreground/20">·</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedDays([
                                false,
                                false,
                                false,
                                false,
                                false,
                                false,
                                false,
                              ])
                            }
                            className="text-xs font-medium text-muted-foreground/50 transition-colors hover:text-muted-foreground/80"
                          >
                            پاک کردن
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "شنبه",
                          "یکشنبه",
                          "دوشنبه",
                          "سه‌شنبه",
                          "چهارشنبه",
                          "پنجشنبه",
                          "جمعه",
                        ].map((name, i) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setSelectedDays((prev) => {
                                const next = [...prev]
                                next[i] = !next[i]
                                return next
                              })
                            }}
                            className={`rounded-full px-3 py-1.5 text-xs leading-none font-medium transition-all ${
                              selectedDays[i]
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-muted/50 text-muted-foreground/60 hover:bg-muted/80"
                            }`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-border/60" />

                    {/* ── Row 3: Price ── */}
                    <div className="space-y-1.5">
                      <Label htmlFor="base_price">قیمت هر سانس (تومان)</Label>
                      <PersianInput
                        id="base_price"
                        name="base_price"
                        min="0"
                        placeholder="۵۰۰۰۰۰"
                        required
                      />
                    </div>

                    <DialogFooter className="pt-2">
                      <Button type="submit" disabled={creating}>
                        {creating ? (
                          <>
                            <Loader2 className="ml-1.5 size-4 animate-spin" />
                            {toPersianDigits(createCount)}/
                            {toPersianDigits(createTotal)}
                          </>
                        ) : (
                          <>
                            <CalendarPlus className="ml-1.5 size-4" />
                            ثبت سانس‌ها
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Weekly calendar */}
          <SlotCalendar
            slots={allSlots}
            loading={false}
            canManage={canManage}
            onSlotDelete={handleDeleteSlot}
          />
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
