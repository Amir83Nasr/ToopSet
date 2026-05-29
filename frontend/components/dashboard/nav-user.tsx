"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { toPersianDigits } from "@/lib/utils"
import {
  User,
  Settings,
  LogOut,
  ChevronUp,
  Moon,
  Sun,
  Monitor,
} from "lucide-react"

const roleConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  user: { label: "کاربر", variant: "secondary" },
  manager: { label: "مدیر مجموعه", variant: "default" },
  admin: { label: "مدیر ارشد", variant: "outline" },
}

export function NavUser() {
  const { user, logout } = useAuth()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()

  if (!user) return null

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)

  const role = roleConfig[user.role] || {
    label: user.role,
    variant: "outline" as const,
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-right">
                <span className="truncate font-medium">{user.full_name}</span>
                <span
                  className="truncate text-xs text-muted-foreground"
                  dir="ltr"
                >
                  {toPersianDigits(user.phone)}
                </span>
              </div>
              <ChevronUp className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-right">
                <Avatar className="size-10 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 gap-0.5">
                  <span className="truncate font-medium">{user.full_name}</span>
                  <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    {toPersianDigits(user.phone)}
                    <Badge
                      variant={role.variant}
                      className="px-1.5 py-0 text-[10px] leading-normal"
                    >
                      {role.label}
                    </Badge>
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/dashboard/settings">
                  <User className="ml-2 size-4" />
                  پروفایل
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/dashboard/settings">
                  <Settings className="ml-2 size-4" />
                  تنظیمات
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground">
                تم
              </DropdownMenuLabel>
              <div className="flex items-center gap-1 px-1 py-1">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    theme === "light"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Sun className="size-3.5" />
                  روشن
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    theme === "dark"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Moon className="size-3.5" />
                  تیره
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    theme === "system"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Monitor className="size-3.5" />
                  سیستم
                </button>
              </div>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={logout}
            >
              <LogOut className="ml-2 size-4" />
              خروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
