"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Menu,
  ChevronDown,
  LayoutDashboard,
  Settings,
  LogOut,
  Building2,
  CreditCard,
  Users,
  Bell,
  BarChart3,
  History,
  MessageSquare,
  UserCircle,
  Calendar,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { buildAvatarUrl } from "@/lib/api"
import { getInitials, toPersianDigits } from "@/lib/utils"

const navLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/courts", label: "جستجوی سالن‌ها" },
  { href: "/contact", label: "ارتباط با ما" },
]

const roleLabels: Record<string, string> = {
  admin: "ادمین",
  manager: "مدیر مجموعه",
  user: "کاربر",
}

export function SiteHeader() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const [isRtl] = useState(true)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg">
            <Image
              src="/icons/profile.svg"
              alt="توپ‌سِت"
              width={36}
              height={36}
              className="size-9"
            />
          </div>
          <span>توپ‌سِت</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden items-center gap-1 md:flex">
          <ModeToggle />
          {loading ? (
            <div className="size-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
          ) : isAuthenticated && user ? (
            <>
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-1 px-2">
                    <span className="text-sm font-medium">
                      {user.full_name}
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align={isRtl ? "start" : "end"}
                  side="bottom"
                  collisionPadding={16}
                  className="z-60 w-56 border"
                >
                  <div>
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
                            <span
                              className="text-xs text-muted-foreground"
                              dir="ltr"
                            >
                              {toPersianDigits(user.phone)}
                            </span>
                            <span className="text-xs text-muted-foreground/30">
                              •
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {roleLabels[user.role] || user.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Dashboard (role-based) */}
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
                          onSelect={() =>
                            router.push("/dashboard/admin/settings")
                          }
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
                          onSelect={() => router.push("/dashboard/courts")}
                          className="cursor-pointer"
                        >
                          <Building2 className="me-2 size-4" />
                          مجموعه‌ها
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            router.push("/dashboard/admin/bookings")
                          }
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
                            router.push("/dashboard/admin/payments")
                          }
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
                          onSelect={() =>
                            router.push("/dashboard/notifications")
                          }
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
                          onSelect={() => router.push("/dashboard/courts")}
                          className="cursor-pointer"
                        >
                          <Building2 className="me-2 size-4" />
                          مجموعه‌ها
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            router.push("/dashboard/manager/schedule")
                          }
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
                      </>
                    )}

                    {/* ── User panel items ── */}
                    {user.role === "user" && (
                      <>
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
                        <DropdownMenuLabel>شخصی</DropdownMenuLabel>
                        <DropdownMenuItem
                          onSelect={() => router.push("/dashboard/settings")}
                          className="cursor-pointer"
                        >
                          <UserCircle className="me-2 size-4" />
                          پروفایل
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* ── Notifications (manager & user) ── */}
                    {user.role !== "admin" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>سیستم</DropdownMenuLabel>
                        <DropdownMenuItem
                          onSelect={() =>
                            router.push("/dashboard/notifications")
                          }
                          className="cursor-pointer"
                        >
                          <Bell className="me-2 size-4" />
                          اعلان‌ها
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
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/register">
                <Button variant="outline" size="sm" className="px-4">
                  ثبت‌نام
                </Button>
              </Link>
              <Link href="/login">
                <Button className="px-4" size="sm">
                  ورود
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <ModeToggle />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11">
                <Menu className="size-5" />
                <span className="sr-only">منو</span>
              </Button>
            </SheetTrigger>
            <SheetContent side={isRtl ? "right" : "left"} className="w-70">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Image
                    src="/icons/profile.svg"
                    alt="توپ‌سِت"
                    width={24}
                    height={24}
                    className="size-6"
                  />
                  توپ‌سِت
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 border-t pt-6">
                {isAuthenticated && user ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 px-3">
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                        {buildAvatarUrl(user.avatar_url) ? (
                          <Image
                            src={buildAvatarUrl(user.avatar_url)!}
                            alt={user.full_name}
                            width={40}
                            height={40}
                            className="size-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="text-xs font-semibold text-primary">
                            {getInitials(user.full_name)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">
                            {user.full_name}
                          </p>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {roleLabels[user.role] || user.role}
                          </span>
                        </div>
                        <p
                          className="mt-0.5 text-xs text-muted-foreground"
                          dir="ltr"
                        >
                          {toPersianDigits(user.phone)}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <LayoutDashboard className="size-4" />
                      داشبورد
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <Settings className="size-4" />
                      تنظیمات
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setMobileOpen(false)
                        setLogoutDialogOpen(true)
                      }}
                      className="flex w-full items-center gap-2 text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="me-2 size-4" />
                      خروج
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 px-3">
                    <Link href="/register" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full">
                        ثبت‌نام
                      </Button>
                    </Link>
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full">ورود</Button>
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>خروج از حساب</AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                logout()
                setLogoutDialogOpen(false)
              }}
            >
              خروج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
