"use client"

import Link from "next/link"
import Image from "next/image"
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react"
import {
  Building2,
  CreditCard,
  Users,
  Settings,
  Bell,
  BarChart3,
  History,
  MessageSquare,
  UserCircle,
  Calendar,
  ClipboardCheck,
} from "lucide-react"
import type { User } from "@/types/auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogoutDialog } from "@/components/public/logout-dialog"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { RegisterComplexDialog } from "@/components/public/register-complex-dialog"
import { buildAvatarUrl } from "@/lib/api"
import { getInitials, toPersianDigits } from "@/lib/utils"
import { useState } from "react"

interface DesktopUserMenuProps {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  router: ReturnType<typeof import("next/navigation").useRouter>
  onLogout: () => void
}

const roleLabels: Record<string, string> = {
  admin: "ادمین",
  manager: "مدیر مجموعه",
  user: "کاربر",
}

export function DesktopUserMenu({
  user,
  loading,
  isAuthenticated,
  router,
  onLogout,
}: DesktopUserMenuProps) {
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [registerComplexDialogOpen, setRegisterComplexDialogOpen] =
    useState(false)
  const isRtl = true

  return (
    <>
      <ModeToggle />
      {loading ? (
        <div className="size-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
      ) : isAuthenticated && user ? (
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-1 px-2">
              <span className="text-sm font-medium">{user.full_name}</span>
              <ChevronDown className="size-3.5 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={isRtl ? "start" : "end"}
            side="bottom"
            collisionPadding={16}
            className="z-60 w-56 border"
          >
            <DropdownMenuLabel className="pb-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/8">
                  {buildAvatarUrl(user.avatar_url) ? (
                    <Image
                      src={buildAvatarUrl(user.avatar_url)!}
                      alt={user.full_name}
                      width={36}
                      height={36}
                      className="size-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs font-semibold text-primary">
                      {getInitials(user.full_name)}
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm leading-tight font-semibold">
                    {user.full_name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {toPersianDigits(user.phone)}
                    </span>
                    <span className="text-xs text-muted-foreground/30">•</span>
                    <span className="text-xs text-muted-foreground">
                      {roleLabels[user.role] || user.role}
                    </span>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                router.push(
                  user.role === "admin"
                    ? "/dashboard/admin"
                    : user.role === "manager"
                      ? "/dashboard/manager"
                      : "/dashboard/user"
                )
              }
              className="cursor-pointer"
            >
              <LayoutDashboard className="me-2 size-4" />
              داشبورد
            </DropdownMenuItem>

            {/* ── Admin panel items ── */}
            {user.role === "admin" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>داشبورد</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/reports")}
                  className="cursor-pointer"
                >
                  <BarChart3 className="me-2 size-4" />
                  گزارشات
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/admin/settings")}
                  className="cursor-pointer"
                >
                  <Settings className="me-2 size-4" />
                  تنظیمات
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/admin/logs")}
                  className="cursor-pointer"
                >
                  <History className="me-2 size-4" />
                  لاگ‌ها
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>شخصی</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/settings")}
                  className="cursor-pointer"
                >
                  <UserCircle className="me-2 size-4" />
                  پروفایل
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/bookings")}
                  className="cursor-pointer"
                >
                  <Calendar className="me-2 size-4" />
                  رزروهای من
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/payments")}
                  className="cursor-pointer"
                >
                  <CreditCard className="me-2 size-4" />
                  پرداخت‌ها
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>مدیریت</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/vendors")}
                  className="cursor-pointer"
                >
                  <Building2 className="me-2 size-4" />
                  مجموعه‌ها
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/admin/bookings")}
                  className="cursor-pointer"
                >
                  <Calendar className="me-2 size-4" />
                  رزروها
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/users")}
                  className="cursor-pointer"
                >
                  <Users className="me-2 size-4" />
                  کاربران
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    router.push("/dashboard/admin/manager-requests")
                  }
                  className="cursor-pointer"
                >
                  <ClipboardCheck className="me-2 size-4" />
                  درخواست‌های مدیریت مجموعه
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/admin/payments")}
                  className="cursor-pointer"
                >
                  <CreditCard className="me-2 size-4" />
                  پرداخت‌ها
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/contact")}
                  className="cursor-pointer"
                >
                  <MessageSquare className="me-2 size-4" />
                  پیام‌ها
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/notifications")}
                  className="cursor-pointer"
                >
                  <Bell className="me-2 size-4" />
                  اعلان‌ها
                </DropdownMenuItem>
              </>
            )}

            {/* ── Manager panel items ── */}
            {user.role === "manager" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>مدیریت مجموعه</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/vendors")}
                  className="cursor-pointer"
                >
                  <Building2 className="me-2 size-4" />
                  مجموعه‌ها
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/manager/schedule")}
                  className="cursor-pointer"
                >
                  <Calendar className="me-2 size-4" />
                  زمان‌بندی
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>شخصی</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/settings")}
                  className="cursor-pointer"
                >
                  <UserCircle className="me-2 size-4" />
                  پروفایل
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/bookings")}
                  className="cursor-pointer"
                >
                  <Calendar className="me-2 size-4" />
                  رزروهای من
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/payments")}
                  className="cursor-pointer"
                >
                  <CreditCard className="me-2 size-4" />
                  پرداخت‌ها
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>سیستم</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/notifications")}
                  className="cursor-pointer"
                >
                  <Bell className="me-2 size-4" />
                  اعلان‌ها
                </DropdownMenuItem>
              </>
            )}

            {/* ── User panel items ── */}
            {user.role === "user" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/settings")}
                  className="cursor-pointer"
                >
                  <UserCircle className="me-2 size-4" />
                  پروفایل
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>رزروها</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/bookings")}
                  className="cursor-pointer"
                >
                  <Calendar className="me-2 size-4" />
                  رزروهای من
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/payments")}
                  className="cursor-pointer"
                >
                  <CreditCard className="me-2 size-4" />
                  پرداخت‌ها
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>سیستم</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/notifications")}
                  className="cursor-pointer"
                >
                  <Bell className="me-2 size-4" />
                  اعلان‌ها
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setRegisterComplexDialogOpen(true)}
                  className="cursor-pointer text-blue-600 focus:bg-blue-50 focus:text-blue-700 dark:text-blue-400 dark:focus:bg-blue-950/40 dark:focus:text-blue-300"
                >
                  <Building2 className="me-2 size-4" />
                  ثبت مجموعه ورزشی
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setLogoutDialogOpen(true)}
              className="cursor-pointer"
              variant="destructive"
            >
              <LogOut className="me-2 size-4" />
              خروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link href="/login">
          <Button className="px-4">ورود / ثبت‌نام</Button>
        </Link>
      )}

      <RegisterComplexDialog
        open={registerComplexDialogOpen}
        onOpenChange={setRegisterComplexDialogOpen}
      />

      <LogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={() => {
          onLogout()
          setLogoutDialogOpen(false)
        }}
      />
    </>
  )
}
