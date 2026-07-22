"use client"

import { useState, Fragment } from "react"
import Link from "next/link"
import Image from "next/image"
import type { User } from "@/types/auth"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@/components/ui/responsive-alert-dialog"
import { buildAvatarUrl } from "@/lib/api"
import { cn, getInitials, toPersianDigits } from "@/lib/utils"
import { navGroups } from "@/lib/navigation"
import { Home, Search, MessageCircle, Calendar, LogOut } from "lucide-react"
import type { ComponentType } from "react"
import { usePathname } from "next/navigation"

type NavIcon = ComponentType<{ className?: string }>

const navLinks: { href: string; label: string; icon: NavIcon }[] = [
  { href: "/", label: "صفحه اصلی", icon: Home },
  { href: "/vendors", label: "جستجوی مجموعه‌ها", icon: Search },
  { href: "/contact", label: "ارتباط با ما", icon: MessageCircle },
]

const roleLabels: Record<string, string> = {
  admin: "ادمین",
  manager: "مدیر مجموعه",
  user: "کاربر",
}

function MobileNavItem({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  onNavigate: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/70"
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-primary/12 text-primary"
            : "bg-muted/60 text-muted-foreground group-hover:text-foreground"
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="flex-1 truncate">{label}</span>
      {active && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
    </Link>
  )
}

interface MobileNavPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  isAuthenticated: boolean
  onLogout: () => void
}

export function MobileNavPanel({
  open,
  onOpenChange,
  user,
  isAuthenticated,
  onLogout,
}: MobileNavPanelProps) {
  const pathname = usePathname()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const isActivePath = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/")

  const closeMobile = () => onOpenChange(false)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="max-sm:size-11">
            <span className="sr-only">منو</span>
            <svg
              className="size-5"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 5h14M3 10h14M3 15h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-76 flex-col gap-0 p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="flex items-center gap-2 text-lg font-bold">
              <span className="flex size-9 items-center justify-center overflow-hidden rounded-lg">
                <Image
                  src="/icons/logo-180.webp"
                  alt="toopset"
                  width={36}
                  height={36}
                  className="size-9"
                />
              </span>
              توپ‌سِت
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
            {isAuthenticated && user && (
              <div className="mb-3">
                <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                    {buildAvatarUrl(user.avatar_url) ? (
                      <Image
                        src={buildAvatarUrl(user.avatar_url)!}
                        alt={user.full_name}
                        width={44}
                        height={44}
                        className="size-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-sm font-semibold text-primary">
                        {getInitials(user.full_name)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {user.full_name}
                      </p>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {roleLabels[user.role] || user.role}
                      </span>
                    </div>
                    <p
                      className="mt-0.5 text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      {toPersianDigits(user.phone)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {navLinks.map((link) => (
              <MobileNavItem
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
                active={isActivePath(link.href)}
                onNavigate={closeMobile}
              />
            ))}
            {isAuthenticated && user
              ? navGroups
                  .filter((g) => g.roles.includes(user.role))
                  .filter((g) => g.items.length > 0)
                  .map((group) => (
                    <Fragment key={group.label + user.role}>
                      <p className="px-2.5 pt-5 pb-1.5 text-xs font-medium text-muted-foreground/70">
                        {group.label}
                      </p>
                      {group.items.map((item) => {
                        const isDashboardRoot =
                          item.url === "/dashboard/admin" ||
                          item.url === "/dashboard/manager" ||
                          item.url === "/dashboard/user"
                        const isActive = isDashboardRoot
                          ? pathname === item.url
                          : isActivePath(item.url)
                        return (
                          <MobileNavItem
                            key={item.url}
                            href={item.url}
                            label={item.title}
                            icon={item.icon}
                            active={isActive}
                            onNavigate={closeMobile}
                          />
                        )
                      })}
                    </Fragment>
                  ))
              : isAuthenticated && (
                  <MobileNavItem
                    href="/dashboard/bookings"
                    label="رزروهای من"
                    icon={Calendar}
                    active={isActivePath("/dashboard/bookings")}
                    onNavigate={closeMobile}
                  />
                )}
          </div>

          <SheetFooter className="border-t p-4">
            {isAuthenticated && user ? (
              <Button
                variant="destructive"
                onClick={() => {
                  closeMobile()
                  setLogoutDialogOpen(true)
                }}
                className="w-full"
              >
                <LogOut className="me-2 size-4" />
                خروج
              </Button>
            ) : (
              <Link href="/login" onClick={closeMobile} className="block">
                <Button className="w-full">ورود / ثبت‌نام</Button>
              </Link>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ResponsiveAlertDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              خروج از حساب
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel>انصراف</ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              variant="destructive"
              onClick={() => {
                onLogout()
                setLogoutDialogOpen(false)
              }}
            >
              خروج
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  )
}
