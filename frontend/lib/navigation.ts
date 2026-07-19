import type { LucideIcon } from "lucide-react"
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
  LayoutDashboard,
  Calendar,
  Undo2,
} from "lucide-react"

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  roles: ("admin" | "manager" | "user")[]
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
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
      {
        title: "بازگشت وجه‌ها",
        url: "/dashboard/refunds",
        icon: Undo2,
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
      {
        title: "عودت‌ها",
        url: "/dashboard/admin/refunds",
        icon: Undo2,
      },
      {
        title: "لغوهای سالندار",
        url: "/dashboard/admin/manager-cancellations",
        icon: Calendar,
      },
      {
        title: "تسویه‌ها",
        url: "/dashboard/admin/settlements",
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
      {
        title: "بازگشت وجه‌ها",
        url: "/dashboard/refunds",
        icon: Undo2,
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
      {
        title: "بازگشت وجه‌ها",
        url: "/dashboard/refunds",
        icon: Undo2,
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
