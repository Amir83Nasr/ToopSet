"use client"

import { Controller, type UseFormReturn } from "react-hook-form"
import type { VendorUpdateInput } from "@/lib/validations"
import type { VendorData } from "@/components/vendors/vendor-shared"
import { toPersianDigits } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { PersianInput } from "@/components/ui/persian-input"
import { AmenityCheckboxes } from "@/components/vendors/amenity-checkboxes"
import { ImageUpload } from "@/components/vendors/image-upload"
import { MapPin, Phone, User, Volleyball } from "lucide-react"
import dynamic from "next/dynamic"

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

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-6 w-1 rounded-full bg-primary/60" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  )
}

interface VendorDetailsTabProps {
  vendor: VendorData
  form: UseFormReturn<VendorUpdateInput>
  watchSportTypes: string[]
  latitudeWatch: number | undefined
  longitudeWatch: number | undefined
  vendorImages: string[]
  imageTempIds: string[]
  onImagesChange: (images: string[]) => void
  onTempIdsChange: (ids: string[]) => void
  onSubmit: (data: VendorUpdateInput) => void
}

export function VendorDetailsTab({
  vendor,
  form,
  watchSportTypes,
  latitudeWatch,
  longitudeWatch,
  vendorImages,
  imageTempIds,
  onImagesChange,
  onTempIdsChange,
  onSubmit,
}: VendorDetailsTabProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = form
  const ballAvailable = form.watch("ball_available") === true

  function toggleSportType(value: string) {
    const next = watchSportTypes.includes(value)
      ? watchSportTypes.filter((sport) => sport !== value)
      : [...watchSportTypes, value]

    setValue("sport_types", next as VendorUpdateInput["sport_types"], {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  return (
    <form
      id="edit-form"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      {/* ── اطلاعات اصلی ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <SectionTitle title="اطلاعات اصلی مجموعه" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
                      field.onChange(Number.parseInt(e.target.value, 10) || 0)
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

          {/* وضعیت */}
          <div className="flex items-center gap-3">
            <Label>وضعیت مجموعه</Label>
            <Badge variant={vendor.is_active ? "default" : "secondary"}>
              {vendor.is_active ? "فعال" : "غیرفعال"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── ورزش‌های قابل ارائه ── */}
      <Card>
        <CardHeader>
          <CardTitle>
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
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                      <svg className="size-3" viewBox="0 0 12 12" fill="none">
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
        </CardContent>
      </Card>

      {/* ── توپ مجموعه ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <SectionTitle title="توپ مجموعه" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Controller
            name="ball_available"
            control={control}
            render={({ field }) => (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(checked) => {
                    const enabled = checked === true
                    field.onChange(enabled)
                    if (!enabled) {
                      setValue("ball_price", 0, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  }}
                  aria-label="مجموعه توپ برای رزرو دارد"
                />
                <Volleyball className="size-5 shrink-0 text-primary" />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">
                    مجموعه توپ برای رزرو دارد
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    در صورت فعال بودن، کاربر می‌تواند هنگام رزرو سانس توپ را با
                    هزینه جداگانه اضافه کند.
                  </span>
                </span>
              </label>
            )}
          />

          <Controller
            name="ball_price"
            control={control}
            render={({ field }) => (
              <div className="max-w-sm space-y-2">
                <Label htmlFor="vendor-ball-price">هزینه توپ (تومان)</Label>
                <PersianInput
                  id="vendor-ball-price"
                  value={field.value ?? 0}
                  formatThousands
                  disabled={!ballAvailable}
                  placeholder="مثلاً ۵۰٬۰۰۰"
                  onChange={(event) =>
                    field.onChange(Number(event.target.value) || 0)
                  }
                  onBlur={field.onBlur}
                />
                {errors.ball_price?.message && (
                  <p className="text-xs text-destructive">
                    {String(errors.ball_price.message)}
                  </p>
                )}
                {!ballAvailable && (
                  <p className="text-xs text-muted-foreground">
                    برای مجموعه بدون توپ، هزینه صفر در نظر گرفته می‌شود.
                  </p>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* ── اطلاعات تماس ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <SectionTitle title="اطلاعات تماس" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <User className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">نام مدیر</div>
                <div className="truncate text-sm font-medium">
                  {vendor.manager_name || "ثبت نشده"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">شماره تماس</div>
                <div className="truncate text-sm font-medium" dir="ltr">
                  {vendor.manager_phone
                    ? toPersianDigits(vendor.manager_phone)
                    : "ثبت نشده"}
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            اطلاعات تماس از پروفایل مدیر مجموعه دریافت می‌شود.
          </p>
        </CardContent>
      </Card>

      {/* ── موقعیت مکانی ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            <SectionTitle title="موقعیت مکانی" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            {(errors.latitude?.message || errors.longitude?.message) && (
              <p className="text-xs text-destructive">
                {String(errors.latitude?.message || errors.longitude?.message)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── امکانات + تصاویر ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <SectionTitle title="امکانات" />
            </CardTitle>
          </CardHeader>
          <CardContent>
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
        <Card>
          <CardHeader>
            <CardTitle>
              <SectionTitle title="تصاویر" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              images={vendorImages}
              onChange={onImagesChange}
              tempIds={imageTempIds}
              onTempIdsChange={onTempIdsChange}
            />
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
