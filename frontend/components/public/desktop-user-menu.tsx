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
import { RegisterComplexDialog } from "@/components/public/register-complex-dialog"
import { buildAvatarUrl } from "@/lib/api"
import { getInitials, toPersianDigits } from "@/lib/utils"
import { useState } from "react"

interface DesktopUserMenuProps {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  onLogout: () => void
}

const roleLabels: Record<string, string> = {
  admin: "ادمین",
  manager: "مدیر مجموعه",
  user: "کاربر",
}

/** Menu item rendered as a Link: prefetching starts while the menu is open,
 *  so the target route is ready before the user clicks. */
function MenuLinkItem({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link href={href}>{children}</Link>
    </DropdownMenuItem>
  )
}

export function DesktopUserMenu({
  user,
  loading,
  isAuthenticated,
  onLogout,
}: DesktopUserMenuProps) {
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [registerComplexDialogOpen, setRegisterComplexDialogOpen] =
    useState(false)
  const isRtl = true

  return (
    <>
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
            className="w-56 border"
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
            <MenuLinkItem
              href={
                user.role === "admin"
                  ? "/dashboard/admin"
                  : user.role === "manager"
                    ? "/dashboard/manager"
                    : "/dashboard/user"
              }
            >
              <LayoutDashboard className="me-2 size-4" />
              داشبورد
            </MenuLinkItem>

            {/* ── Admin panel items ── */}
            {user.role === "admin" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>داشبورد</DropdownMenuLabel>
                <MenuLinkItem href="/dashboard/reports">
                  <BarChart3 className="me-2 size-4" />
                  گزارشات
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/admin/settings">
                  <Settings className="me-2 size-4" />
                  تنظیمات
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/admin/logs">
                  <History className="me-2 size-4" />
                  لاگ‌ها
                </MenuLinkItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>شخصی</DropdownMenuLabel>
                <MenuLinkItem href="/dashboard/settings">
                  <UserCircle className="me-2 size-4" />
                  پروفایل
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/bookings">
                  <Calendar className="me-2 size-4" />
                  رزروهای من
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/payments">
                  <CreditCard className="me-2 size-4" />
                  پرداخت‌ها
                </MenuLinkItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>مدیریت</DropdownMenuLabel>
                <MenuLinkItem href="/dashboard/vendors">
                  <Building2 className="me-2 size-4" />
                  مجموعه‌ها
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/admin/bookings">
                  <Calendar className="me-2 size-4" />
                  رزروها
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/users">
                  <Users className="me-2 size-4" />
                  کاربران
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/admin/manager-requests">
                  <ClipboardCheck className="me-2 size-4" />
                  درخواست‌های مدیریت مجموعه
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/admin/payments">
                  <CreditCard className="me-2 size-4" />
                  پرداخت‌ها
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/contact">
                  <MessageSquare className="me-2 size-4" />
                  پیام‌ها
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/notifications">
                  <Bell className="me-2 size-4" />
                  اعلان‌ها
                </MenuLinkItem>
              </>
            )}

            {/* ── Manager panel items ── */}
            {user.role === "manager" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>مدیریت مجموعه</DropdownMenuLabel>
                <MenuLinkItem href="/dashboard/vendors">
                  <Building2 className="me-2 size-4" />
                  مجموعه‌ها
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/manager/schedule">
                  <Calendar className="me-2 size-4" />
                  زمان‌بندی
                </MenuLinkItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>شخصی</DropdownMenuLabel>
                <MenuLinkItem href="/dashboard/settings">
                  <UserCircle className="me-2 size-4" />
                  پروفایل
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/bookings">
                  <Calendar className="me-2 size-4" />
                  رزروهای من
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/payments">
                  <CreditCard className="me-2 size-4" />
                  پرداخت‌ها
                </MenuLinkItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>سیستم</DropdownMenuLabel>
                <MenuLinkItem href="/dashboard/notifications">
                  <Bell className="me-2 size-4" />
                  اعلان‌ها
                </MenuLinkItem>
              </>
            )}

            {/* ── User panel items ── */}
            {user.role === "user" && (
              <>
                <DropdownMenuSeparator />
                <MenuLinkItem href="/dashboard/settings">
                  <UserCircle className="me-2 size-4" />
                  پروفایل
                </MenuLinkItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>رزروها</DropdownMenuLabel>
                <MenuLinkItem href="/dashboard/bookings">
                  <Calendar className="me-2 size-4" />
                  رزروهای من
                </MenuLinkItem>
                <MenuLinkItem href="/dashboard/payments">
                  <CreditCard className="me-2 size-4" />
                  پرداخت‌ها
                </MenuLinkItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>سیستم</DropdownMenuLabel>
                <MenuLinkItem href="/dashboard/notifications">
                  <Bell className="me-2 size-4" />
                  اعلان‌ها
                </MenuLinkItem>

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
