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
import {
  Loader2,
  Phone,
  Lock,
  Camera,
  Trash2,
  User,
  CreditCard,
} from "lucide-react"
import { toast } from "@/lib/toast"

interface UserProfile {
  id: number
  phone: string
  full_name: string
  role: string
  is_active: boolean
  has_password: boolean
  avatar_url?: string | null
}

interface BankCard {
  id: number
  masked_card_number: string
  holder_name: string | null
  status: string
  verified_at: string | null
}

const sections: { title: string; keys: string[] }[] = [
  {
    title: "اطلاعات حساب",
    keys: ["avatar", "full_name", "phone"],
  },
  {
    title: "امنیت حساب",
    keys: ["password"],
  },
]

export default function SettingsPage() {
  const { refreshUser } = useAuth()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [currentPass, setCurrentPass] = useState("")
  const [changingPass, setChangingPass] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordResetMode, setPasswordResetMode] = useState(false)

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [deletingAvatar, setDeletingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [bankCard, setBankCard] = useState<BankCard | null>(null)
  const [cardNumber, setCardNumber] = useState("")
  const [pendingCard, setPendingCard] = useState<BankCard | null>(null)
  const [savingCard, setSavingCard] = useState(false)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<UserProfile>("/api/v1/auth/me")
      const card = await api<BankCard | null>(
        "/api/v1/wallet/bank-cards/verified"
      )
      const resetMode =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("reset_password") ===
          "1"
      setUser(data)
      setBankCard(card)
      setName(data.full_name)
      setPasswordResetMode(resetMode)
      setShowPasswordForm(resetMode)
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
      setName(updated.full_name)
      refreshUser()
      toast.success("نام به‌روزرسانی شد")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در به‌روزرسانی")
    } finally {
      setSaving(false)
    }
  }, [name, refreshUser])

  const hasPassword = user?.has_password

  const changePassword = useCallback(async () => {
    if (!newPass) return toast.error("رمز جدید را وارد کنید")
    if (hasPassword && !passwordResetMode && !currentPass) {
      return toast.error("رمز فعلی را وارد کنید")
    }
    if (newPass.length < 8) return toast.error("حداقل ۸ کاراکتر")
    if (newPass !== confirmPass) return toast.error("تکرار رمز مطابقت ندارد")
    setChangingPass(true)
    try {
      const updated = await api<UserProfile>("/api/v1/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          new_password: newPass,
          ...(hasPassword && !passwordResetMode
            ? { current_password: currentPass }
            : {}),
        }),
      })
      setUser(updated)
      toast.success("رمز عبور تغییر کرد")
      setCurrentPass("")
      setNewPass("")
      setConfirmPass("")
      setPasswordResetMode(false)
      setShowPasswordForm(false)
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/dashboard/settings")
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در تغییر رمز")
    } finally {
      setChangingPass(false)
    }
  }, [currentPass, newPass, confirmPass, passwordResetMode, hasPassword])

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

  const lookupCard = useCallback(async () => {
    const normalized = cardNumber.replace(/\D/g, "")
    if (normalized.length !== 16) {
      return toast.error("شماره کارت باید ۱۶ رقم باشد")
    }
    setSavingCard(true)
    try {
      const card = await api<BankCard>("/api/v1/wallet/bank-cards/lookup", {
        method: "POST",
        body: JSON.stringify({ card_number: normalized }),
      })
      setPendingCard(card)
      toast.success("کارت استعلام شد")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در استعلام کارت")
    } finally {
      setSavingCard(false)
    }
  }, [cardNumber])

  const confirmCard = useCallback(async () => {
    if (!pendingCard) return
    setSavingCard(true)
    try {
      const card = await api<BankCard>(
        `/api/v1/wallet/bank-cards/${pendingCard.id}/confirm`,
        { method: "POST" }
      )
      setBankCard(card)
      setPendingCard(null)
      setCardNumber("")
      toast.success("شماره کارت ثبت شد")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در ثبت کارت")
    } finally {
      setSavingCard(false)
    }
  }, [pendingCard])

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
          تلاش مجدد
        </Button>
      </div>
    )
  }

  const avatarUrl = buildAvatarUrl(user.avatar_url)
  const hasNameChanged = name.trim() !== user.full_name
  const shouldShowPasswordForm = !user.has_password || showPasswordForm

  return (
    <div className="flex flex-1 flex-col gap-8">
      {/* ── Header ── */}
      <div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">پروفایل من</h1>
          <p className="text-sm text-muted-foreground">
            اطلاعات شخصی و تنظیمات حساب کاربری
          </p>
        </div>
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

            <div className="border-t p-4">
              <Button
                onClick={saveName}
                disabled={!hasNameChanged || saving}
                className={`w-full transition-colors sm:w-auto ${
                  hasNameChanged
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-primary/20 text-primary hover:bg-primary/20 disabled:opacity-100"
                }`}
              >
                {saving ? (
                  <Loader2 className="ml-1.5 size-4 animate-spin" />
                ) : null}
                {saving ? "در حال ثبت..." : "ثبت تغییرات"}
              </Button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="font-bold text-muted-foreground">اطلاعات مالی</h2>
          </div>

          <div className="space-y-px overflow-hidden rounded-xl border bg-card">
            <div className="group flex items-start gap-3 p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-muted-foreground">
                    <CreditCard className="size-4" />
                  </span>
                  <span className="text-sm leading-none font-medium">
                    شماره کارت برای بازگشت وجه
                  </span>
                </div>
                {bankCard ? (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <div dir="ltr" className="text-end font-medium">
                      {toPersianDigits(bankCard.masked_card_number)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {bankCard.holder_name || "دارنده کارت"} · کارت فعلی
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    فقط یک شماره کارت برای بازگشت وجه ذخیره می‌شود.
                  </p>
                )}
                <Input
                  value={cardNumber}
                  onChange={(e) => {
                    setCardNumber(e.target.value)
                    setPendingCard(null)
                  }}
                  inputMode="numeric"
                  dir="ltr"
                  className="h-9 bg-background text-end"
                  placeholder="6037 0000 0000 0000"
                />
                {pendingCard && (
                  <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                    <div>
                      دارنده کارت: {pendingCard.holder_name || "نامشخص"}
                    </div>
                    <div
                      dir="ltr"
                      className="mt-1 text-end text-muted-foreground"
                    >
                      {toPersianDigits(pendingCard.masked_card_number)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t p-4">
              <Button
                type="button"
                size="sm"
                variant={pendingCard ? "outline" : "default"}
                onClick={lookupCard}
                disabled={savingCard}
              >
                {savingCard && (
                  <Loader2 className="ml-1.5 size-3.5 animate-spin" />
                )}
                استعلام کارت
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={confirmCard}
                disabled={!pendingCard || savingCard}
              >
                {bankCard ? "تایید و تغییر کارت" : "تایید و ثبت"}
              </Button>
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
            {!shouldShowPasswordForm ? (
              <div className="group flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-muted-foreground">
                    <Lock className="size-4" />
                  </span>
                  <span className="text-sm leading-none font-medium">
                    رمز ورود
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPasswordForm(true)}
                >
                  تغییر
                </Button>
              </div>
            ) : (
              <>
                {user.has_password && !passwordResetMode ? (
                  <div className="group flex items-start gap-3 p-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-muted-foreground">
                          <Lock className="size-4" />
                        </span>
                        <Label
                          htmlFor="currentPass"
                          className="text-sm leading-none font-medium"
                        >
                          رمز ورود فعلی
                        </Label>
                      </div>
                      <Input
                        id="currentPass"
                        type="password"
                        value={currentPass}
                        onChange={(e) => setCurrentPass(e.target.value)}
                        className="mt-1 h-8 bg-background text-xs"
                        placeholder="رمز فعلی"
                        autoComplete="current-password"
                      />
                    </div>
                  </div>
                ) : null}

                {/* ─── ردیف ۱: رمز ورود ─── */}
                <div
                  className={`group flex items-start gap-3 p-4 ${
                    user.has_password && !passwordResetMode ? "border-t" : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-muted-foreground">
                        <Lock className="size-4" />
                      </span>
                      <Label
                        htmlFor="newPass"
                        className="text-sm leading-none font-medium"
                      >
                        {user.has_password ? "رمز ورود جدید" : "رمز ورود"}
                      </Label>
                    </div>
                    <Input
                      id="newPass"
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="mt-1 h-8 bg-background text-xs"
                      placeholder="حداقل ۸ کاراکتر"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {/* ─── ردیف ۲: تکرار رمز ورود ─── */}
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
                        {user.has_password
                          ? "تکرار رمز ورود جدید"
                          : "تکرار رمز ورود"}
                      </Label>
                    </div>
                    <Input
                      id="confirmPass"
                      type="password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      className="mt-1 h-8 bg-background text-xs"
                      placeholder="تکرار"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {/* ─── ردیف ۳: دکمه ذخیره رمز ─── */}
                <div className="flex items-center gap-2 border-t p-4">
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
                    {changingPass
                      ? "در حال ذخیره..."
                      : user.has_password
                        ? "تغییر رمز عبور"
                        : "ثبت رمز ورود"}
                  </Button>
                  {user.has_password ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNewPass("")
                        setConfirmPass("")
                        setCurrentPass("")
                        setPasswordResetMode(false)
                        setShowPasswordForm(false)
                        if (typeof window !== "undefined") {
                          window.history.replaceState(
                            null,
                            "",
                            "/dashboard/settings"
                          )
                        }
                      }}
                    >
                      انصراف
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
