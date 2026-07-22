"use client"

import Link from "next/link"
import Image from "next/image"
import { ChevronDown, LayoutDashboard } from "lucide-react"
import type { User } from "@/types/auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { ModeToggle } from "@/components/ui/mode-toggle"
import { buildAvatarUrl } from "@/lib/api"
import { getInitials, toPersianDigits } from "@/lib/utils"
import { useState } from "react"

interface DesktopUserMenuProps {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  router: ReturnType<typeof import("next/navigation").useRouter>
  onLogout: () => void
}

const roleLabels: Record<string, string> = {
  admin: "ادمین",
  manager: "مدیر مجموعه",
  user: "کاربر",
}

export function DesktopUserMenu({
  user,
  loading,
  isAuthenticated,
  router,
  onLogout,
}: DesktopUserMenuProps) {
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const isRtl = true

  return (
    <>
      <ModeToggle />
      {loading ? (
        <div className="size-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
      ) : isAuthenticated && user ? (
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-1 px-2">
              <span className="text-sm font-medium">{user.full_name}</span>
              <ChevronDown className="size-3.5 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={isRtl ? "start" : "end"}
            side="bottom"
            collisionPadding={16}
            className="z-60 w-56 border"
          >
            <DropdownMenuLabel className="pb-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/8">
                  {buildAvatarUrl(user.avatar_url) ? (
                    <Image
                      src={buildAvatarUrl(user.avatar_url)!}
                      alt={user.full_name}
                      width={36}
                      height={36}
                      className="size-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs font-semibold text-primary">
                      {getInitials(user.full_name)}
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm leading-tight font-semibold">
                    {user.full_name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {toPersianDigits(user.phone)}
                    </span>
                    <span className="text-xs text-muted-foreground/30">•</span>
                    <span className="text-xs text-muted-foreground">
                      {roleLabels[user.role] || user.role}
                    </span>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                router.push(
                  user.role === "admin"
                    ? "/dashboard/admin"
                    : user.role === "manager"
                      ? "/dashboard/manager"
                      : "/dashboard/user"
                )
              }
              className="cursor-pointer"
            >
              <LayoutDashboard className="me-2 size-4" />
              داشبورد
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setLogoutDialogOpen(true)}
              className="cursor-pointer"
              variant="destructive"
            >
              <span className="me-2 inline-flex size-4 items-center justify-center">
                ✕
              </span>
              خروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link href="/login">
          <Button className="px-4">ورود / ثبت‌نام</Button>
        </Link>
      )}

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
