"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Calendar, User } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Bottom Navigation Tab Definitions ────────────────────────────────────────

const ACCOUNT_TAB_PATH = "/account"

const tabs = [
  {
    href: "/",
    label: "خانه",
    icon: Home,
    exact: true,
  },
  {
    href: "/vendors",
    label: "جستجو",
    icon: Search,
    exact: false,
  },
  {
    href: "/dashboard/bookings",
    label: "رزروهای من",
    icon: Calendar,
    exact: false,
  },
  {
    href: ACCOUNT_TAB_PATH,
    label: "حساب",
    icon: User,
    exact: false,
  },
] as const

function isTabActive(href: string, pathname: string, exact: boolean): boolean {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + "/")
}

// ── Bottom Nav Tab Item ───────────────────────────────────────────────────────

function BottomNavTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-center transition-colors duration-150",
        "min-h-[56px] select-none",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground active:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-xl transition-all duration-200",
          active ? "scale-110 bg-primary/12" : "scale-100"
        )}
      >
        <Icon
          className={cn(
            "size-5 transition-all duration-200",
            active ? "stroke-[2.2]" : "stroke-[1.8]"
          )}
        />
      </span>
      <span
        className={cn(
          "text-[10px] leading-none font-medium transition-all duration-200",
          active ? "opacity-100" : "opacity-70"
        )}
      >
        {label}
      </span>
    </Link>
  )
}

// ── Bottom Navigation Bar ─────────────────────────────────────────────────────

/**
 * Fixed bottom navigation bar visible only on mobile (< md breakpoint).
 * Renders four tabs: Home, Search, My Bookings, Account.
 * The Account tab routes to /account — a full-page dashboard view.
 */
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="منوی پایین"
      className={cn(
        // Layout
        "fixed inset-x-0 bottom-0 z-[999]",
        // Only visible on mobile
        "flex md:hidden",
        // Background, border and safe-area
        "pb-safe border-t bg-background/95 backdrop-blur-xl",
        // Prevent layout shift from scroll-lock
        "w-full"
      )}
    >
      <div className="flex w-full items-stretch">
        {tabs.map((tab) => (
          <BottomNavTab
            key={tab.href}
            href={tab.href}
            label={tab.label}
            icon={tab.icon}
            active={isTabActive(tab.href, pathname, tab.exact)}
          />
        ))}
      </div>
    </nav>
  )
}
