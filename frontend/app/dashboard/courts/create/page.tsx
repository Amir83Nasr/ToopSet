"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { courtCreateSchema } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
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
import { ArrowRight } from "lucide-react"

const sportTypes = [
  { value: "volleyball", label: "والیبال" },
  { value: "basketball", label: "بسکتبال" },
  { value: "futsal", label: "فوتسال" },
  { value: "handball", label: "هندبال" },
]

export default function CreateCourtPage() {
  const router = useRouter()
  const [courtImages, setCourtImages] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm({ resolver: zodResolver(courtCreateSchema) as any })
  const selectedSports: string[] =
    (useWatch({ control, name: "sport_types" }) as string[]) || []
  const amenitiesValue = useWatch({ control, name: "amenities" }) || {}

  async function onSubmit(data: Record<string, unknown>) {
    try {
      await api("/api/v1/courts", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          amenities: data.amenities || {},
          images: courtImages,
        }),
      })
      toast.success("زمین با موفقیت ایجاد شد")
      router.push("/dashboard/courts")
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "خطا در ایجاد زمین"
      toast.error(message)
    }
  }

  function toggleSport(value: string) {
    const current = selectedSports
    if (current.includes(value)) {
      setValue(
        "sport_types",
        current.filter((s) => s !== value),
        { shouldValidate: true }
      )
    } else {
      setValue("sport_types", [...current, value], { shouldValidate: true })
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
        <ArrowRight className="ml-2 size-4" />
        بازگشت
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>ثبت زمین جدید</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام زمین</Label>
              <Input
                id="name"
                placeholder="مثلاً سالن ۱"
                {...register("name")}
              />
              {errors.name?.message && (
                <p className="text-sm text-destructive">
                  {String(errors.name.message)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>نوع ورزش (حداقل یکی)</Label>
              <div className="grid grid-cols-2 gap-2">
                {sportTypes.map((sport) => {
                  const checked = selectedSports.includes(sport.value)
                  return (
                    <label
                      key={sport.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all ${
                        checked ? "border-primary bg-primary/5 shadow-sm" : ""
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSport(sport.value)}
                      />
                      <span className="text-sm font-medium">{sport.label}</span>
                    </label>
                  )
                })}
              </div>
              {errors.sport_types?.message && (
                <p className="text-sm text-destructive">
                  {String(errors.sport_types.message)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">آدرس</Label>
              <Textarea
                id="address"
                placeholder="آدرس کامل زمین"
                {...register("address")}
              />
              {errors.address?.message && (
                <p className="text-sm text-destructive">
                  {String(errors.address.message)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>موقعیت روی نقشه</Label>
              <LocationPicker
                latitude={useWatch({ control, name: "latitude" })}
                longitude={useWatch({ control, name: "longitude" })}
                onLocationChange={(lat, lng, address) => {
                  setValue("latitude", lat, { shouldValidate: true })
                  setValue("longitude", lng, { shouldValidate: true })
                  if (address) {
                    setValue("address", address, { shouldValidate: true })
                  }
                }}
              />
              {errors.latitude?.message && (
                <p className="text-sm text-destructive">
                  {String(errors.latitude.message)}
                </p>
              )}
              {errors.longitude?.message && (
                <p className="text-sm text-destructive">
                  {String(errors.longitude.message)}
                </p>
              )}
            </div>
            <AmenityCheckboxes
              value={amenitiesValue}
              onChange={(v) => setValue("amenities", v)}
            />
            <div className="space-y-2">
              <Label>تصاویر زمین</Label>
              <ImageUpload images={courtImages} onChange={setCourtImages} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">ظرفیت (تعداد نفر)</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="۲۰"
                {...register("capacity", { valueAsNumber: true })}
              />
              {errors.capacity?.message && (
                <p className="text-sm text-destructive">
                  {String(errors.capacity.message)}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "در حال ثبت..." : "ثبت زمین"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
