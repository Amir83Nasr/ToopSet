"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"
import { navGroups } from "@/lib/navigation"

export function NavMain({ onLogoutRequest }: { onLogoutRequest: () => void }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>منو</SidebarGroupLabel>
        <SidebarMenu>
          <div className="p-2 text-sm text-muted-foreground">
            در حال بارگذاری...
          </div>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  if (!user) return null

  const groups = navGroups
    .filter((g) => g.roles.includes(user.role))
    .filter((g) => g.items.length > 0)

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => {
              // Dashboard root items (role-based) only match exact path,
              // otherwise /dashboard/admin matches every admin sub-page
              const isDashboardRoot = [
                "/dashboard/admin",
                "/dashboard/manager",
                "/dashboard/user",
              ].includes(item.url)
              const isActive = isDashboardRoot
                ? pathname === item.url
                : pathname === item.url || pathname.startsWith(item.url + "/")

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}

      {/* Logout */}
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="خروج"
              variant="destructive"
              onClick={onLogoutRequest}
            >
              <LogOut />
              <span>خروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
}
