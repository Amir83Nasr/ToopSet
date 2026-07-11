"use client"

import { Fragment } from "react"
import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ExternalLink, Home } from "lucide-react"
import { ModeToggle } from "@/components/ui/mode-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePathname } from "next/navigation"

const breadcrumbLabels: Record<string, string> = {
  dashboard: "داشبورد",
  user: "کاربر",
  manager: "مدیر مجموعه",
  admin: "مدیریت سیستم",
  vendors: "مجموعه‌ها",
  create: "ایجاد",
  edit: "ویرایش",
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
  profile: "پروفایل",
}

function getLabel(seg: string): string {
  if (breadcrumbLabels[seg]) return breadcrumbLabels[seg]
  if (/^\d+$/.test(seg)) return "جزئیات"
  return seg
}

export function SiteHeader() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  // Skip the role segment (admin/manager/user at index 1) when there are deeper pages
  // e.g. /dashboard/admin/bookings → داشبورد > رزروها  (not داشبورد > مدیریت سیستم > رزروها)
  const crumbs =
    segments.length > 2 ? segments.filter((_, i) => i !== 1) : segments

  const breadcrumbs = crumbs.map((seg, i) => ({
    label: getLabel(seg),
    href: "/" + crumbs.slice(0, i + 1).join("/"),
  }))

  return (
    <header className="sticky top-16 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-2 px-3 sm:px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="-ms-1" />
          </TooltipTrigger>
          <TooltipContent>
            <p>تغییر نمای کناری</p>
          </TooltipContent>
        </Tooltip>
        <span className="me-2 flex items-center">
          <Separator orientation="vertical" className="h-4" />
        </span>
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap [&_a]:truncate [&_span]:truncate [&>li]:min-w-0">
            {breadcrumbs.map((crumb, i) => (
              <Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {i < breadcrumbs.length - 1 ? (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
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
      <div className="flex shrink-0 items-center gap-1.5 px-3 sm:gap-2 sm:px-4">
        <div className="max-sm:hidden">
          <ModeToggle />
        </div>
        {/* Labels collapse to icon-only below sm to avoid crowding the
            breadcrumb on narrow screens. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" asChild>
              <Link href="/vendors">
                <ExternalLink className="size-4 sm:me-1.5" />
                <span className="max-sm:sr-only">جستجوی سالن</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="sm:hidden">
            <p>جستجوی سالن</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <Home className="size-4 sm:me-1.5" />
                <span className="max-sm:sr-only">بازگشت به صفحه اصلی</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="sm:hidden">
            <p>بازگشت به صفحه اصلی</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
