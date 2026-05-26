"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api, ApiError } from "@/lib/api"
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
import { ArrowRight, Loader2 } from "lucide-react"

const sportTypes = [
  { value: "volleyball", label: "والیبال" },
  { value: "basketball", label: "بسکتبال" },
  { value: "futsal", label: "فوتسال" },
  { value: "handball", label: "هندبال" },
]

interface CourtFormData {
  name: string
  sport_type: string
  address: string
  latitude: string
  longitude: string
  capacity: string
}

export default function EditCourtPage() {
  const params = useParams()
  const router = useRouter()
  const courtId = Number(params.id)

  const [formData, setFormData] = useState<CourtFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    api<{
      name: string
      sport_type: string
      address: string
      latitude: number
      longitude: number
      capacity: number
    }>(`/api/v1/courts/${courtId}`)
      .then((data) => {
        setFormData({
          name: data.name,
          sport_type: data.sport_type,
          address: data.address,
          latitude: String(data.latitude),
          longitude: String(data.longitude),
          capacity: String(data.capacity),
        })
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)

    const form = new FormData(e.currentTarget)
    const data = {
      name: form.get("name") as string,
      sport_type: form.get("sport_type") as string,
      address: form.get("address") as string,
      latitude: parseFloat(form.get("latitude") as string),
      longitude: parseFloat(form.get("longitude") as string),
      capacity: parseInt(form.get("capacity") as string, 10),
    }

    try {
      await api(`/api/v1/courts/${courtId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      })
      toast.success("زمین با موفقیت ویرایش شد")
      router.push(`/dashboard/courts/${courtId}`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ویرایش زمین"
      toast.error(msg)
    } finally {
      setSubmitting(false)
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

  if (notFound || !formData) {
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام زمین</Label>
              <Input
                id="name"
                name="name"
                defaultValue={formData.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sport_type">نوع ورزش</Label>
              <Select name="sport_type" defaultValue={formData.sport_type} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sportTypes.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">آدرس</Label>
              <Textarea
                id="address"
                name="address"
                defaultValue={formData.address}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">عرض جغرافیایی</Label>
                <Input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  defaultValue={formData.latitude}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">طول جغرافیایی</Label>
                <Input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  defaultValue={formData.longitude}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">ظرفیت (تعداد نفر)</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                defaultValue={formData.capacity}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
