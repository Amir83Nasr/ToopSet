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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  ChevronDown,
} from "lucide-react"

interface NavItem {
  title: string
  url: string
  icon: typeof LayoutDashboard
  roles?: ("admin" | "manager" | "user")[]
  items?: { title: string; url: string }[]
}

const allNavItems: NavItem[] = [
  {
    title: "داشبورد",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "user"],
  },
  {
    title: "زمین‌ها",
    url: "/dashboard/courts",
    icon: Building2,
    roles: ["admin", "manager", "user"],
    items: [
      { title: "همه زمین‌ها", url: "/dashboard/courts" },
      { title: "مدیریت زمان", url: "/dashboard/courts/schedule" },
    ],
  },
  {
    title: "رزروها",
    url: "/dashboard/bookings",
    icon: CalendarCheck,
    roles: ["admin", "manager", "user"],
  },
  {
    title: "پرداخت‌ها",
    url: "/dashboard/payments",
    icon: CreditCard,
    roles: ["admin"],
  },
  {
    title: "گزارشات",
    url: "/dashboard/reports",
    icon: BarChart3,
    roles: ["manager", "admin"],
  },
  {
    title: "کیف پول",
    url: "/dashboard/wallet",
    icon: Wallet,
    roles: ["admin", "manager", "user"],
  },
  {
    title: "اعلان‌ها",
    url: "/dashboard/notifications",
    icon: Bell,
    roles: ["admin", "manager", "user"],
  },
  {
    title: "نظرات",
    url: "/dashboard/reviews",
    icon: Star,
    roles: ["admin", "manager"],
  },
  {
    title: "کاربران",
    url: "/dashboard/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "تنظیمات",
    url: "/dashboard/settings",
    icon: Settings,
    roles: ["admin", "manager", "user"],
  },
]

export function NavMain() {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  const navItems = allNavItems.filter(item => {
    if (!item.roles) return true
    return user && item.roles.includes(user.role)
  })

  return (
    <SidebarGroup>
      <SidebarGroupLabel>منو</SidebarGroupLabel>
      <SidebarMenu>
        {loading ? (
          <div className="p-2 text-sm text-muted-foreground">در حال بارگذاری...</div>
        ) : navItems.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(item.url + "/")

          if (item.items) {
            return (
              <Collapsible
                key={item.title}
                defaultOpen={isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronDown className="mr-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((sub) => (
                        <SidebarMenuSubItem key={sub.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === sub.url}
                          >
                            <Link href={sub.url}>
                              <span>{sub.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

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
  )
}