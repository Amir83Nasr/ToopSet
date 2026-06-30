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
  // ── Dashboard (all roles) ──
  {
    label: "داشبورد",
    roles: ["admin"],
    items: [
      {
        title: "داشبورد",
        url: "/dashboard/admin",
        icon: LayoutDashboard,
      },
      { title: "گزارشات", url: "/dashboard/reports", icon: BarChart3 },
      {
        title: "تنظیمات",
        url: "/dashboard/admin/settings",
        icon: Settings,
      },
      { title: "لاگ‌ها", url: "/dashboard/admin/logs", icon: History },
    ],
  },
  {
    label: "داشبورد",
    roles: ["manager"],
    items: [
      {
        title: "داشبورد",
        url: "/dashboard/manager",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "داشبورد",
    roles: ["user"],
    items: [
      {
        title: "داشبورد",
        url: "/dashboard/user",
        icon: LayoutDashboard,
      },
    ],
  },

  // ── Personal (admin) ──
  {
    label: "شخصی",
    roles: ["admin"],
    items: [
      {
        title: "پروفایل",
        url: "/dashboard/settings",
        icon: UserCircle,
      },
      {
        title: "رزروهای من",
        url: "/dashboard/bookings",
        icon: Calendar,
      },
      {
        title: "پرداخت‌ها",
        url: "/dashboard/payments",
        icon: CreditCard,
      },
    ],
  },

  // ── Management (admin) ──
  {
    label: "مدیریت",
    roles: ["admin"],
    items: [
      { title: "مجموعه‌ها", url: "/dashboard/vendors", icon: Building2 },
      {
        title: "رزروها",
        url: "/dashboard/admin/bookings",
        icon: Calendar,
      },
      { title: "کاربران", url: "/dashboard/users", icon: Users },
      {
        title: "پرداخت‌ها",
        url: "/dashboard/admin/payments",
        icon: CreditCard,
      },
      { title: "پیام‌ها", url: "/dashboard/contact", icon: MessageSquare },
      { title: "اعلان‌ها", url: "/dashboard/notifications", icon: Bell },
    ],
  },

  // ── Vendor management (manager) ──
  {
    label: "مدیریت مجموعه",
    roles: ["manager"],
    items: [{ title: "مجموعه‌ها", url: "/dashboard/vendors", icon: Building2 }],
  },

  // ── Personal (manager) ──
  {
    label: "شخصی",
    roles: ["manager"],
    items: [
      {
        title: "پروفایل",
        url: "/dashboard/settings",
        icon: UserCircle,
      },
      {
        title: "رزروهای من",
        url: "/dashboard/bookings",
        icon: Calendar,
      },
      {
        title: "پرداخت‌ها",
        url: "/dashboard/payments",
        icon: CreditCard,
      },
    ],
  },

  // ── Bookings (user) ──
  {
    label: "رزروها",
    roles: ["user"],
    items: [
      {
        title: "رزروهای من",
        url: "/dashboard/bookings",
        icon: Calendar,
      },
      {
        title: "پرداخت‌ها",
        url: "/dashboard/payments",
        icon: CreditCard,
      },
    ],
  },

  // ── Personal (user) ──
  {
    label: "شخصی",
    roles: ["user"],
    items: [
      {
        title: "پروفایل",
        url: "/dashboard/settings",
        icon: UserCircle,
      },
    ],
  },

  // ── Notifications (non-admin roles) ──
  {
    label: "سیستم",
    roles: ["manager", "user"],
    items: [{ title: "اعلان‌ها", url: "/dashboard/notifications", icon: Bell }],
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
