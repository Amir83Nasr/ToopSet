"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm, useWatch, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { courtCreateSchema, type CourtCreateInput } from "@/lib/validations"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/lib/toast"
import { api, ApiError } from "@/lib/api"
import { AmenityCheckboxes } from "@/components/courts/amenity-checkboxes"
import { ImageUpload } from "@/components/courts/image-upload"
import dynamic from "next/dynamic"
const LocationPicker = dynamic(
  () =>
    import("@/components/courts/location-picker").then((m) => ({
      default: m.LocationPicker,
    })),
  { ssr: false }
)
import {
  Building2,
  MapPin,
  Image as ImageIcon,
  Users,
  Settings2,
  ArrowRight,
} from "lucide-react"
import { PersianInput } from "@/components/ui/persian-input"

const sportTypes = [
  { value: "volleyball", label: "والیبال" },
  { value: "basketball", label: "بسکتبال" },
  { value: "futsal", label: "فوتسال" },
  { value: "handball", label: "هندبال" },
]

export default function CreateCourtPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [checking, setChecking] = useState(true)
  const [existingCourtId, setExistingCourtId] = useState<number | null>(null)
  const [courtImages, setCourtImages] = useState<string[]>([])
  const [tempIds, setTempIds] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CourtCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(courtCreateSchema) as any,
    defaultValues: {
      name: "",
      sport_types: [],
      address: "",
      latitude: undefined,
      longitude: undefined,
      capacity: 10,
      amenities: {},
      images: [],
    },
  })
  const selectedSports: string[] =
    (useWatch({ control, name: "sport_types" }) as string[]) || []
  const amenitiesValue = useWatch({ control, name: "amenities" }) || {}
  const latitudeWatch = useWatch({ control, name: "latitude" })
  const longitudeWatch = useWatch({ control, name: "longitude" })

  /* Check if manager already has a court */
  useEffect(() => {
    async function check() {
      try {
        const res = await api<{ courts: { id: number }[]; total: number }>(
          "/api/v1/courts?skip=0&limit=1"
        )
        if (res.total > 0) {
          setExistingCourtId(res.courts[0].id)
        }
      } catch {
        // ignore — let the form render
      } finally {
        setChecking(false)
      }
    }
    const timer = setTimeout(() => check(), 0)
    return () => clearTimeout(timer)
  }, [])

  async function onSubmit(data: CourtCreateInput) {
    try {
      await api("/api/v1/courts", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          sport_types: data.sport_types,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          capacity: data.capacity,
          amenities: data.amenities || {},
          temp_ids: tempIds,
        }),
      })
      toast.success("مجموعه ورزشی با موفقیت ایجاد شد", {
        description: "پس از تأیید مدیریت در دسترس کاربران قرار می‌گیرد.",
      })
      router.push("/dashboard/courts")
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "خطا در ایجاد مجموعه"
      toast.error(message)
    }
  }

  function toggleSport(value: string) {
    const current = selectedSports
    if (current.includes(value)) {
      setValue("sport_types", current.filter((s) => s !== value) as never, {
        shouldValidate: true,
      })
    } else {
      setValue("sport_types", [...current, value] as never, {
        shouldValidate: true,
      })
    }
  }

  /* Loading check */
  if (checking) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  /* Already has a court — redirect or show message */
  if (existingCourtId) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20">
        <Building2 className="size-16 text-muted-foreground" />
        <div className="text-center">
          <h1 className="text-xl font-semibold">
            شما قبلاً یک مجموعه ثبت کرده‌اید
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            هر مدیر فقط می‌تواند یک مجموعه داشته باشد
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/dashboard/courts">مشاهده مجموعه‌ها</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/courts">بازگشت به لیست</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-12">
      <div className="mb-8">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowRight className="ml-2 size-4" />
          بازگشت
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          ثبت مجموعه ورزشی جدید
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          اطلاعات مجموعه ورزشی خود را وارد کنید. پس از تأیید مدیریت، در دسترس
          کاربران قرار می‌گیرد.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-3xl space-y-6"
      >
        {/* Basic Info */}
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">اطلاعات پایه</h2>
              <p className="text-xs text-muted-foreground">
                نام و مشخصات اصلی مجموعه
              </p>
            </div>
          </div>
          <div className="space-y-5">
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
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {sportTypes.map((sport) => {
                  const checked = selectedSports.includes(sport.value)
                  return (
                    <label
                      key={sport.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                        checked
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30 hover:bg-accent/30"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSport(sport.value)}
                      />
                      {sport.label}
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
          </div>
        </div>

        {/* Location */}
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">موقعیت و آدرس</h2>
              <p className="text-xs text-muted-foreground">
                مکان دقیق مجموعه را مشخص کنید
              </p>
            </div>
          </div>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="address">آدرس کامل</Label>
              <Textarea
                id="address"
                placeholder="استان، شهر، خیابان، پلاک"
                className="min-h-[80px]"
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
                  setValue("latitude", lat, { shouldValidate: true })
                  setValue("longitude", lng, { shouldValidate: true })
                  if (address)
                    setValue("address", address, { shouldValidate: true })
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
          </div>
        </div>

        {/* Capacity */}
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">ظرفیت</h2>
              <p className="text-xs text-muted-foreground">
                تعداد نفراتی که هم‌زمان می‌توانند حضور داشته باشند
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacity">ظرفیت مجموعه</Label>
            <Controller
              name="capacity"
              control={control}
              render={({ field }) => (
                <PersianInput
                  id="capacity"
                  placeholder="۱۰"
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value, 10) || 0)
                  }
                  onBlur={field.onBlur}
                  className="max-w-[120px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              )}
            />
            {errors.capacity?.message && (
              <p className="text-xs text-destructive">
                {String(errors.capacity.message)}
              </p>
            )}
          </div>
        </div>

        {/* Amenities */}
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings2 className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">امکانات</h2>
              <p className="text-xs text-muted-foreground">
                امکانات موجود در مجموعه را انتخاب کنید
              </p>
            </div>
          </div>
          <AmenityCheckboxes
            value={amenitiesValue as Record<string, boolean>}
            onChange={(v) => setValue("amenities", v)}
          />
        </div>

        {/* Images */}
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ImageIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">تصاویر</h2>
              <p className="text-xs text-muted-foreground">
                حداقل ۳ تصویر از مجموعه آپلود کنید
              </p>
            </div>
          </div>
          <ImageUpload
            images={courtImages}
            onChange={(newImages) => {
              setCourtImages(newImages)
              setValue("images", newImages, { shouldValidate: true })
            }}
            tempIds={tempIds}
            onTempIdsChange={setTempIds}
          />
          {errors.images && (
            <p className="mt-2 text-xs text-destructive">
              {String(errors.images.message || errors.images.root?.message)}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:text-right">
            <div className="flex-1 text-center sm:text-right">
              <h3 className="text-sm font-semibold">آماده ثبت هستید؟</h3>
              <p className="text-xs text-muted-foreground">
                پس از ثبت، مجموعه شما توسط مدیریت بررسی و تأیید خواهد شد و تا
                قبل از تأیید در لیست عمومی نمایش داده نمی‌شود.
              </p>
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-11 min-w-[160px] gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  در حال ثبت...
                </>
              ) : (
                "ثبت مجموعه"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
