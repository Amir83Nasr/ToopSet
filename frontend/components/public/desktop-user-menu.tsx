"use client"

import Link from "next/link"
import Image from "next/image"
import { ChevronDown, LogOut } from "lucide-react"
import { Building2 } from "lucide-react"
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
import { LogoutDialog } from "@/components/public/logout-dialog"
import { RegisterComplexDialog } from "@/components/public/register-complex-dialog"
import { buildAvatarUrl } from "@/lib/api"
import { navGroups } from "@/lib/navigation"
import { getInitials, toPersianDigits } from "@/lib/utils"
import { useState, Fragment } from "react"

interface DesktopUserMenuProps {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  onLogout: () => void
}

const roleLabels: Record<string, string> = {
  admin: "ادمین",
  manager: "مدیر مجموعه",
  user: "کاربر",
}

/** Menu item rendered as a Link: prefetching starts while the menu is open,
 *  so the target route is ready before the user clicks. */
function MenuLinkItem({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link href={href}>{children}</Link>
    </DropdownMenuItem>
  )
}

export function DesktopUserMenu({
  user,
  loading,
  isAuthenticated,
  onLogout,
}: DesktopUserMenuProps) {
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [registerComplexDialogOpen, setRegisterComplexDialogOpen] =
    useState(false)
  const isRtl = true

  return (
    <>
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
            className="w-56 border"
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

            {/* ── Role-filtered groups — same source of truth as the sidebar ── */}
            {navGroups
              .filter((g) => g.roles.includes(user.role) && g.items.length > 0)
              .map((group) => (
                <Fragment key={group.label + user.role}>
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                  {group.items.map((item) => (
                    <MenuLinkItem key={item.url} href={item.url}>
                      <item.icon className="me-2 size-4" />
                      {item.title}
                    </MenuLinkItem>
                  ))}
                  <DropdownMenuSeparator />
                </Fragment>
              ))}

            {/* ── Manager access request — regular users only ── */}
            {user.role === "user" && (
              <>
                <DropdownMenuItem
                  onSelect={() => setRegisterComplexDialogOpen(true)}
                  className="cursor-pointer text-blue-600 focus:bg-blue-50 focus:text-blue-700 dark:text-blue-400 dark:focus:bg-blue-950/40 dark:focus:text-blue-300"
                >
                  <Building2 className="me-2 size-4" />
                  ثبت مجموعه ورزشی
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem
              onClick={() => setLogoutDialogOpen(true)}
              className="cursor-pointer"
              variant="destructive"
            >
              <LogOut className="me-2 size-4" />
              خروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link href="/login">
          <Button className="px-4">ورود / ثبت‌نام</Button>
        </Link>
      )}

      <RegisterComplexDialog
        open={registerComplexDialogOpen}
        onOpenChange={setRegisterComplexDialogOpen}
      />

      <LogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={() => {
          onLogout()
          setLogoutDialogOpen(false)
        }}
      />
    </>
  )
}
