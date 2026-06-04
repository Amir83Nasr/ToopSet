"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { toast } from "@/lib/toast"
import { RefreshCw, Settings2, Save, Type } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface Setting {
  id: number
  key: string
  value: string
  description: string | null
  created_at: string
  updated_at: string
}

const settingLabels: Record<string, string> = {
  platform_name: "نام پلتفرم",
  support_phone: "شماره پشتیبانی",
  support_email: "ایمیل پشتیبانی",
  commission_percent: "درصد کمیسیون",
  cancel_window_hours: "مهلت کنسل کردن (ساعت)",
  rules_text: "متن قوانین و مقررات",
  faq_text: "متن سوالات متداول",
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [values, setValues] = useState<Record<number, string>>({})

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<Setting[]>("/api/v1/admin/settings")
      setSettings(data)
      const map: Record<number, string> = {}
      for (const s of data) {
        map[s.id] = s.value
      }
      setValues(map)
    } catch {
      toast.error("خطا در دریافت تنظیمات")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSettings(), 0)
    return () => clearTimeout(timer)
  }, [fetchSettings])

  const handleSave = useCallback(
    async (setting: Setting) => {
      setSavingId(setting.id)
      try {
        const updated = await api<Setting>(
          `/api/v1/admin/settings/${setting.id}`,
          {
            method: "PUT",
            body: JSON.stringify({ value: values[setting.id] }),
          }
        )
        setSettings((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        )
        toast.success(`${settingLabels[setting.key] || setting.key} ذخیره شد`)
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "خطا در ذخیره")
      } finally {
        setSavingId(null)
      }
    },
    [values]
  )

  const handleSeed = useCallback(async () => {
    try {
      const res = await api<{ seeded: number }>("/api/v1/admin/settings/seed", {
        method: "POST",
      })
      toast.success(`${res.seeded} تنظیم پیش‌فرض اضافه شد`)
      fetchSettings()
    } catch {
      toast.error("خطا در ایجاد تنظیمات پیش‌فرض")
    }
  }, [fetchSettings])

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            تنظیمات سیستم
          </h1>
          <p className="text-muted-foreground">مدیریت تنظیمات سراسری پلتفرم</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed}>
            <Settings2 className="ml-1 size-4" />
            تنظیمات پیش‌فرض
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSettings}
            disabled={loading}
          >
            <RefreshCw
              className={`ml-1 size-4 ${loading ? "animate-spin" : ""}`}
            />
            بروزرسانی
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : settings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <Settings2 className="size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              هیچ تنظیماتی تعریف نشده
            </p>
            <Button variant="outline" onClick={handleSeed}>
              ایجاد تنظیمات پیش‌فرض
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollReveal>
          <div className="grid gap-4 md:grid-cols-2">
            {settings.map((setting) => (
              <Card key={setting.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {settingLabels[setting.key] || setting.key}
                  </CardTitle>
                  {setting.description && (
                    <p className="text-sm text-muted-foreground">
                      {setting.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {setting.key.endsWith("_text") ? (
                      <Textarea
                        value={values[setting.id] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [setting.id]: e.target.value,
                          }))
                        }
                        placeholder="مقدار..."
                        className="min-h-[150px]"
                      />
                    ) : (
                      <Input
                        value={values[setting.id] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [setting.id]: e.target.value,
                          }))
                        }
                        placeholder="مقدار..."
                      />
                    )}
                    <Button
                      variant="default"
                      size="icon"
                      disabled={savingId === setting.id}
                      onClick={() => handleSave(setting)}
                      title="ذخیره"
                    >
                      <Save className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollReveal>
      )}
    </div>
  )
}
