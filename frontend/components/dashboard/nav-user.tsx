"use client"

import { useAuth } from "@/hooks/use-auth"
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
import { User, Settings, LogOut, ChevronUp } from "lucide-react"

export function NavUser() {
  const { user, logout } = useAuth()
  const { isMobile } = useSidebar()

  if (!user) return null

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)

  const roleLabel: Record<string, string> = {
    user: "کاربر",
    manager: "مدیر",
    admin: "مدیر ارشد",
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
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1">
                  <span className="truncate font-medium">{user.full_name}</span>
                  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    {toPersianDigits(user.phone)}
                    <Badge variant="outline" className="px-1 py-0 text-[10px]">
                      {roleLabel[user.role] || user.role}
                    </Badge>
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer">
                <User className="ml-2 size-4" />
                پروفایل
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="ml-2 size-4" />
                تنظیمات
              </DropdownMenuItem>
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
