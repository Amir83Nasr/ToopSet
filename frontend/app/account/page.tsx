"use client"

import { useState, Fragment } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import { buildAvatarUrl } from "@/lib/api"
import { cn, getInitials, toPersianDigits } from "@/lib/utils"
import { LogoutDialog } from "@/components/public/logout-dialog"
import { SiteHeader } from "@/components/public/site-header"
import {
  Home,
  Search,
  MessageCircle,
  LayoutDashboard,
  BarChart3,
  Settings,
  History,
  UserCircle,
  Calendar,
  CreditCard,
  Undo2,
  LogOut,
  ChevronLeft,
} from "lucide-react"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

// ── Role label map ────────────────────────────────────────────────────────────

const roleLabels: Record<string, string> = {
  admin: "ادمین",
  manager: "مدیر مجموعه",
  user: "کاربر",
}

// ── Nav section & item definitions ───────────────────────────────────────────

interface AccountNavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface AccountNavSection {
  title: string
  items: AccountNavItem[]
  /** roles that can see this section; undefined = everyone */
  roles?: Array<"admin" | "manager" | "user">
}

const generalSection: AccountNavSection = {
  title: "عمومی",
  items: [
    { href: "/", label: "صفحه اصلی", icon: Home },
    { href: "/vendors", label: "جستجوی مجموعه‌ها", icon: Search },
    { href: "/contact", label: "ارتباط با ما", icon: MessageCircle },
  ],
}

const dashboardSection: AccountNavSection = {
  title: "داشبورد",
  roles: ["admin"],
  items: [
    { href: "/dashboard/admin", label: "داشبورد", icon: LayoutDashboard },
    { href: "/dashboard/reports", label: "گزارشات", icon: BarChart3 },
    { href: "/dashboard/admin/settings", label: "تنظیمات", icon: Settings },
    { href: "/dashboard/admin/logs", label: "لاگ‌ها", icon: History },
  ],
}

const dashboardManagerSection: AccountNavSection = {
  title: "داشبورد",
  roles: ["manager"],
  items: [
    { href: "/dashboard/manager", label: "داشبورد", icon: LayoutDashboard },
    { href: "/dashboard/reports", label: "گزارشات", icon: BarChart3 },
    { href: "/dashboard/settings", label: "تنظیمات", icon: Settings },
  ],
}

const dashboardUserSection: AccountNavSection = {
  title: "داشبورد",
  roles: ["user"],
  items: [{ href: "/dashboard/user", label: "داشبورد", icon: LayoutDashboard }],
}

const personalSection: AccountNavSection = {
  title: "شخصی",
  roles: ["admin", "manager", "user"],
  items: [
    { href: "/dashboard/settings", label: "پروفایل", icon: UserCircle },
    { href: "/dashboard/bookings", label: "رزروهای من", icon: Calendar },
    { href: "/dashboard/payments", label: "پرداخت‌ها", icon: CreditCard },
    { href: "/dashboard/refunds", label: "بازگشت وجه‌ها", icon: Undo2 },
  ],
}

const ALL_SECTIONS: AccountNavSection[] = [
  generalSection,
  dashboardSection,
  dashboardManagerSection,
  dashboardUserSection,
  personalSection,
]

// ── Utility: check active path ────────────────────────────────────────────────

function isActivePath(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

// ── Nav Item Component ────────────────────────────────────────────────────────

function AccountNavItem({
  item,
  pathname,
  onClick,
}: {
  item: AccountNavItem
  pathname: string
  onClick?: () => void
}) {
  const active = isActivePath(item.href, pathname)
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors duration-150",
        active
          ? "bg-primary/8 text-primary"
          : "text-foreground hover:bg-muted/70 active:bg-muted/90"
      )}
    >
      {/* Leading icon */}
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-150",
          active
            ? "bg-primary/12 text-primary"
            : "bg-muted/60 text-muted-foreground group-hover:text-foreground"
        )}
      >
        <item.icon className="size-4.5" />
      </span>

      {/* Label */}
      <span className="flex-1 truncate">{item.label}</span>

      {/* Trailing chevron */}
      <ChevronLeft
        className={cn(
          "size-4 shrink-0 transition-colors duration-150",
          active
            ? "text-primary/70"
            : "text-muted-foreground/40 group-hover:text-muted-foreground"
        )}
      />
    </Link>
  )
}

// ── Account Dashboard Page ────────────────────────────────────────────────────

export default function AccountPage() {
  const pathname = usePathname()
  const { user, loading, isAuthenticated, logout } = useAuth()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  // Filter sections based on user role
  const visibleSections = ALL_SECTIONS.filter((section) => {
    if (!section.roles) return true // general sections, always visible
    if (!user) return false
    return section.roles.includes(user.role as "admin" | "manager" | "user")
  })

  return (
    <>
      <div className="flex min-h-svh flex-col bg-background">
        <SiteHeader />
        {/* ── Page Content ── */}
        <main
          id="main-content"
          className="mx-auto w-full max-w-lg flex-1 px-4 pt-20 pb-24"
        >
          {/* ── User Profile Card ── */}
          <div className="mb-5 rounded-3xl bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-4">
            {loading ? (
              /* Loading skeleton */
              <div className="flex items-center gap-3">
                <div className="size-16 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/12 ring-2 ring-primary/20">
                  {buildAvatarUrl(user.avatar_url) ? (
                    <Image
                      src={buildAvatarUrl(user.avatar_url)!}
                      alt={user.full_name}
                      width={64}
                      height={64}
                      className="size-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-lg font-bold text-primary">
                      {getInitials(user.full_name)}
                    </span>
                  )}
                </div>

                {/* User info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-bold">
                      {user.full_name}
                    </p>
                    <span className="shrink-0 rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      {roleLabels[user.role] ?? user.role}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
                    {toPersianDigits(user.phone)}
                  </p>
                </div>
              </div>
            ) : (
              /* Guest state */
              <div className="flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted/60">
                  <UserCircle className="size-9 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    وارد نشده‌اید
                  </p>
                  <Link
                    href="/login"
                    className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    ورود / ثبت‌نام
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── Navigation Sections ── */}
          <div className="flex flex-col gap-3">
            {visibleSections.map((section) => (
              <Fragment key={section.title + (section.roles?.join(",") ?? "")}>
                <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                  {/* Section title */}
                  <p className="border-b px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground/80">
                    {section.title}
                  </p>
                  {/* Section items */}
                  <div className="flex flex-col gap-1 p-2">
                    {section.items.map((item) => (
                      <AccountNavItem
                        key={item.href}
                        item={item}
                        pathname={pathname}
                      />
                    ))}
                  </div>
                </div>
              </Fragment>
            ))}

            {/* ── Logout Section ── */}
            {isAuthenticated && user && (
              <div className="overflow-hidden rounded-2xl border border-destructive/20 bg-card shadow-sm">
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => setLogoutDialogOpen(true)}
                    className={cn(
                      "group flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3",
                      "text-sm font-semibold text-destructive transition-colors duration-150",
                      "hover:bg-destructive/8 active:bg-destructive/12"
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive transition-colors duration-150 group-hover:bg-destructive/15">
                      <LogOut className="size-4.5" />
                    </span>
                    <span className="flex-1 text-right">خروج از حساب</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Logout confirmation dialog */}
      <LogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={logout}
      />
    </>
  )
}
