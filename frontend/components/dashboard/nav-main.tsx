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
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogMedia,
  ResponsiveAlertDialogTitle,
  ResponsiveAlertDialogTrigger,
} from "@/components/ui/responsive-alert-dialog"
import { LogOut } from "lucide-react"
import { navGroups } from "@/lib/navigation"

export function NavMain() {
  const pathname = usePathname()
  const { user, loading, logout } = useAuth()

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
            <ResponsiveAlertDialog>
              <ResponsiveAlertDialogTrigger asChild>
                <SidebarMenuButton tooltip="خروج" variant="destructive">
                  <LogOut />
                  <span>خروج</span>
                </SidebarMenuButton>
              </ResponsiveAlertDialogTrigger>
              <ResponsiveAlertDialogContent>
                <ResponsiveAlertDialogHeader>
                  <ResponsiveAlertDialogMedia className="bg-destructive/10 dark:bg-destructive/20">
                    <LogOut className="text-destructive" />
                  </ResponsiveAlertDialogMedia>
                  <ResponsiveAlertDialogTitle>
                    خروج از حساب
                  </ResponsiveAlertDialogTitle>
                  <ResponsiveAlertDialogDescription>
                    آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟
                  </ResponsiveAlertDialogDescription>
                </ResponsiveAlertDialogHeader>
                <ResponsiveAlertDialogFooter>
                  <ResponsiveAlertDialogCancel>
                    انصراف
                  </ResponsiveAlertDialogCancel>
                  <ResponsiveAlertDialogAction
                    variant="destructive"
                    onClick={() => logout()}
                  >
                    خروج
                  </ResponsiveAlertDialogAction>
                </ResponsiveAlertDialogFooter>
              </ResponsiveAlertDialogContent>
            </ResponsiveAlertDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
}
