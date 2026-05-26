"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  ChevronDown,
} from "lucide-react"

const navItems = [
  {
    title: "داشبورد",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "زمین‌ها",
    url: "/dashboard/courts",
    icon: Building2,
    items: [
      { title: "همه زمین‌ها", url: "/dashboard/courts" },
      { title: "مدیریت زمان", url: "/dashboard/courts/schedule" },
    ],
  },
  {
    title: "رزروها",
    url: "/dashboard/bookings",
    icon: CalendarCheck,
  },
  {
    title: "پرداخت‌ها",
    url: "/dashboard/payments",
    icon: CreditCard,
  },
  {
    title: "کیف پول",
    url: "/dashboard/wallet",
    icon: Wallet,
  },
  {
    title: "نظرات",
    url: "/dashboard/reviews",
    icon: Star,
  },
  {
    title: "کاربران",
    url: "/dashboard/users",
    icon: Users,
  },
  {
    title: "تنظیمات",
    url: "/dashboard/settings",
    icon: Settings,
  },
]

export function NavMain() {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>منو</SidebarGroupLabel>
      <SidebarMenu>
        {navItems.map((item) => {
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
