"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch, Controller, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { vendorCreateSchema, type VendorCreateInput } from "@/lib/validations"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/lib/toast"
import { api, ApiError } from "@/lib/api"
import { AmenityCheckboxes } from "@/components/vendors/amenity-checkboxes"
import { ImageUpload } from "@/components/vendors/image-upload"
import dynamic from "next/dynamic"
const LocationPicker = dynamic(
  () =>
    import("@/components/vendors/location-picker").then((m) => ({
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
  { value: "football", label: "فوتبال" },
]

export default function CreateVendorPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()

  void refreshUser
  const [vendorImages, setVendorImages] = useState<string[]>([])
  const [tempIds, setTempIds] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<VendorCreateInput>({
    resolver: zodResolver(vendorCreateSchema) as Resolver<VendorCreateInput>,
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

  async function onSubmit(data: VendorCreateInput) {
    try {
      await api("/api/v1/vendors", {
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
      router.push("/dashboard/vendors")
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
                  className="max-w-30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
            images={vendorImages}
            onChange={(newImages) => {
              setVendorImages(newImages)
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
              className="h-11 min-w-40 gap-2"
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
