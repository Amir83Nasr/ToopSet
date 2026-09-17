"use client"

import { Controller, type UseFormReturn } from "react-hook-form"
import type { VendorUpdateInput } from "@/lib/validations"
import type { VendorData } from "@/components/vendors/vendor-shared"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { PersianInput } from "@/components/ui/persian-input"
import { toPersianDigits } from "@/lib/utils"
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

const sportTypes = [
  { value: "volleyball", label: "والیبال" },
  { value: "basketball", label: "بسکتبال" },
  { value: "futsal", label: "فوتسال" },
  { value: "handball", label: "هندبال" },
  { value: "football", label: "فوتبال" },
]

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
      className="min-w-0 space-y-4"
    >
      {/* ── مشخصات مجموعه ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            مشخصات مجموعه
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">وضعیت</span>
            <Badge variant={vendor.is_active ? "default" : "secondary"}>
              {vendor.is_active ? "فعال" : "غیرفعال"}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>ورزش‌ها</Label>
            <div className="flex flex-wrap gap-2">
              {sportTypes.map((sport) => {
                const checked = watchSportTypes.includes(sport.value)
                return (
                  <button
                    type="button"
                    key={sport.value}
                    onClick={() => toggleSportType(sport.value)}
                    aria-pressed={checked}
                    className={`rounded-full border px-4 py-2 text-[13px] transition-colors ${
                      checked
                        ? "border-primary bg-primary/5 font-medium text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {sport.label}
                  </button>
                )
              })}
            </div>
            {errors.sport_types?.message && (
              <p className="text-xs text-destructive">
                {String(errors.sport_types.message)}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <Controller
              name="ball_available"
              control={control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2.5">
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
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">ارائه توپ</span>
                    <span className="block text-xs text-muted-foreground">
                      با هزینه جداگانه هنگام رزرو
                    </span>
                  </span>
                </label>
              )}
            />

            {ballAvailable && (
              <Controller
                name="ball_price"
                control={control}
                render={({ field }) => (
                  <div className="max-w-xs space-y-2">
                    <Label htmlFor="vendor-ball-price">هزینه توپ (تومان)</Label>
                    <PersianInput
                      id="vendor-ball-price"
                      value={field.value ?? 0}
                      formatThousands
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
                  </div>
                )}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── اطلاعات تماس ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            اطلاعات تماس
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manager_name">نام مدیر</Label>
              <Input
                id="manager_name"
                placeholder="نام و نام خانوادگی"
                className="h-10"
                {...register("manager_name")}
              />
              {errors.manager_name?.message && (
                <p className="text-xs text-destructive">
                  {String(errors.manager_name.message)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager_phone">شماره تماس</Label>
              <Controller
                name="manager_phone"
                control={control}
                render={({ field }) => (
                  <PersianInput
                    id="manager_phone"
                    dir="ltr"
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="h-10 text-left"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={field.onBlur}
                  />
                )}
              />
              {errors.manager_phone?.message && (
                <p className="text-xs text-destructive">
                  {String(errors.manager_phone.message)}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            تغییر شماره تماس، شماره ورود به حساب مدیر را هم تغییر می‌دهد.
          </p>
        </CardContent>
      </Card>

      {/* ── موقعیت مکانی ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            موقعیت مکانی
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">آدرس</Label>
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="address"
                  placeholder="استان، شهر، خیابان، پلاک"
                  className="min-h-24"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(toPersianDigits(e.target.value))
                  }
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.address?.message && (
              <p className="text-xs text-destructive">
                {String(errors.address.message)}
              </p>
            )}
          </div>
          <div className="space-y-2">
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
            <p className="text-xs text-muted-foreground">
              برای تغییر، روی نقشه کلیک کنید یا نشانگر را بکشید.
            </p>
            {(errors.latitude?.message || errors.longitude?.message) && (
              <p className="text-xs text-destructive">
                {String(errors.latitude?.message || errors.longitude?.message)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── امکانات و تصاویر ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            امکانات و تصاویر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>امکانات</Label>
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
          <Separator />
          <div className="space-y-3">
            <Label>تصاویر</Label>
            <ImageUpload
              images={vendorImages}
              onChange={onImagesChange}
              tempIds={imageTempIds}
              onTempIdsChange={onTempIdsChange}
            />
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
