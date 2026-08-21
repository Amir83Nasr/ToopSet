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
 * Renders BottomNav only on public-facing pages.
 * Hidden on /dashboard/* and /(auth)/* routes.
 * Must be a Client Component so dynamic({ ssr: false }) is permitted.
 */
export function BottomNavWrapper() {
  const pathname = usePathname()

  // Hide bottom nav on dashboard pages and auth pages
  const hidden =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/otp")

  if (hidden) return null
  return <BottomNav />
}
