"use client"

import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Calendar, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

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
    label: "حساب کاربری",
    icon: User,
    exact: false,
  },
] as const

function isTabActive(href: string, pathname: string, exact: boolean): boolean {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + "/")
}

// ── Bottom Nav Tab Item ───────────────────────────────────────────────────────

function BottomNavTabContent({
  label,
  icon: Icon,
  active,
}: {
  label: string
  icon: React.ElementType
  active: boolean
}) {
  const { pending } = useLinkStatus()

  return (
    <>
      <span
        aria-busy={pending || undefined}
        className={cn(
          "flex size-8 items-center justify-center rounded-xl transition-all duration-200",
          active && !pending ? "scale-110 bg-primary/12" : "scale-100"
        )}
      >
        {pending ? (
          <Spinner className="size-5 text-primary" />
        ) : (
          <Icon
            className={cn(
              "size-5 transition-all duration-200",
              active ? "stroke-[2.2]" : "stroke-[1.8]"
            )}
          />
        )}
      </span>
      <span
        className={cn(
          "text-[10px] leading-none font-medium transition-all duration-200",
          active && !pending ? "opacity-100" : "opacity-70"
        )}
      >
        {label}
      </span>
    </>
  )
}

function BottomNavTab({
  href,
  label,
  icon,
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
      // Always in view on mobile — prefetch keeps these four primary
      // destinations instant to enter.
      prefetch
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-center transition-colors duration-150",
        "min-h-[56px] select-none",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground active:text-foreground"
      )}
    >
      <BottomNavTabContent label={label} icon={icon} active={active} />
    </Link>
  )
}

// ── Bottom Navigation Bar ─────────────────────────────────────────────────────

/**
 * Fixed bottom navigation bar visible only on mobile (< md breakpoint).
 * Renders four tabs: Home, Search, My Bookings, Account.
 * The Account tab always routes to /account — that page handles both
 * logged-in and guest states, so the tab href never depends on auth state.
 *
 * Positioning: `fixed bottom-0` + `pb-safe` (viewport-fit=cover is set in
 * app/layout.tsx). Do NOT add paint/offset extensions below the fold
 * (e.g. an ::after box past the viewport edge) — overflow past the
 * viewport edge enlarges the document scrollable area, which shows up as
 * phantom space below the nav while scrolling on mobile browsers. body
 * already carries bg-background, so toolbar-resize repaint needs no cover.
 */
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="منوی پایین"
      data-bottom-nav
      className={cn(
        // Layout
        "fixed inset-x-0 bottom-0 z-40",
        // Only visible on mobile
        "flex md:hidden",
        // Background, border and safe-area
        "pb-safe border-t bg-background/95 backdrop-blur-xl",
        // Composited layer (reuses .gpu-layer from globals.css): keeps the
        // bar pinned to the viewport while mobile browsers repaint during
        // momentum scroll / toolbar collapse-expand. No below-fold paint
        // extensions here: body already carries bg-background, and overflow
        // past the viewport edge surfaces as phantom space below the bar
        // on mobile WebKit/Chromium.
        "gpu-layer",
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
