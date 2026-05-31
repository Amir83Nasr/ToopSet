"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
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
  courts: "زمین‌ها",
  create: "ایجاد",
  schedule: "مدیریت زمان",
  bookings: "رزروها",
  payments: "پرداخت‌ها",
  reviews: "نظرات",
  users: "کاربران",
  favorites: "علاقه‌مندی‌ها",
  wallet: "کیف پول",
  penalties: "جریمه‌ها",
  notifications: "اعلان‌ها",
  contact: "پیام‌ها",
  reports: "گزارشات",
  logs: "لاگ‌ها",
  settings: "تنظیمات",
}

export function SiteHeader() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const [scrolled, setScrolled] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const breadcrumbs = segments.map((seg, i) => ({
    label: breadcrumbLabels[seg] || seg,
    href: "/" + segments.slice(0, i + 1).join("/"),
  }))

  useEffect(() => {
    // Use an IntersectionObserver on a zero-height sentinel at the top of the page.
    // When the sentinel is not intersecting, the user has scrolled past the header.
    const sentinel = document.createElement("div")
    sentinel.style.position = "absolute"
    sentinel.style.top = "0"
    sentinel.style.left = "0"
    sentinel.style.width = "1px"
    sentinel.style.height = "1px"
    sentinel.style.pointerEvents = "none"
    document.body.prepend(sentinel)
    sentinelRef.current = sentinel

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setScrolled(!entry.isIntersecting)
      },
      { threshold: 0 }
    )
    observerRef.current.observe(sentinel)

    return () => {
      observerRef.current?.disconnect()
      sentinel.remove()
    }
  }, [])

  return (
    <header
      className={
        "flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height,ease] duration-200 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 " +
        (scrolled
          ? "shadow-md bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80"
          : "bg-background")
      }
    >
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <span className="flex items-center mr-2">
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
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          بازگشت به سایت
        </Link>
      </div>
    </header>
  )
}
