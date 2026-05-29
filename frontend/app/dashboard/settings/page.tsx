"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  User,
  Lock,
  Sun,
  Moon,
  Monitor,
  Check,
  Phone,
  IdCard,
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
  const [pageLoading, setPageLoading] = useState(true)

  const [fullName, setFullName] = useState("")
  const [savingName, setSavingName] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const fetchUser = useCallback(async () => {
    setPageLoading(true)
    try {
      const data = await api<UserProfile>("/api/v1/auth/me")
      setUser(data)
      setFullName(data.full_name)
    } catch {
      toast.error("خطا در دریافت اطلاعات کاربر")
    } finally {
      setPageLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchUser(), 0)
    return () => clearTimeout(timer)
  }, [fetchUser])

  const handleSaveName = useCallback(async () => {
    if (!fullName.trim()) {
      toast.error("نام نمی‌تواند خالی باشد")
      return
    }
    setSavingName(true)
    try {
      const updated = await api<UserProfile>("/api/v1/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName.trim() }),
      })
      setUser(updated)
      toast.success("نام با موفقیت به‌روزرسانی شد")
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "خطا در به‌روزرسانی نام"
      toast.error(msg)
    } finally {
      setSavingName(false)
    }
  }, [fullName])

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword) {
      toast.error("لطفاً رمز عبور فعلی را وارد کنید")
      return
    }
    if (!newPassword) {
      toast.error("لطفاً رمز عبور جدید را وارد کنید")
      return
    }
    if (newPassword.length < 6) {
      toast.error("رمز عبور جدید باید حداقل ۶ کاراکتر باشد")
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("رمز عبور جدید و تکرار آن مطابقت ندارند")
      return
    }
    setChangingPassword(true)
    try {
      await api("/api/v1/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
      toast.success("رمز عبور با موفقیت تغییر کرد")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "خطا در تغییر رمز عبور"
      toast.error(msg)
    } finally {
      setChangingPassword(false)
    }
  }, [currentPassword, newPassword, confirmNewPassword])

  /* ── Loading ── */
  if (pageLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-44" />
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-24" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-28" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">
          امکان بارگذاری اطلاعات وجود ندارد
        </p>
        <Button variant="outline" onClick={fetchUser}>
          تلاش مجدد
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">تنظیمات حساب</h1>
        <p className="text-muted-foreground">
          مدیریت اطلاعات کاربری، تم و رمز عبور
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Profile ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              اطلاعات حساب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Phone className="size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">شماره تلفن</p>
                <p className="text-sm font-medium" dir="ltr">
                  {toPersianDigits(user.phone)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <IdCard className="size-5 shrink-0 text-muted-foreground" />
              <div className="flex flex-1 items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">نقش کاربری</p>
                  <Badge variant="outline" className="mt-0.5 text-xs">
                    {roleLabels[user.role] || user.role}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">نام و نام خانوادگی</Label>
              <div className="flex gap-2">
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="نام خود را وارد کنید"
                />
                <Button
                  onClick={handleSaveName}
                  disabled={savingName || fullName === user.full_name}
                  size="icon"
                  className="shrink-0"
                  title="ذخیره"
                >
                  {savingName ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Theme ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sun className="size-4" />
              تم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map(({ value, label, icon: Icon }) => {
                const isActive = theme === value
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-all ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border hover:border-primary/50 hover:bg-accent"
                    }`}
                  >
                    <Icon className="size-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              همچنین می‌توانید با دکمه{" "}
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                D
              </kbd>{" "}
              روی صفحه‌کلید تم را سریع切换 کنید.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Change Password ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="size-4" />
            تغییر رمز عبور
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">رمز عبور جدید</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="حداقل ۶ کاراکتر"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">تکرار رمز عبور جدید</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="تکرار رمز جدید"
              />
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="mt-5"
          >
            {changingPassword && (
              <Loader2 className="ml-1 size-4 animate-spin" />
            )}
            {changingPassword ? "در حال تغییر..." : "تغییر رمز عبور"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
