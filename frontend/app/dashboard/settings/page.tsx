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
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Phone,
  Lock,
  Camera,
  Trash2,
  RefreshCw,
  User,
  ShieldCheck,
  Check,
} from "lucide-react"
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

const sections: { title: string; keys: string[] }[] = [
  {
    title: "اطلاعات حساب",
    keys: ["avatar", "full_name", "phone", "role"],
  },
  {
    title: "امنیت حساب",
    keys: ["password"],
  },
]

const roleBadgeVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  admin: "default",
  manager: "secondary",
  user: "outline",
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
      refreshUser()
      toast.success("نام به‌روزرسانی شد")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در به‌روزرسانی")
    } finally {
      setSaving(false)
    }
  }, [name, refreshUser])

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

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-8">
        <div>
          <Skeleton className="mb-1 h-7 w-28" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <Skeleton className="mb-4 h-4 w-24" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
        <div className="rounded-full bg-destructive/10 p-4">
          <Loader2 className="size-10 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">خطا در بارگذاری اطلاعات</p>
        <Button variant="outline" onClick={fetchUser}>
          <RefreshCw className="ml-1.5 size-4" />
          تلاش مجدد
        </Button>
      </div>
    )
  }

  const avatarUrl = buildAvatarUrl(user.avatar_url)
  const hasNameChanged = name.trim() !== user.full_name

  return (
    <div className="flex flex-1 flex-col gap-8">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">پروفایل من</h1>
          <p className="text-sm text-muted-foreground">
            اطلاعات شخصی و تنظیمات حساب کاربری
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUser}
          disabled={loading}
        >
          <RefreshCw className="ml-1.5 size-4" />
          بروزرسانی
        </Button>
      </div>

      {/* ── Sections ── */}
      <div className="space-y-8">
        {/* ════════════════════════════════════════════
             بخش اول: اطلاعات حساب
           ════════════════════════════════════════════ */}
        <section>
          <div className="mb-4">
            <h2 className="font-bold text-muted-foreground">اطلاعات حساب</h2>
          </div>

          <div className="space-y-px overflow-hidden rounded-xl border bg-card">
            {/* ─── ردیف ۱: آواتار ─── */}
            <div className="group p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Camera className="size-4 text-muted-foreground" />
                <span>عکس پروفایل</span>
              </div>
              <div className="flex items-center justify-between gap-4">
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="ml-1.5 animate-spin" />
                    ) : (
                      <Camera className="ml-1.5" />
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
                        <Loader2 className="ml-1.5 animate-spin" />
                      ) : (
                        <Trash2 className="ml-1.5" />
                      )}
                      حذف
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* ─── ردیف ۲: نام و نام خانوادگی ─── */}
            <div className="group flex items-start gap-3 border-t p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-muted-foreground">
                    <User className="size-4" />
                  </span>
                  <label
                    htmlFor="name"
                    className="text-sm leading-none font-medium"
                  >
                    نام و نام خانوادگی
                  </label>
                </div>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName()
                  }}
                  className="mt-1 h-8 bg-background"
                  placeholder="نام خود را وارد کنید"
                />
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={!hasNameChanged || saving}
                onClick={saveName}
                className={`mt-0.5 shrink-0 self-start rounded-full transition-all ${
                  hasNameChanged
                    ? "bg-primary/10 text-primary opacity-100 hover:bg-primary/20"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              >
                {saving ? <Loader2 className="animate-spin" /> : <Check />}
              </Button>
            </div>

            {/* ─── ردیف ۳: شماره موبایل (فقط نمایش) ─── */}
            <div className="group flex items-start gap-3 border-t p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-muted-foreground">
                    <Phone className="size-4" />
                  </span>
                  <span className="text-sm leading-none font-medium">
                    شماره موبایل
                  </span>
                </div>
                <p
                  className="mt-1 h-8 content-center rounded-md border border-transparent bg-muted/30 px-2.5 text-end text-sm"
                  dir="ltr"
                >
                  {toPersianDigits(user.phone)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  شماره موبایل قابل تغییر نیست
                </p>
              </div>
            </div>

            {/* ─── ردیف ۴: نقش کاربری (فقط نمایش) ─── */}
            <div className="group flex items-start gap-3 border-t p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-muted-foreground">
                    <ShieldCheck className="size-4" />
                  </span>
                  <span className="text-sm leading-none font-medium">
                    نقش کاربری
                  </span>
                </div>
                <div className="mt-1">
                  <Badge variant={roleBadgeVariants[user.role] || "outline"}>
                    {roleLabels[user.role] || user.role}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  سطح دسترسی شما در پلتفرم
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════
             بخش دوم: امنیت حساب
           ════════════════════════════════════════════ */}
        <section>
          <div className="mb-4">
            <h2 className="font-bold text-muted-foreground">امنیت حساب</h2>
          </div>

          <div className="space-y-px overflow-hidden rounded-xl border bg-card">
            {/* ─── ردیف ۱: رمز فعلی ─── */}
            <div className="group flex items-start gap-3 p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-muted-foreground">
                    <Lock className="size-4" />
                  </span>
                  <Label
                    htmlFor="curPass"
                    className="text-sm leading-none font-medium"
                  >
                    رمز فعلی
                  </Label>
                </div>
                <Input
                  id="curPass"
                  type="password"
                  value={curPass}
                  onChange={(e) => setCurPass(e.target.value)}
                  className="mt-1 h-8 bg-background text-xs"
                  placeholder="••••••"
                />
              </div>
            </div>

            {/* ─── ردیف ۲: رمز جدید ─── */}
            <div className="group flex items-start gap-3 border-t p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-muted-foreground">
                    <Lock className="size-4" />
                  </span>
                  <Label
                    htmlFor="newPass"
                    className="text-sm leading-none font-medium"
                  >
                    رمز جدید
                  </Label>
                </div>
                <Input
                  id="newPass"
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="mt-1 h-8 bg-background text-xs"
                  placeholder="حداقل ۶ کاراکتر"
                />
              </div>
            </div>

            {/* ─── ردیف ۳: تکرار رمز جدید ─── */}
            <div className="group flex items-start gap-3 border-t p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-muted-foreground">
                    <Lock className="size-4" />
                  </span>
                  <Label
                    htmlFor="confirmPass"
                    className="text-sm leading-none font-medium"
                  >
                    تکرار رمز جدید
                  </Label>
                </div>
                <Input
                  id="confirmPass"
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="mt-1 h-8 bg-background text-xs"
                  placeholder="تکرار"
                />
              </div>
            </div>

            {/* ─── ردیف ۴: دکمه تغییر رمز ─── */}
            <div className="border-t p-4">
              <Button
                onClick={changePassword}
                disabled={changingPass}
                size="sm"
              >
                {changingPass ? (
                  <Loader2 className="ml-1.5 size-3.5 animate-spin" />
                ) : (
                  <Lock className="ml-1.5 size-3.5" />
                )}
                {changingPass ? "در حال تغییر..." : "تغییر رمز عبور"}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
