"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  api,
  ApiError,
  buildAvatarUrl,
  uploadAvatar,
  deleteAvatar,
} from "@/lib/api"
import { getInitials, toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Loader2, Lock, Phone, Camera, Trash2 } from "lucide-react"
import { toast } from "@/lib/toast"

interface UserProfile {
  id: number
  phone: string
  full_name: string
  role: string
  is_active: boolean
  avatar_url?: string | null
}

const roleLabels: Record<string, string> = {
  user: "کاربر عادی",
  manager: "مدیر مجموعه",
  admin: "ادمین",
}

export default function SettingsPage() {
  const { refreshUser } = useAuth()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const [curPass, setCurPass] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [changingPass, setChangingPass] = useState(false)

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [deletingAvatar, setDeletingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleAvatarSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (file.size > 5 * 1024 * 1024) {
        toast.error("حداکثر حجم ۵ مگابایت")
        return
      }

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("فقط jpg, png, webp مجاز است")
        return
      }

      setUploadingAvatar(true)
      try {
        const url = await uploadAvatar(file)
        setUser((prev) => (prev ? { ...prev, avatar_url: url } : prev))
        refreshUser()
        toast.success("عکس پروفایل آپلود شد")
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "خطا در آپلود")
      } finally {
        setUploadingAvatar(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    },
    [refreshUser]
  )

  const handleDeleteAvatar = useCallback(async () => {
    setDeletingAvatar(true)
    try {
      await deleteAvatar()
      setUser((prev) => (prev ? { ...prev, avatar_url: null } : prev))
      refreshUser()
      toast.success("عکس پروفایل حذف شد")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در حذف")
    } finally {
      setDeletingAvatar(false)
    }
  }, [refreshUser])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
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

  const avatarUrl = buildAvatarUrl(user.avatar_url)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">تنظیمات حساب</h1>
        <p className="text-muted-foreground">مدیریت اطلاعات شخصی و رمز عبور</p>
      </div>

      <Card size="sm">
        <CardContent className="flex items-center gap-6 pt-3">
          <div className="flex shrink-0 items-start gap-3">
            <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/8">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={user.full_name}
                  width={48}
                  height={48}
                  className="size-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-sm font-semibold text-primary">
                  {getInitials(user.full_name)}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-semibold">
                  {user.full_name}
                </span>
                <Badge
                  variant="outline"
                  className="shrink-0 px-1.5 py-0 text-[10px]"
                >
                  {roleLabels[user.role] || user.role}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="size-3" />
                <span dir="ltr">{toPersianDigits(user.phone)}</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="ml-1 size-4 animate-spin" />
                  ) : (
                    <Camera className="ml-1 size-4" />
                  )}
                  {uploadingAvatar ? "در حال آپلود..." : "تغییر عکس"}
                </Button>
                {user.avatar_url && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteAvatar}
                    disabled={deletingAvatar}
                  >
                    {deletingAvatar ? (
                      <Loader2 className="ml-1 size-4 animate-spin" />
                    ) : (
                      <Trash2 className="ml-1 size-4" />
                    )}
                    حذف
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 border-s border-border/40 ps-5">
            <Label htmlFor="name" className="text-xs font-medium">
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
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent className="space-y-4 pt-3">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Lock className="size-3.5 text-muted-foreground" />
            <span>تغییر رمز عبور</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <Label
                htmlFor="curPass"
                className="text-[11px] text-muted-foreground"
              >
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
            <div className="min-w-0 flex-1 space-y-1">
              <Label
                htmlFor="newPass"
                className="text-[11px] text-muted-foreground"
              >
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
            <div className="min-w-0 flex-1 space-y-1">
              <Label
                htmlFor="confirmPass"
                className="text-[11px] text-muted-foreground"
              >
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
        </CardContent>
      </Card>
    </div>
  )
}
