"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  User,
  Lock,
  Sun,
  Moon,
  Monitor,
  Phone,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

interface UserProfile {
  id: number
  phone: string
  full_name: string
  role: string
  is_active: boolean
}

const roleLabels: Record<string, string> = {
  user: "کاربر عادی",
  manager: "مدیر مجموعه",
  admin: "ادمین",
}

const themeOptions = [
  { value: "light", label: "روشن", icon: Sun },
  { value: "dark", label: "تیره", icon: Moon },
  { value: "system", label: "سیستم", icon: Monitor },
] as const

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const [curPass, setCurPass] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [changingPass, setChangingPass] = useState(false)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<UserProfile>("/api/v1/auth/me")
      setUser(data)
      setName(data.full_name)
    } catch {
      toast.error("خطا در دریافت اطلاعات کاربر")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchUser(), 0)
    return () => clearTimeout(timer)
  }, [fetchUser])

  const saveName = useCallback(async () => {
    if (!name.trim()) return toast.error("نام نمی‌تواند خالی باشد")
    setSaving(true)
    try {
      const updated = await api<UserProfile>("/api/v1/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ full_name: name.trim() }),
      })
      setUser(updated)
      toast.success("نام به‌روزرسانی شد")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در به‌روزرسانی")
    } finally {
      setSaving(false)
    }
  }, [name])

  const changePassword = useCallback(async () => {
    if (!curPass) return toast.error("رمز فعلی را وارد کنید")
    if (!newPass) return toast.error("رمز جدید را وارد کنید")
    if (newPass.length < 6) return toast.error("حداقل ۶ کاراکتر")
    if (newPass !== confirmPass) return toast.error("تکرار رمز مطابقت ندارد")
    setChangingPass(true)
    try {
      await api("/api/v1/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          current_password: curPass,
          new_password: newPass,
        }),
      })
      toast.success("رمز عبور تغییر کرد")
      setCurPass("")
      setNewPass("")
      setConfirmPass("")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در تغییر رمز")
    } finally {
      setChangingPass(false)
    }
  }, [curPass, newPass, confirmPass])

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-3 w-40" />
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
        <p className="text-sm text-muted-foreground">خطا در بارگذاری اطلاعات</p>
        <Button variant="outline" size="sm" onClick={fetchUser}>
          تلاش مجدد
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold tracking-tight">تنظیمات حساب</h1>
        <p className="text-xs text-muted-foreground">
          مدیریت اطلاعات شخصی، تم و رمز عبور
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Profile Card ── */}
        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <User className="size-3.5" />
            اطلاعات حساب
          </div>

          <div className="flex items-center gap-2.5 rounded-md bg-muted/40 px-3 py-2 text-xs">
            <Phone className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">تلفن:</span>
            <span dir="ltr" className="font-medium">
              {toPersianDigits(user.phone)}
            </span>
          </div>

          <div className="flex items-center gap-2.5 rounded-md bg-muted/40 px-3 py-2 text-xs">
            <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">نقش:</span>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              {roleLabels[user.role] || user.role}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">
              نام و نام خانوادگی
            </Label>
            <div className="flex gap-1.5">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
                placeholder="نام خود را وارد کنید"
              />
              <Button
                size="sm"
                onClick={saveName}
                disabled={saving || name === user.full_name}
                className="h-8 shrink-0 px-3 text-xs"
              >
                {saving ? <Loader2 className="size-3 animate-spin" /> : "ذخیره"}
              </Button>
            </div>
          </div>
        </section>

        {/* ── Theme Card ── */}
        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sun className="size-3.5" />
            تم
          </div>

          <div className="flex gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => {
              const active = theme === value
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg border py-3 text-xs transition-all ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40 hover:bg-accent"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              )
            })}
          </div>

          <p className="text-[10px] text-muted-foreground">
            میانبر کیبورد:{" "}
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">
              D
            </kbd>
          </p>
        </section>
      </div>

      {/* ── Password Card ── */}
      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lock className="size-3.5" />
          تغییر رمز عبور
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="curPass" className="text-xs">
              رمز فعلی
            </Label>
            <Input
              id="curPass"
              type="password"
              value={curPass}
              onChange={(e) => setCurPass(e.target.value)}
              className="h-8 text-xs"
              placeholder="••••••"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="newPass" className="text-xs">
              رمز جدید
            </Label>
            <Input
              id="newPass"
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="h-8 text-xs"
              placeholder="حداقل ۶ کاراکتر"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPass" className="text-xs">
              تکرار رمز جدید
            </Label>
            <Input
              id="confirmPass"
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="h-8 text-xs"
              placeholder="تکرار"
            />
          </div>
        </div>

        <Button
          size="sm"
          onClick={changePassword}
          disabled={changingPass}
          className="text-xs"
        >
          {changingPass && <Loader2 className="ml-1 size-3 animate-spin" />}
          {changingPass ? "در حال تغییر..." : "تغییر رمز عبور"}
        </Button>
      </section>
    </div>
  )
}
