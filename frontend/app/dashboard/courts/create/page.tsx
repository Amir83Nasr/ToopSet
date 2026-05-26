"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { courtCreateSchema } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api"
import { AmenityCheckboxes } from "@/components/courts/amenity-checkboxes"
import { ArrowRight } from "lucide-react"

const sportTypes = [
  { value: "volleyball", label: "والیبال" },
  { value: "basketball", label: "بسکتبال" },
  { value: "futsal", label: "فوتسال" },
  { value: "handball", label: "هندبال" },
]

export default function CreateCourtPage() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm({ resolver: zodResolver(courtCreateSchema) as any })

  async function onSubmit(data: Record<string, unknown>) {
    try {
      await api("/api/v1/courts", {
        method: "POST",
        body: JSON.stringify({ ...data, amenities: data.amenities || {} }),
      })
      toast.success("زمین با موفقیت ایجاد شد")
      router.push("/dashboard/courts")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "خطا در ایجاد زمین"
      toast.error(message)
    }
  }

  const sportTypeValue = watch("sport_type")
  const amenitiesValue = watch("amenities") || {}

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
              <Input id="name" placeholder="مثلاً سالن ۱" {...register("name")} />
              {errors.name?.message && (
                <p className="text-sm text-destructive">{String(errors.name.message)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sport_type">نوع ورزش</Label>
              <Select
                value={sportTypeValue || ""}
                onValueChange={(v) => {
                  setValue("sport_type", v, { shouldValidate: true, shouldDirty: true })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب ورزش" />
                </SelectTrigger>
                <SelectContent>
                  {sportTypes.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sport_type?.message && (
                <p className="text-sm text-destructive">{String(errors.sport_type.message)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">آدرس</Label>
              <Textarea id="address" placeholder="آدرس کامل زمین" {...register("address")} />
              {errors.address?.message && (
                <p className="text-sm text-destructive">{String(errors.address.message)}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">عرض جغرافیایی</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="35.6892"
                  {...register("latitude", { valueAsNumber: true })}
                />
                {errors.latitude?.message && (
                  <p className="text-sm text-destructive">{String(errors.latitude.message)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">طول جغرافیایی</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="51.3890"
                  {...register("longitude", { valueAsNumber: true })}
                />
                {errors.longitude?.message && (
                  <p className="text-sm text-destructive">{String(errors.longitude.message)}</p>
                )}
              </div>
            </div>
            <AmenityCheckboxes
              value={amenitiesValue}
              onChange={(v) => setValue("amenities", v)}
            />
            <div className="space-y-2">
              <Label htmlFor="capacity">ظرفیت (تعداد نفر)</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="۲۰"
                {...register("capacity", { valueAsNumber: true })}
              />
              {errors.capacity?.message && (
                <p className="text-sm text-destructive">{String(errors.capacity.message)}</p>
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
