"use client"

import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { LogOut, Loader2 } from "lucide-react"
import { navGroups } from "@/lib/navigation"

/** Icon + title inside a sidebar link; swaps to a spinner while navigating. */
function NavItemContent({
  icon: Icon,
  title,
}: {
  icon: React.ElementType
  title: string
}) {
  const { pending } = useLinkStatus()
  return (
    <>
      {pending ? <Loader2 className="animate-spin" /> : <Icon />}
      <span>{title}</span>
    </>
  )
}

export function NavMain({ onLogoutRequest }: { onLogoutRequest: () => void }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Skeleton rows instead of a text placeholder — no layout shift once the
  // role-filtered menu renders, and the sidebar never looks broken.
  if (loading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>منو</SidebarGroupLabel>
        <SidebarMenu>
          {Array.from({ length: 4 }).map((_, i) => (
            <SidebarMenuItem key={i}>
              <Skeleton className="h-8 w-full" />
            </SidebarMenuItem>
          ))}
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
                      <NavItemContent icon={item.icon} title={item.title} />
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
