"use client"

import { useState, Fragment } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import { buildAvatarUrl } from "@/lib/api"
import { cn, getInitials, toPersianDigits } from "@/lib/utils"
import { LogoutDialog } from "@/components/public/logout-dialog"
import { SiteHeader } from "@/components/public/site-header"
import { navGroups } from "@/lib/navigation"
import {
  Home,
  Search,
  MessageCircle,
  UserCircle,
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

// ── General (public) nav — always visible ─────────────────────────────────────

const generalItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "صفحه اصلی", icon: Home },
  { href: "/vendors", label: "جستجوی مجموعه‌ها", icon: Search },
  { href: "/contact", label: "ارتباط با ما", icon: MessageCircle },
]

// ── Utility ───────────────────────────────────────────────────────────────────

function isActivePath(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/"
  // exact match for dashboard roots to avoid /dashboard/admin matching /dashboard/admin/bookings
  const dashboardRoots = [
    "/dashboard/admin",
    "/dashboard/manager",
    "/dashboard/user",
  ]
  if (dashboardRoots.includes(href)) return pathname === href
  return pathname === href || pathname.startsWith(href + "/")
}

// ── Nav Item ──────────────────────────────────────────────────────────────────

function AccountNavItem({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string
  label: string
  icon: LucideIcon | React.ElementType
  pathname: string
}) {
  const active = isActivePath(href, pathname)
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors duration-150",
        active
          ? "bg-primary/8 text-primary"
          : "text-foreground hover:bg-muted/70 active:bg-muted/90"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-150",
          active
            ? "bg-primary/12 text-primary"
            : "bg-muted/60 text-muted-foreground group-hover:text-foreground"
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="flex-1 truncate">{label}</span>
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

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <p className="border-b px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground/80">
        {title}
      </p>
      <div className="flex flex-col gap-1 p-2">{children}</div>
    </div>
  )
}

// ── Account Dashboard Page ────────────────────────────────────────────────────

export default function AccountPage() {
  const pathname = usePathname()
  const { user, loading, isAuthenticated, logout } = useAuth()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  // Role-filtered nav groups — same source of truth as the old mobile panel
  const userRole = user?.role as "admin" | "manager" | "user" | undefined
  const filteredGroups = userRole
    ? navGroups.filter((g) => g.roles.includes(userRole) && g.items.length > 0)
    : []

  return (
    <>
      <div className="flex min-h-svh flex-col bg-background">
        <SiteHeader />
        <main
          id="main-content"
          className="mx-auto w-full max-w-lg flex-1 px-4 pt-20 pb-24"
        >
          {/* ── User Profile Card ── */}
          <div className="mb-5 rounded-3xl bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-4">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="size-16 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-4">
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

          {/* ── Nav Sections ── */}
          <div className="flex flex-col gap-3">
            {/* General — always shown */}
            <SectionCard title="عمومی">
              {generalItems.map((item) => (
                <AccountNavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  pathname={pathname}
                />
              ))}
            </SectionCard>

            {/* Role-based groups — mirrors navGroups from lib/navigation.ts */}
            {filteredGroups.map((group) => (
              <Fragment key={group.label + userRole}>
                <SectionCard title={group.label}>
                  {group.items.map((item) => (
                    <AccountNavItem
                      key={item.url}
                      href={item.url}
                      label={item.title}
                      icon={item.icon}
                      pathname={pathname}
                    />
                  ))}
                </SectionCard>
              </Fragment>
            ))}

            {/* Logout */}
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

      <LogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={logout}
      />
    </>
  )
}
