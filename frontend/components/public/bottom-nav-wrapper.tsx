"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"

// Lazy-load the actual nav bar client-side only (uses usePathname internally)
const BottomNav = dynamic(
  () =>
    import("@/components/public/bottom-nav").then((m) => ({
      default: m.BottomNav,
    })),
  { ssr: false }
)

/**
 * Renders BottomNav on mobile.
 * Displayed on public-facing pages and user dashboard pages like /dashboard/bookings.
 * Hidden only on auth pages (login, register, otp) and other admin/nested sub-dashboards.
 */
export function BottomNavWrapper() {
  const pathname = usePathname()

  // Hide bottom nav only on auth pages and deep manager/admin dashboard pages
  const hidden =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/otp") ||
    (pathname.startsWith("/dashboard") && pathname !== "/dashboard/bookings")

  if (hidden) return null
  return <BottomNav />
}
