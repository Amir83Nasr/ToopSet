"use client"

import { useState, type ComponentType } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { motion, useReducedMotion, type Variants } from "framer-motion"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
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
  Home,
  Search,
  MessageCircle,
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
import { cn, getInitials, toPersianDigits } from "@/lib/utils"

type NavIcon = ComponentType<{ className?: string }>

const navLinks: { href: string; label: string; icon: NavIcon }[] = [
  { href: "/", label: "صفحه اصلی", icon: Home },
  { href: "/vendors", label: "جستجوی مجموعه‌ها", icon: Search },
  { href: "/contact", label: "ارتباط با ما", icon: MessageCircle },
]

const roleLabels: Record<string, string> = {
  admin: "ادمین",
  manager: "مدیر مجموعه",
  user: "کاربر",
}

/**
 * Animated hamburger → X icon. The three bars morph based on `open`,
 * respecting reduced-motion preferences.
 */
function MenuToggleIcon({ open }: { open: boolean }) {
  const reduce = useReducedMotion()
  const transition = reduce
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }
  const bar =
    "absolute inset-x-0 mx-auto block h-[2px] w-5 rounded-full bg-current"

  return (
    <span className="relative block size-5" aria-hidden="true">
      <motion.span
        className={cn(bar, "top-1")}
        animate={open ? { rotate: 45, top: 9 } : { rotate: 0, top: 4 }}
        transition={transition}
      />
      <motion.span
        className={cn(bar, "top-[9px]")}
        animate={open ? { opacity: 0, scaleX: 0.4 } : { opacity: 1, scaleX: 1 }}
        transition={transition}
      />
      <motion.span
        className={cn(bar, "top-[15px]")}
        animate={open ? { rotate: -45, top: 9 } : { rotate: 0, top: 14 }}
        transition={transition}
      />
    </span>
  )
}

/** A single row in the mobile nav: icon chip + label + active indicator. */
function MobileNavItem({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  variants,
}: {
  href: string
  label: string
  icon: NavIcon
  active: boolean
  onNavigate: () => void
  variants: Variants
}) {
  return (
    <motion.div variants={variants}>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/70"
        )}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            active
              ? "bg-primary/12 text-primary"
              : "bg-muted/60 text-muted-foreground group-hover:text-foreground"
          )}
        >
          <Icon className="size-[18px]" />
        </span>
        <span className="flex-1 truncate">{label}</span>
        {active && (
          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
        )}
      </Link>
    </motion.div>
  )
}

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const { user, loading, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const [isRtl] = useState(true)

  const closeMobile = () => setMobileOpen(false)

  // Exact match for the home route, prefix match for the rest, so a nested
  // page (e.g. /vendors/12) still highlights its parent nav entry.
  const isActivePath = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/")

  // Stagger the nav rows in when the sheet opens; collapse to instant when the
  // user prefers reduced motion.
  const listVariants: Variants = {
    hidden: {},
    show: {
      transition: reduce
        ? { duration: 0 }
        : { staggerChildren: 0.05, delayChildren: 0.08 },
    },
  }
  const itemVariants: Variants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, x: 12 },
        show: {
          opacity: 1,
          x: 0,
          transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
        },
      }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="px-safe mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
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
          {isAuthenticated && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/bookings">رزروهای من</Link>
            </Button>
          )}
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
                          onSelect={() => router.push("/dashboard/vendors")}
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
                          onSelect={() => router.push("/dashboard/vendors")}
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
              <Link href="/login">
                <Button className="px-4" size="sm">
                  ورود / ثبت‌نام
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
              <Button variant="ghost" size="icon" className="max-sm:size-11">
                <MenuToggleIcon open={mobileOpen} />
                <span className="sr-only">منو</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side={isRtl ? "right" : "left"}
              className="flex w-[19rem] flex-col gap-0 p-0"
            >
              {/* ── Brand header ── */}
              <SheetHeader className="border-b p-4">
                <SheetTitle className="flex items-center gap-2 text-lg font-bold">
                  <span className="flex size-9 items-center justify-center overflow-hidden rounded-lg">
                    <Image
                      src="/icons/profile.svg"
                      alt="توپ‌سِت"
                      width={36}
                      height={36}
                      className="size-9"
                    />
                  </span>
                  توپ‌سِت
                </SheetTitle>
              </SheetHeader>

              {/* ── Scrollable nav ── */}
              <motion.div
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
              >
                {isAuthenticated && user && (
                  <motion.div variants={itemVariants} className="mb-3">
                    <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
                      <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                        {buildAvatarUrl(user.avatar_url) ? (
                          <Image
                            src={buildAvatarUrl(user.avatar_url)!}
                            alt={user.full_name}
                            width={44}
                            height={44}
                            className="size-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="text-sm font-semibold text-primary">
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
                  </motion.div>
                )}

                {navLinks.map((link) => (
                  <MobileNavItem
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    icon={link.icon}
                    active={isActivePath(link.href)}
                    onNavigate={closeMobile}
                    variants={itemVariants}
                  />
                ))}
                {isAuthenticated && (
                  <MobileNavItem
                    href="/dashboard/bookings"
                    label="رزروهای من"
                    icon={Calendar}
                    active={isActivePath("/dashboard/bookings")}
                    onNavigate={closeMobile}
                    variants={itemVariants}
                  />
                )}

                {isAuthenticated && user && (
                  <>
                    <motion.p
                      variants={itemVariants}
                      className="px-2.5 pt-5 pb-1.5 text-xs font-medium text-muted-foreground/70"
                    >
                      حساب کاربری
                    </motion.p>
                    <MobileNavItem
                      href="/dashboard"
                      label="داشبورد"
                      icon={LayoutDashboard}
                      active={pathname === "/dashboard"}
                      onNavigate={closeMobile}
                      variants={itemVariants}
                    />
                    <MobileNavItem
                      href="/dashboard/settings"
                      label="تنظیمات"
                      icon={Settings}
                      active={isActivePath("/dashboard/settings")}
                      onNavigate={closeMobile}
                      variants={itemVariants}
                    />
                  </>
                )}
              </motion.div>

              {/* ── Pinned auth footer ── */}
              <SheetFooter className="border-t p-4">
                {isAuthenticated && user ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setMobileOpen(false)
                      setLogoutDialogOpen(true)
                    }}
                    className="w-full"
                  >
                    <LogOut className="me-2 size-4" />
                    خروج
                  </Button>
                ) : (
                  <Link href="/login" onClick={closeMobile} className="block">
                    <Button className="w-full">ورود / ثبت‌نام</Button>
                  </Link>
                )}
              </SheetFooter>
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
