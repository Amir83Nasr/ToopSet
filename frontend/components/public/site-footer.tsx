"use client"

import Link from "next/link"
import { Mail, Phone, MapPin, ArrowUp } from "lucide-react"
import Image from "next/image"

const quickLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/#about", label: "معرفی" },
  { href: "/#courts", label: "جستجوی سالن‌ها" },
  { href: "/contact", label: "ارتباط با ما" },
]

const legalLinks = [
  { href: "/terms", label: "قوانین و مقررات" },
  { href: "/privacy", label: "حریم خصوصی" },
]

const sportsLinks = [
  { href: "/courts?sport=volleyball", label: "والیبال" },
  { href: "/courts?sport=basketball", label: "بسکتبال" },
  { href: "/courts?sport=futsal", label: "فوتسال" },
  { href: "/courts?sport=handball", label: "هندبال" },
]

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t">
      {/* Background layers */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-32 bottom-0 size-96 rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 top-1/2 size-80 rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute inset-0 bg-card/60 backdrop-blur-[10px] dark:bg-card/40" />

      {/* Top accent gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative mx-auto max-w-5xl px-4">
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
              سامانه هوشمند رزرو آنلاین زمین‌های ورزشی. به راحتی سالن مورد نظر
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

          {/* Sports */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">رشته‌های ورزشی</h4>
            <ul className="space-y-2.5">
              {sportsLinks.map((link) => (
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
                <span dir="ltr">۰۲۵-۱۲۳۴۵۶۷۸</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0 text-primary/60" />
                <span>info@toopset.ir</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0 text-primary/60" />
                <span>قم، بلوار امین، مجتمع ورزشی تختی</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Separator with gradient */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            تمامی حقوق مادی و معنوی این وبسایت متعلق به توپ‌سِت می‌باشد.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-all hover:gap-2 hover:text-foreground"
            aria-label="بازگشت به بالا"
          >
            <ArrowUp className="size-3.5" />
            بازگشت به بالا
          </button>
        </div>

        {/* Bottom gradient line */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>
    </footer>
  )
}
