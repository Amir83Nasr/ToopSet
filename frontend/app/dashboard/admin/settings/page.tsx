"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/lib/toast"
import { toPersianDigits, toEnglishDigits } from "@/lib/utils"
import {
  Check,
  Globe,
  Phone,
  Mail,
  Percent,
  Clock,
  List,
  FileText,
  HelpCircle,
  RefreshCw,
  Loader2,
  Settings2,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface Setting {
  id: number
  key: string
  value: string
  description: string | null
}

interface SettingMeta {
  label: string
  icon: React.ReactNode
  multiline?: boolean
  validate?: (v: string) => string | null
}

const settingMeta: Record<string, SettingMeta> = {
  platform_name: { label: "نام پلتفرم", icon: <Globe className="size-4" /> },
  support_phone: {
    label: "شماره پشتیبانی",
    icon: <Phone className="size-4" />,
  },
  support_email: { label: "ایمیل پشتیبانی", icon: <Mail className="size-4" /> },
  commission_percent: {
    label: "درصد کمیسیون",
    icon: <Percent className="size-4" />,
    validate: (v) => {
      const n = Number(v)
      return n >= 0 && n <= 100 ? null : "مقدار باید بین ۰ تا ۱۰۰ باشد"
    },
  },
  cancel_window_hours: {
    label: "مهلت کنسل کردن (ساعت)",
    icon: <Clock className="size-4" />,
    validate: (v) => {
      const n = Number(v)
      return n >= 1 ? null : "مقدار باید حداقل ۱ باشد"
    },
  },
  pagination_limit: {
    label: "تعداد آیتم در هر صفحه",
    icon: <List className="size-4" />,
    validate: (v) => {
      const n = Number(v)
      return n >= 1 && Number.isInteger(n)
        ? null
        : "مقدار باید یک عدد صحیح مثبت باشد"
    },
  },
  rules_text: {
    label: "قوانین و مقررات",
    icon: <FileText className="size-4" />,
    multiline: true,
  },
  faq_text: {
    label: "سوالات متداول",
    icon: <HelpCircle className="size-4" />,
    multiline: true,
  },
}

const sections: { title: string; keys: string[] }[] = [
  {
    title: "اطلاعات پلتفرم",
    keys: ["platform_name", "support_phone", "support_email"],
  },
  {
    title: "تنظیمات سیستم",
    keys: ["commission_percent", "cancel_window_hours", "pagination_limit"],
  },
  {
    title: "محتوا",
    keys: ["rules_text", "faq_text"],
  },
]

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<Setting[]>("/api/v1/admin/settings")
      setSettings(res)
      setValues((prev) => {
        const next = { ...prev }
        for (const s of res) next[s.key] = s.value
        return next
      })
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
    async (key: string) => {
      const setting = settings.find((s) => s.key === key)
      if (!setting) return

      const newValue = values[key] ?? setting.value
      const meta = settingMeta[key]

      if (meta?.validate) {
        const err = meta.validate(newValue)
        if (err) {
          toast.error(err)
          return
        }
      }

      setSaving(key)
      try {
        const updated = await api<Setting>(
          `/api/v1/admin/settings/${setting.id}`,
          {
            method: "PUT",
            body: JSON.stringify({ value: newValue }),
          }
        )
        setSettings((prev) =>
          prev.map((s) => (s.id === setting.id ? updated : s))
        )
        toast.success(`"${meta?.label || key}" ذخیره شد`)
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "خطا در ذخیره")
      } finally {
        setSaving(null)
      }
    },
    [settings, values]
  )

  if (user && user.role !== "admin") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
        <div className="rounded-full bg-destructive/10 p-4">
          <Loader2 className="size-12" />
        </div>
        <p className="text-xl font-medium">دسترسی محدود</p>
        <p className="text-sm">شما دسترسی به این بخش را ندارید</p>
      </div>
    )
  }

  const settingsMap = new Map(settings.map((s) => [s.key, s]))

  return (
    <div className="flex flex-1 flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">تنظیمات سیستم</h1>
          <p className="text-sm text-muted-foreground">
            مدیریت تنظیمات و پیکربندی پلتفرم
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSettings}
          disabled={loading}
        >
          <RefreshCw
            className={`ml-1.5 size-4 ${loading ? "animate-spin" : ""}`}
          />
          بروزرسانی
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <Skeleton className="mb-4 h-4 w-32" />
              <div className="space-y-4">
                {section.keys.map((key) => (
                  <div key={key}>
                    <Skeleton className="mb-1.5 h-3.5 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && settings.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Settings2 className="size-10" />
          <p className="text-base font-medium">تنظیماتی یافت نشد</p>
          <p className="text-sm">روی بروزرسانی کلیک کنید</p>
        </div>
      )}

      {/* Settings sections */}
      {!loading && settings.length > 0 && (
        <div className="space-y-8">
          {sections.map((section) => {
            const visibleKeys = section.keys.filter((k) => settingsMap.has(k))
            if (!visibleKeys.length) return null

            return (
              <section key={section.title}>
                <div className="mb-4">
                  <h2 className="font-bold text-muted-foreground">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-px overflow-hidden rounded-xl border bg-card">
                  {visibleKeys.map((key, idx) => {
                    const setting = settingsMap.get(key)!
                    const meta = settingMeta[key]
                    const isSaving = saving === key
                    const hasChanged = values[key] !== setting.value

                    return (
                      <div
                        key={key}
                        className={`group flex items-start gap-3 p-4 ${
                          idx !== visibleKeys.length - 1 ? "border-b" : ""
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            {meta?.icon && (
                              <span className="shrink-0 text-muted-foreground">
                                {meta.icon}
                              </span>
                            )}
                            <label className="text-sm leading-none font-medium">
                              {meta?.label || key}
                            </label>
                          </div>
                          {setting.description && (
                            <p className="text-xs text-muted-foreground">
                              {setting.description}
                            </p>
                          )}
                          {meta?.multiline ? (
                            <Textarea
                              value={toPersianDigits(
                                values[key] ?? setting.value
                              )}
                              onChange={(e) =>
                                setValues((p) => ({
                                  ...p,
                                  [key]: toEnglishDigits(e.target.value),
                                }))
                              }
                              className="mt-1 min-h-20 resize-y bg-background"
                            />
                          ) : (
                            <Input
                              value={toPersianDigits(
                                values[key] ?? setting.value
                              )}
                              onChange={(e) =>
                                setValues((p) => ({
                                  ...p,
                                  [key]: toEnglishDigits(e.target.value),
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSave(key)
                              }}
                              className="mt-1 bg-background"
                            />
                          )}
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={!hasChanged || isSaving}
                          onClick={() => handleSave(key)}
                          className={`mt-0.5 size-8 shrink-0 self-start rounded-full transition-all ${
                            hasChanged
                              ? "bg-primary/10 text-primary opacity-100 hover:bg-primary/20"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
