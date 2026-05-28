"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import {
  Loader2,
  User,
  Lock,
  SunMoon,
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

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const [user, setUser] = useState<UserProfile | null>(null)
  const [pageLoading, setPageLoading] = useState(true)

  const [fullName, setFullName] = useState("")
  const [savingName, setSavingName] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const isDark =
    theme === "dark" || (theme === "system" && resolvedTheme === "dark")

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

  /* =============== LOADING =============== */
  if (pageLoading) {
    return (
      <div className="relative flex flex-1 flex-col gap-6 overflow-hidden px-4 py-6">
        <div className="neon-orb neon-orb-purple !top-[-100px] !right-[-80px]" />
        <div className="bg-mesh pointer-events-none absolute inset-0" />
        <div className="bg-dots pointer-events-none absolute inset-0" />
        <div className="relative z-10">
          <div>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="mt-1 h-4 w-44" />
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="glass-card rounded-2xl p-6">
              <Skeleton className="h-5 w-28" />
              <div className="mt-4 space-y-4">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <Skeleton className="h-5 w-28" />
              <div className="mt-4 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
          <div className="glass-card mt-6 rounded-2xl p-6">
            <Skeleton className="h-5 w-28" />
            <div className="mt-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden py-20">
        <div className="neon-orb neon-orb-3 !top-[-80px]" />
        <div className="bg-mesh pointer-events-none absolute inset-0" />
        <div className="bg-dots pointer-events-none absolute inset-0" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <p className="text-muted-foreground">
            امکان بارگذاری اطلاعات وجود ندارد
          </p>
          <Button
            variant="outline"
            className="neon-border-hover"
            onClick={fetchUser}
          >
            تلاش مجدد
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col gap-6 overflow-hidden px-4 py-6">
      {/* Neon orbs + mesh background */}
      <div className="neon-orb neon-orb-purple !top-[-100px] !right-[-80px]" />
      <div className="neon-orb neon-orb-cyan !bottom-[-100px] !left-[-60px]" />
      <div className="bg-mesh pointer-events-none absolute inset-0" />
      <div className="bg-dots pointer-events-none absolute inset-0" />

      <div className="relative z-10">
        <ScrollReveal>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-gradient-primary">تنظیمات</span> حساب
            </h1>
            <p className="text-muted-foreground">
              مدیریت حساب کاربری و تنظیمات ظاهری
            </p>
          </div>
        </ScrollReveal>

        {/* Row 1: Profile + Theme */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <ScrollReveal>
            <div className="glass-card neon-border-hover rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <User className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">اطلاعات حساب</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    مشاهده و ویرایش اطلاعات شخصی
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                <div className="flex items-center gap-3 rounded-xl border bg-background/40 p-3">
                  <Phone className="size-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">شماره تلفن</p>
                    <p className="text-sm font-medium" dir="ltr">
                      {toPersianDigits(user.phone)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border bg-background/40 p-3">
                  <IdCard className="size-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">نقش کاربری</p>
                    <Badge variant="outline" className="mt-0.5 text-xs">
                      {roleLabels[user.role] || user.role}
                    </Badge>
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
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="glass-card neon-border-hover rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <SunMoon className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">تنظیمات ظاهری</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    تغییر تم روشن/تاریک
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                <div className="flex items-center justify-between rounded-xl border bg-background/40 p-4">
                  <div>
                    <p className="text-sm font-medium">حالت تاریک</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {isDark
                        ? "در حال حاضر تم تاریک فعال است"
                        : "در حال حاضر تم روشن فعال است"}
                    </p>
                  </div>
                  <Switch
                    id="darkMode"
                    checked={isDark}
                    onCheckedChange={(checked) =>
                      setTheme(checked ? "dark" : "light")
                    }
                  />
                </div>
                <div className="rounded-xl border bg-background/40 p-4">
                  <p className="text-xs text-muted-foreground">
                    از دکمه <SunMoon className="mx-1 inline size-3.5" /> در نوار
                    بالایی برای تغییر سریع تم استفاده کنید.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Change Password */}
        <ScrollReveal className="mt-6">
          <div className="glass-card neon-border-hover rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Lock className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">تغییر رمز عبور</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  رمز عبور جدید باید حداقل ۶ کاراکتر باشد
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
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
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}
