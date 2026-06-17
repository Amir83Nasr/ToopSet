"use client"

import { Fragment } from "react"
import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

const breadcrumbLabels: Record<string, string> = {
  dashboard: "داشبورد",
  user: "کاربر",
  manager: "مدیر مجموعه",
  admin: "مدیریت سیستم",
  courts: "مجموعه‌ها",
  create: "ایجاد",
  schedule: "مدیریت زمان",
  bookings: "رزروها",
  payments: "پرداخت‌ها",
  reviews: "نظرات",
  users: "کاربران",
  notifications: "اعلان‌ها",
  contact: "پیام‌ها",
  reports: "گزارشات",
  logs: "لاگ‌ها",
  settings: "تنظیمات",
}

export function SiteHeader() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const breadcrumbs = segments.map((seg, i) => ({
    label: breadcrumbLabels[seg] || seg,
    href: "/" + segments.slice(0, i + 1).join("/"),
  }))

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <span className="mr-2 flex items-center">
          <Separator orientation="vertical" className="h-4" />
        </span>
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, i) => (
              <Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {i < breadcrumbs.length - 1 ? (
                    <span className="text-muted-foreground">{crumb.label}</span>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {i < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex-1" />
      <div className="px-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <ExternalLink className="ml-1.5 size-4" />
            بازگشت به صفحه اصلی
          </Link>
        </Button>
      </div>
    </header>
  )
}
