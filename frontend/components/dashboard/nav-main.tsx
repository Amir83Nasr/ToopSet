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
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  CreditCard,
  Star,
  Users,
  Wallet,
  Settings,
  Bell,
  BarChart3,
  Gavel,
  Heart,
  History,
  MessageSquare,
  LogOut,
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
    label: "اصلی",
    roles: ["admin", "manager", "user"],
    items: [
      { title: "داشبورد", url: "/dashboard", icon: LayoutDashboard },
      { title: "رزروها", url: "/dashboard/bookings", icon: CalendarCheck },
      { title: "علاقه‌مندی‌ها", url: "/dashboard/favorites", icon: Heart },
    ],
  },
  {
    label: "زمین‌ها",
    roles: ["admin", "manager"],
    items: [
      { title: "همه زمین‌ها", url: "/dashboard/courts", icon: Building2 },
      {
        title: "مدیریت زمان",
        url: "/dashboard/courts/schedule",
        icon: CalendarCheck,
      },
    ],
  },
  {
    label: "خدمات",
    roles: ["user"],
    items: [
      { title: "زمین‌ها", url: "/dashboard/courts", icon: Building2 },
      { title: "کیف پول", url: "/dashboard/wallet", icon: Wallet },
      { title: "جریمه‌ها", url: "/dashboard/penalties", icon: Gavel },
    ],
  },
  {
    label: "مدیریت",
    roles: ["manager"],
    items: [
      { title: "زمین‌ها", url: "/dashboard/courts", icon: Building2 },
      {
        title: "مدیریت زمان",
        url: "/dashboard/courts/schedule",
        icon: CalendarCheck,
      },
      { title: "نظرات", url: "/dashboard/reviews", icon: Star },
    ],
  },
  {
    label: "گزارشات",
    roles: ["manager", "admin"],
    items: [{ title: "گزارشات", url: "/dashboard/reports", icon: BarChart3 }],
  },
  {
    label: "مالی",
    roles: ["admin", "manager", "user"],
    items: [
      { title: "کیف پول", url: "/dashboard/wallet", icon: Wallet },
      { title: "جریمه‌ها", url: "/dashboard/penalties", icon: Gavel },
    ],
  },
  {
    label: "امور مالی",
    roles: ["admin"],
    items: [
      { title: "پرداخت‌ها", url: "/dashboard/payments", icon: CreditCard },
    ],
  },
  {
    label: "مدیریت سیستم",
    roles: ["admin"],
    items: [
      { title: "کاربران", url: "/dashboard/users", icon: Users },
      {
        title: "مدیریت رزروها",
        url: "/dashboard/admin/bookings",
        icon: CalendarCheck,
      },
      { title: "پیام‌ها", url: "/dashboard/contact", icon: MessageSquare },
      { title: "نظرات", url: "/dashboard/reviews", icon: Star },
      { title: "لاگ سیستم", url: "/dashboard/admin/logs", icon: History },
    ],
  },
  {
    label: "سیستم",
    roles: ["admin", "manager", "user"],
    items: [
      { title: "اعلان‌ها", url: "/dashboard/notifications", icon: Bell },
      { title: "تنظیمات", url: "/dashboard/settings", icon: Settings },
    ],
  },
]

export function NavMain() {
  const pathname = usePathname()
  const router = useRouter()
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
              <SidebarMenuButton
                tooltip="خروج"
                onClick={() => {
                  logout()
                  router.push("/")
                }}
                className="text-destructive hover:text-destructive data-[active=true]:bg-destructive/10"
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
