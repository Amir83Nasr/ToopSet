"use client"

import dynamic from "next/dynamic"

// Lazy-load the actual nav bar client-side only (uses usePathname internally)
const BottomNav = dynamic(
  () =>
    import("@/components/public/bottom-nav").then((m) => ({
      default: m.BottomNav,
    })),
  { ssr: false }
)

/**
 * Renders BottomNav on mobile (< md breakpoint, handled inside BottomNav).
 * Displayed on all pages, including auth pages and dashboard sub-pages.
 * The spacer reserves flow height for the fixed bar so footer/content
 * never slides under it — one place instead of per-page pb tweaks.
 */
export function BottomNavWrapper() {
  return (
    <>
      <div
        aria-hidden="true"
        className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden"
      />
      <BottomNav />
    </>
  )
}
