"use client"

import { usePathname } from "next/navigation"
import { BottomNav } from "@/components/public/bottom-nav"

/**
 * Renders BottomNav only on public-facing pages.
 * Hidden on /dashboard/* and /(auth)/* routes.
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
