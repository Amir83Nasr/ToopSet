"use client"

import { useState, Suspense } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { cn } from "@/lib/utils"

const DesktopUserMenu = dynamic(
  () =>
    import("@/components/public/desktop-user-menu").then((m) => ({
      default: m.DesktopUserMenu,
    })),
  { ssr: false }
)

const MobileNavPanel = dynamic(
  () =>
    import("@/components/public/mobile-nav-panel").then((m) => ({
      default: m.MobileNavPanel,
    })),
  { ssr: false }
)

const navLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/vendors", label: "جستجوی مجموعه‌ها" },
  { href: "/contact", label: "ارتباط با ما" },
]

function MenuToggleIcon({ open }: { open: boolean }) {
  const bar =
    "absolute inset-x-0 mx-auto block h-0.5 w-5 rounded-full bg-current transition-all duration-300 motion-reduce:transition-none"
  return (
    <span className="relative block size-5" aria-hidden="true">
      <span
        className={cn(bar, open ? "top-2.25 rotate-45" : "top-1 rotate-0")}
      />
      <span
        className={cn(
          bar,
          open ? "scale-[0.4] opacity-0" : "scale-100 opacity-100"
        )}
      />
      <span
        className={cn(bar, open ? "top-2.25 -rotate-45" : "top-3.75 rotate-0")}
      />
    </span>
  )
}

export function SiteHeader() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="px-safe mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg">
            <Image
              src="/icons/logo-180.webp"
              alt="toopset"
              width={36}
              height={36}
              className="size-9"
              priority
            />
          </div>
          <span>توپ‌سِت</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Button key={link.href} variant="ghost" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          {isAuthenticated && (
            <Button variant="ghost" asChild>
              <Link href="/dashboard/bookings">رزروهای من</Link>
            </Button>
          )}
        </nav>

        {/* Desktop Auth - lazy loaded */}
        <div className="hidden items-center gap-1 md:flex">
          <Suspense
            fallback={
              loading ? (
                <div className="size-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
              ) : (
                <Link href="/login">
                  <Button className="px-4">ورود / ثبت‌نام</Button>
                </Link>
              )
            }
          >
            <DesktopUserMenu
              user={user}
              loading={loading}
              isAuthenticated={isAuthenticated}
              router={router}
              onLogout={logout}
            />
          </Suspense>
        </div>

        {/* Mobile Hamburger - lazy loaded sheet */}
        <div className="flex items-center gap-1 md:hidden">
          <ModeToggle />
          <Suspense
            fallback={
              <Button variant="ghost" size="icon" className="max-sm:size-11">
                <MenuToggleIcon open={false} />
                <span className="sr-only">منو</span>
              </Button>
            }
          >
            <MobileNavPanel
              open={mobileOpen}
              onOpenChange={setMobileOpen}
              user={user}
              isAuthenticated={isAuthenticated}
              onLogout={logout}
            />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
