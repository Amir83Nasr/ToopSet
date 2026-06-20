"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { courtUpdateSchema, type CourtUpdateInput } from "@/lib/validations"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/lib/toast"
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
import { ArrowRight, Loader2 } from "lucide-react"
import { PersianInput } from "@/components/ui/persian-input"

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

  const [courtData, setCourtData] = useState<CourtUpdateInput | undefined>(
    undefined
  )
  const [courtImages, setCourtImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CourtUpdateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(courtUpdateSchema) as any,
    values: courtData,
  })
  const sportTypesWatch = (useWatch({ control, name: "sport_types" }) ||
    []) as string[]
  const latitudeWatch = useWatch({ control, name: "latitude" })
  const longitudeWatch = useWatch({ control, name: "longitude" })

  useEffect(() => {
    api<{
      name: string
      sport_types: string[]
      address: string
      latitude: number
      longitude: number
      capacity: number
      amenities?: Record<string, boolean>
      images?: string[]
    }>(`/api/v1/courts/${courtId}`)
      .then((data) => {
        setCourtData({
          name: data.name,
          sport_types: data.sport_types as CourtUpdateInput["sport_types"],
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          capacity: data.capacity,
          amenities: data.amenities || {},
        })
        setCourtImages(data.images || [])
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else {
          toast.error("خطا در دریافت اطلاعات مجموعه")
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
      toast.success("مجموعه با موفقیت ویرایش شد")
      router.push("/dashboard/courts")
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ویرایش مجموعه"
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
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-xl text-muted-foreground">
          مجموعه مورد نظر یافت نشد
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/courts")}
        >
          <ArrowRight className="ml-1.5 size-4" />
          بازگشت به لیست
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button
        variant="outline"
        size="sm"
        className="mb-4"
        onClick={() => router.back()}
      >
        <ArrowRight className="ml-1.5 size-4" />
        بازگشت
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>ویرایش مجموعه</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام مجموعه</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>نوع ورزش (حداقل یکی)</Label>
              <div className="grid grid-cols-2 gap-2">
                {sportTypes.map((sport) => {
                  const selectedSports = sportTypesWatch
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
                        onCheckedChange={() => {
                          const current = selectedSports
                          if (current.includes(sport.value)) {
                            setValue(
                              "sport_types",
                              current.filter(
                                (s) => s !== sport.value
                              ) as CourtUpdateInput["sport_types"],
                              {
                                shouldValidate: true,
                              }
                            )
                          } else {
                            setValue(
                              "sport_types",
                              [
                                ...current,
                                sport.value,
                              ] as CourtUpdateInput["sport_types"],
                              {
                                shouldValidate: true,
                              }
                            )
                          }
                        }}
                      />
                      <span className="text-sm font-medium">{sport.label}</span>
                    </label>
                  )
                })}
              </div>
              {errors.sport_types?.message && (
                <p className="text-sm text-destructive">
                  {errors.sport_types.message as string}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">آدرس</Label>
              <Textarea id="address" {...register("address")} />
              {errors.address && (
                <p className="text-sm text-destructive">
                  {errors.address.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>موقعیت روی نقشه</Label>
              <LocationPicker
                latitude={latitudeWatch ?? null}
                longitude={longitudeWatch ?? null}
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
                  {errors.latitude.message as string}
                </p>
              )}
              {errors.longitude?.message && (
                <p className="text-sm text-destructive">
                  {errors.longitude.message as string}
                </p>
              )}
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
            <div className="space-y-2">
              <Label>تصاویر مجموعه</Label>
              <ImageUpload images={courtImages} onChange={setCourtImages} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">ظرفیت (تعداد نفر)</Label>
              <PersianInput id="capacity" min="1" {...register("capacity")} />
              {errors.capacity && (
                <p className="text-sm text-destructive">
                  {errors.capacity.message}
                </p>
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
