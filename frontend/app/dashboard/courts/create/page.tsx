"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { ArrowRight } from "lucide-react"

const sportTypes = [
  { value: "volleyball", label: "والیبال" },
  { value: "basketball", label: "بسکتبال" },
  { value: "futsal", label: "فوتسال" },
  { value: "handball", label: "هندبال" },
]

export default function CreateCourtPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

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
      await api("/api/v1/courts", {
        method: "POST",
        body: JSON.stringify(data),
      })
      toast.success("زمین با موفقیت ایجاد شد")
      router.push("/dashboard/courts")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "خطا در ایجاد زمین"
      toast.error(message)
    } finally {
      setSubmitting(false)
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام زمین</Label>
              <Input id="name" name="name" placeholder="مثلاً سالن ۱" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sport_type">نوع ورزش</Label>
              <Select name="sport_type" required>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">آدرس</Label>
              <Textarea id="address" name="address" placeholder="آدرس کامل زمین" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">عرض جغرافیایی</Label>
                <Input id="latitude" name="latitude" type="number" step="any" placeholder="35.6892" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">طول جغرافیایی</Label>
                <Input id="longitude" name="longitude" type="number" step="any" placeholder="51.3890" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">ظرفیت (تعداد نفر)</Label>
              <Input id="capacity" name="capacity" type="number" min="1" placeholder="۲۰" required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "در حال ثبت..." : "ثبت زمین"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
