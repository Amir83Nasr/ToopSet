"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Lock, SunMoon, Check, Phone, IdCard } from "lucide-react"
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
    fetchUser()
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
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="mt-1 h-4 w-44" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-36" /></div>
              <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-full" /></div>
              <Skeleton className="h-8 w-28" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-full" /></div>
            ))}
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">امکان بارگذاری اطلاعات وجود ندارد</p>
        <Button variant="outline" onClick={fetchUser}>تلاش مجدد</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">تنظیمات</h1>
        <p className="text-muted-foreground">مدیریت حساب کاربری و تنظیمات ظاهری</p>
      </div>

      {/* Row 1: Profile + Theme side by side */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <User className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">اطلاعات حساب</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">مشاهده و ویرایش اطلاعات شخصی</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <Phone className="size-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">شماره تلفن</p>
                <p className="text-sm font-medium" dir="ltr">{toPersianDigits(user.phone)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <IdCard className="size-5 text-muted-foreground shrink-0" />
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
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <SunMoon className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">تنظیمات ظاهری</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">تغییر تم روشن/تاریک</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium">حالت تاریک</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isDark ? "در حال حاضر تم تاریک فعال است" : "در حال حاضر تم روشن فعال است"}
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

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">
                برای تغییر بین تم روشن، تاریک و سیستمی می‌توانید از دکمه
                <span className="mx-1 inline-flex items-center"><SunMoon className="size-3.5 inline" /></span>
                در نوار بالایی استفاده کنید.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Change Password (full width) */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Lock className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">تغییر رمز عبور</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">رمز عبور جدید باید حداقل ۶ کاراکتر باشد</p>
          </div>
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
