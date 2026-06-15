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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Building2,
  CreditCard,
  Users,
  Settings,
  Bell,
  BarChart3,
  History,
  MessageSquare,
  UserCircle,
  LogOut,
  LayoutDashboard,
  Calendar,
  type LucideIcon,
} from "lucide-react"

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  roles: ("admin" | "manager" | "user")[]
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "داشبورد",
    roles: ["manager"],
    items: [
      {
        title: "داشبورد مدیر",
        url: "/dashboard/manager",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "مدیریت مجموعه",
    roles: ["manager"],
    items: [
      { title: "مجموعه‌ها", url: "/dashboard/courts", icon: Building2 },
      { title: "زمان‌بندی", url: "/dashboard/courts/schedule", icon: Calendar },
    ],
  },
  {
    label: "گزارشات",
    roles: ["admin"],
    items: [{ title: "گزارشات", url: "/dashboard/reports", icon: BarChart3 }],
  },
  {
    label: "مدیریت",
    roles: ["admin"],
    items: [
      { title: "مجموعه‌ها", url: "/dashboard/courts", icon: Building2 },
      { title: "کاربران", url: "/dashboard/users", icon: Users },
      {
        title: "پرداخت‌ها",
        url: "/dashboard/admin/payments",
        icon: CreditCard,
      },
      { title: "پیام‌ها", url: "/dashboard/contact", icon: MessageSquare },
    ],
  },
  {
    label: "تنظیمات سیستم",
    roles: ["admin"],
    items: [
      { title: "تنظیمات", url: "/dashboard/admin/settings", icon: Settings },
      { title: "لاگ‌ها", url: "/dashboard/admin/logs", icon: History },
    ],
  },
  {
    label: "سیستم",
    roles: ["admin", "manager", "user"],
    items: [
      { title: "اعلان‌ها", url: "/dashboard/notifications", icon: Bell },
      { title: "پروفایل", url: "/dashboard/settings", icon: UserCircle },
    ],
  },
]

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
              const isActive =
                pathname === item.url || pathname.startsWith(item.url + "/")

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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <SidebarMenuButton
                  tooltip="خروج"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut />
                  <span>خروج</span>
                </SidebarMenuButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia>
                    <LogOut className="text-destructive" />
                  </AlertDialogMedia>
                  <AlertDialogTitle>خروج از حساب</AlertDialogTitle>
                  <AlertDialogDescription>
                    آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>انصراف</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => logout()}
                  >
                    خروج
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
}
