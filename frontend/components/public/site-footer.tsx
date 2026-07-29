import Link from "next/link"
import { EnamadTrustSeal } from "@/components/public/enamad-trust-seal"
import { FooterContact } from "@/components/public/footer-contact"
import { FooterScrollButton } from "@/components/public/footer-scroll-button"

const quickLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/vendors", label: "جستجوی سالن‌ها" },
  { href: "/contact", label: "ارتباط با ما" },
]

const pageLinks = [
  { href: "/terms", label: "قوانین و مقررات" },
  { href: "/privacy", label: "حریم خصوصی" },
]

export function SiteFooter() {
  return (
    <footer className="pb-safe relative overflow-hidden border-t bg-background max-md:pb-4">
      <div className="px-safe relative mx-auto max-w-7xl px-4">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-lg font-bold"
            >
              <span>توپ‌سِت</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              سامانه هوشمند رزرو آنلاین مجموعه‌های ورزشی. به راحتی سالن مورد نظر
              خود را پیدا کنید و سانس دلخواه را رزرو نمایید.
            </p>
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
            <FooterContact />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pb-safe mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            تمامی حقوق مادی و معنوی این وبسایت متعلق به توپ‌سِت می‌باشد.
          </p>
          <div className="flex items-center gap-3">
            <EnamadTrustSeal />
            <FooterScrollButton />
          </div>
        </div>
      </div>
    </footer>
  )
}
