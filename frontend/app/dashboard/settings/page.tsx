"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Loader2, Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"

interface UserProfile {
  id: number
  phone: string
  full_name: string
  role: string
  is_active: boolean
}

interface WalletTransaction {
  id: number
  amount: number
  type: "deposit" | "withdrawal" | "refund"
  description: string | null
  created_at: string
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

  async function fetchWallet() {
    setWalletLoading(true)
    try {
      const [balanceRes, txns] = await Promise.all([
        api<{ balance: number }>("/api/v1/wallet/balance"),
        api<WalletTransaction[]>("/api/v1/wallet/transactions"),
      ])
      setWalletBalance(balanceRes.balance)
      setWalletTransactions(txns)
    } catch {
      // wallet may not be set up yet
    } finally {
      setWalletLoading(false)
    }
  }

  // Wallet state
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([])
  const [walletLoading, setWalletLoading] = useState(false)

  /* ---------- fetch fresh user data on mount ---------- */
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
    fetchWallet()
  }, [])

  /* ---------- save full name ---------- */
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

  /* ---------- change password ---------- */
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

  const isDark =
    theme === "dark" || (theme === "system" && resolvedTheme === "dark")

  /* =============== LOADING STATE =============== */
  if (pageLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="mt-1 h-4 w-44" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-full" />
            </div>
            <Skeleton className="h-8 w-28" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      </div>
    )
  }

  /* =============== ERROR / NO USER =============== */
  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">امکان بارگذاری اطلاعات وجود ندارد</p>
        <Button variant="outline" onClick={fetchUser}>
          تلاش مجدد
        </Button>
      </div>
    )
  }

  /* =============== MAIN CONTENT =============== */
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">تنظیمات</h1>
        <p className="text-muted-foreground">
          مدیریت حساب کاربری و تنظیمات ظاهری
        </p>
      </div>

      {/* ---- Section 1: Account Info ---- */}
      <Card>
        <CardHeader>
          <CardTitle>اطلاعات حساب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* read-only phone */}
          <div className="space-y-1.5">
            <Label>شماره تلفن</Label>
            <div className="text-sm font-medium text-foreground">
              {toPersianDigits(user.phone)}
            </div>
          </div>

          {/* editable full name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">نام و نام خانوادگی</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="نام خود را وارد کنید"
            />
          </div>

          <Button onClick={handleSaveName} disabled={savingName}>
            {savingName && (
              <Loader2 className="ml-1 size-4 animate-spin" aria-hidden="true" />
            )}
            {savingName ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* ---- Section 2: Change Password ---- */}
      <Card>
        <CardHeader>
          <CardTitle>تغییر رمز عبور</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="رمز عبور فعلی را وارد کنید"
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
              placeholder="رمز عبور جدید را تکرار کنید"
            />
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={changingPassword}
          >
            {changingPassword && (
              <Loader2 className="ml-1 size-4 animate-spin" aria-hidden="true" />
            )}
            {changingPassword ? "در حال تغییر..." : "تغییر رمز عبور"}
          </Button>
        </CardContent>
      </Card>

      {/* ---- Section 3: Wallet ---- */}
      <Card>
        <CardHeader>
          <CardTitle>کیف پول</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {walletLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : walletBalance !== null ? (
            <>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
                <Wallet className="size-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">موجودی</p>
                  <p className="text-2xl font-bold">{toPersianDigits(new Intl.NumberFormat("fa-IR").format(walletBalance))} تومان</p>
                </div>
              </div>

              {walletTransactions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">تراکنش‌های اخیر</h4>
                  <div className="divide-y rounded-lg border">
                    {walletTransactions.slice(0, 5).map((tx) => {
                      const isPositive = tx.type === "deposit" || tx.type === "refund"
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-3 text-sm">
                          <div className="flex items-center gap-2">
                            {isPositive ? (
                              <ArrowDownLeft className="size-4 text-green-500" />
                            ) : (
                              <ArrowUpRight className="size-4 text-red-500" />
                            )}
                            <span>{tx.description || "تراکنش"}</span>
                          </div>
                          <span className={isPositive ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {isPositive ? "+" : "-"}{toPersianDigits(new Intl.NumberFormat("fa-IR").format(Math.abs(tx.amount)))}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">کیف پول در دسترس نیست</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ---- Section 4: Appearance / Theme Toggle ---- */}
      <Card>
        <CardHeader>
          <CardTitle>تنظیمات ظاهری</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="darkMode" className="cursor-pointer">
              حالت تاریک
            </Label>
            <Switch
              id="darkMode"
              checked={isDark}
              onCheckedChange={(checked) =>
                setTheme(checked ? "dark" : "light")
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
