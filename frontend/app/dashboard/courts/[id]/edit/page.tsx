"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { courtUpdateSchema, type CourtUpdateInput } from "@/lib/validations"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { AmenityCheckboxes } from "@/components/courts/amenity-checkboxes"
import { ImageUpload } from "@/components/courts/image-upload"
import dynamic from "next/dynamic"
const LocationPicker = dynamic(() => import("@/components/courts/location-picker").then((m) => ({ default: m.LocationPicker })), { ssr: false })
import { ArrowRight, Loader2 } from "lucide-react"

const sportTypes = [
  { value: "volleyball", label: "والیبال" },
  { value: "basketball", label: "بسکتبال" },
  { value: "futsal", label: "فوتسال" },
  { value: "handball", label: "هندبال" },
]

export default function EditCourtPage() {
  const params = useParams()
  const router = useRouter()
  const courtId = Number(params.id)

  const [courtData, setCourtData] = useState<CourtUpdateInput | undefined>(undefined)
  const [courtImages, setCourtImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CourtUpdateInput>({
    resolver: zodResolver(courtUpdateSchema as any),
    values: courtData,
  })

  useEffect(() => {
    api<{
      name: string
      sport_types: string[]
      address: string
      latitude: number
      longitude: number
      capacity: number
    }>(`/api/v1/courts/${courtId}`)
      .then((data) => {
        setCourtData({
          name: data.name,
          sport_types: data.sport_types as CourtUpdateInput["sport_types"],
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          capacity: data.capacity,
          amenities: (data as any).amenities || {},
        });
        setCourtImages((data as any).images || []);
      })
    .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else {
          toast.error("خطا در دریافت اطلاعات زمین")
        }
      })
      .finally(() => setLoading(false))
  }, [courtId])

  async function onSubmit(data: CourtUpdateInput) {
    try {
      await api(`/api/v1/courts/${courtId}`, {
        method: "PATCH",
        body: JSON.stringify({ ...data, images: courtImages }),
      })
      toast.success("زمین با موفقیت ویرایش شد")
      router.push(`/dashboard/courts/${courtId}`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ویرایش زمین"
      toast.error(msg)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="ml-2 size-5 animate-spin" />
        در حال بارگذاری...
      </div>
    )
  }

  if (notFound || !courtData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-xl text-muted-foreground">زمین مورد نظر یافت نشد</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/courts")}>
          <ArrowRight className="ml-2 size-4" />
          بازگشت به لیست
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
        <ArrowRight className="ml-2 size-4" />
        بازگشت
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>ویرایش زمین</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام زمین</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>نوع ورزش (حداقل یکی)</Label>
              <div className="grid grid-cols-2 gap-2">
                {sportTypes.map((sport) => {
                  const selectedSports = (watch("sport_types") || []) as string[]
                  const checked = selectedSports.includes(sport.value)
                  return (
                    <label
                      key={sport.value}
                      className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-all ${
                        checked ? "border-primary bg-primary/5 shadow-sm" : ""
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => {
                          const current: string[] = (watch("sport_types") || []) as string[]
                          if (current.includes(sport.value)) {
                            setValue("sport_types" as any, current.filter((s) => s !== sport.value), { shouldValidate: true })
                          } else {
                            setValue("sport_types" as any, [...current, sport.value], { shouldValidate: true })
                          }
                        }}
                      />
                      <span className="text-sm font-medium">{sport.label}</span>
                    </label>
                  )
                })}
              </div>
              {errors.sport_types?.message && (
                <p className="text-sm text-destructive">{errors.sport_types.message as string}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">آدرس</Label>
              <Textarea id="address" {...register("address")} />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>موقعیت روی نقشه</Label>
              <LocationPicker
                latitude={watch("latitude") ?? null}
                longitude={watch("longitude") ?? null}
                onLocationChange={(lat, lng, address) => {
                  setValue("latitude", lat, { shouldValidate: true })
                  setValue("longitude", lng, { shouldValidate: true })
                  if (address) {
                    setValue("address", address, { shouldValidate: true })
                  }
                }}
              />
              {errors.latitude?.message && (
                <p className="text-sm text-destructive">{errors.latitude.message as string}</p>
              )}
              {errors.longitude?.message && (
                <p className="text-sm text-destructive">{errors.longitude.message as string}</p>
              )}
            </div>
            <Controller
              name="amenities"
              control={control}
              render={({ field }) => (
                <AmenityCheckboxes value={(field.value || {}) as Record<string, boolean>} onChange={field.onChange} />
              )}
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
                min="1"
                {...register("capacity")}
              />
              {errors.capacity && (
                <p className="text-sm text-destructive">{errors.capacity.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
