"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/ui/mode-toggle"

const DesktopUserMenu = dynamic(
  () =>
    import("@/components/public/desktop-user-menu").then((m) => ({
      default: m.DesktopUserMenu,
    })),
  { ssr: false }
)

const navLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/vendors", label: "جستجوی مجموعه‌ها" },
  { href: "/contact", label: "ارتباط با ما" },
]

export function SiteHeader() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout } = useAuth()

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="px-safe mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg">
            <Image
              src="/icons/logo-180.webp"
              alt="توپ‌سِت (ToopSet)"
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

        {/* Desktop Auth + theme toggle */}
        <div className="flex items-center gap-1">
          <ModeToggle />
          <div className="hidden md:flex">
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
        </div>
      </div>
    </header>
  )
}
