"use client"

import Link from "next/link"
import { Mail, Phone, MessageCircle, ArrowUp } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

const quickLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/courts", label: "جستجوی سالن‌ها" },
  { href: "/contact", label: "ارتباط با ما" },
]

const pageLinks = [
  { href: "/about", label: "درباره توپ‌سِت" },
  { href: "/terms", label: "قوانین و مقررات" },
  { href: "/privacy", label: "حریم خصوصی" },
]

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t bg-background">
      <div className="relative mx-auto max-w-7xl px-4">
        {/* Main footer content */}
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-lg font-bold"
            >
              <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg">
                <Image
                  src="/favicon.svg"
                  alt="توپ‌سِت"
                  width={36}
                  height={36}
                  className="size-9"
                />
              </div>
              <span>توپ‌سِت</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              سامانه هوشمند رزرو آنلاین مجموعه‌های ورزشی. به راحتی سالن مورد نظر
              خود را پیدا کنید و سانس دلخواه را رزرو نمایید.
            </p>
            {/* Social / trust badge */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-[10px] text-muted-foreground/60">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              آنلاین — ۲۴ ساعته
            </div>
          </div>

          {/* Pages */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">صفحات</h4>
            <ul className="space-y-2.5">
              {pageLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">لینک‌های سریع</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">ارتباط با ما</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Phone className="size-4 shrink-0 text-primary/60" />
                <span dir="ltr">۰۹۳۰۶۸۵۳۳۶۳</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0 text-primary/60" />
                <span>amirhossein.nasrollahi.main@gmail.com</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <MessageCircle className="size-4 shrink-0 text-primary/60" />
                <a
                  href="https://ble.ir/Amir83Nasr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  @Amir83Nasr
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            تمامی حقوق مادی و معنوی این وبسایت متعلق به توپ‌سِت می‌باشد.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="بازگشت به بالا"
            className="text-xs text-muted-foreground hover:gap-2 hover:text-foreground"
          >
            <ArrowUp className="size-3.5" />
            بازگشت به بالا
          </Button>
        </div>
      </div>
    </footer>
  )
}
