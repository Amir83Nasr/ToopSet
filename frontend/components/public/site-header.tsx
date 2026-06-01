"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Menu, ChevronDown, LayoutDashboard } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { LoginModal } from "@/components/login-modal"
import { RegisterModal } from "@/components/register-modal"

const navLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/#about", label: "معرفی" },
  { href: "/#courts", label: "جستجوی سالن‌ها" },
  { href: "/contact", label: "ارتباط با ما" },
]

export function SiteHeader() {
  const { user, loading, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
    : "?"

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/60 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg">
            <Image
              src="/favicon.svg"
              alt="توپ‌سِت"
              width={36}
              height={36}
              className="size-9"
            />
          </div>
          <span>توپ‌سِت</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden items-center gap-1 md:flex">
          <ModeToggle />
          {loading ? (
            <div className="size-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user.full_name}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span>{user.full_name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {user.phone}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="ml-2 size-4" />
                    داشبورد
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive"
                >
                  خروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <RegisterModal
                open={registerOpen}
                onOpenChange={setRegisterOpen}
                onLoginClick={() => {
                  setRegisterOpen(false)
                  setLoginOpen(true)
                }}
              >
                <Button variant="outline">ثبت‌نام</Button>
              </RegisterModal>
              <LoginModal
                open={loginOpen}
                onOpenChange={setLoginOpen}
                onRegisterClick={() => {
                  setLoginOpen(false)
                  setRegisterOpen(true)
                }}
              >
                <Button>ورود</Button>
              </LoginModal>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <ModeToggle />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
                <span className="sr-only">منو</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Image
                    src="/favicon.svg"
                    alt="توپ‌سِت"
                    width={24}
                    height={24}
                    className="size-6"
                  />
                  توپ‌سِت
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 border-t pt-6">
                {isAuthenticated && user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-3">
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.phone}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <LayoutDashboard className="size-4" />
                      داشبورد
                    </Link>
                    <button
                      onClick={() => {
                        logout()
                        setMobileOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      خروج
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 px-3">
                    <RegisterModal
                      open={registerOpen}
                      onOpenChange={setRegisterOpen}
                      onLoginClick={() => {
                        setRegisterOpen(false)
                        setLoginOpen(true)
                      }}
                    >
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setMobileOpen(false)}
                      >
                        ثبت‌نام
                      </Button>
                    </RegisterModal>
                    <LoginModal
                      open={loginOpen}
                      onOpenChange={setLoginOpen}
                      onRegisterClick={() => {
                        setLoginOpen(false)
                        setRegisterOpen(true)
                      }}
                    >
                      <Button
                        className="w-full"
                        onClick={() => setMobileOpen(false)}
                      >
                        ورود
                      </Button>
                    </LoginModal>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
