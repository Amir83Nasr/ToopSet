"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn, toPersianDigits } from "@/lib/utils"
import {
  BaleIcon,
  EitaaIcon,
  TelegramIcon,
} from "@/components/ui/messenger-icons"

// ── HIDE ON OPERATIONAL PAGES ────────────────────────────────────────────────

// صفحات عملیاتی/رزرو که در موبایل فوتر لازم ندارند
const HIDE_FOOTER_ON_MOBILE = [/^\/book($|\/)/, /^\/vendors\/[^/]+/]

// ── LINK GROUPS ──────────────────────────────────────────────────────────────

const aboutLinks = [
  { href: "/about", label: "درباره ما" },
  { href: "/blog", label: "بلاگ" },
  { href: "/terms", label: "قوانین و مقررات" },
  { href: "/privacy", label: "حریم خصوصی" },
]

const bookingLinks = [
  { href: "/vendors", label: "جستجوی مجموعه‌ها" },
  { href: "/faq", label: "سوالات پرتکرار" },
  { href: "/contact", label: "ارتباط با ما" },
]

const socials = [
  { href: "https://t.me/Amir83Nasr", label: "تلگرام", Icon: TelegramIcon },
  { href: "https://eitaa.com/Amir83Nasr", label: "ایتا", Icon: EitaaIcon },
  { href: "https://ble.ir/Amir83Nasr", label: "بله", Icon: BaleIcon },
]

const groups = [
  { title: "توپ‌سِت", links: aboutLinks },
  { title: "رزرو و پشتیبانی", links: bookingLinks },
]

const linkCls =
  "text-sm text-muted-foreground transition-colors hover:text-foreground"

function LinkGroup({
  title,
  links,
}: {
  title: string
  links: typeof aboutLinks
}) {
  return (
    <nav aria-label={title}>
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link href={link.href} className={linkCls}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function SocialLinks() {
  // باسلامی: لیست متنی با آیکون، نه دکمه دایره‌ای
  return (
    <ul className="space-y-2.5">
      {socials.map(({ href, label, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkCls}
          >
            <span className="inline-flex items-center gap-2">
              <Icon className="size-4 shrink-0" />
              {label}
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function BrandBlock() {
  return (
    <>
      <Link href="/" className="flex items-center gap-2.5 text-lg font-bold">
        <span>توپ‌سِت</span>
      </Link>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        سامانه هوشمند رزرو آنلاین مجموعه‌های ورزشی. به راحتی مجموعه مورد نظر خود
        را پیدا کنید و سانس دلخواه را رزرو نمایید.
      </p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1 text-[10px] font-normal text-muted-foreground">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-muted-foreground" />
          <span className="relative inline-flex size-1.5 rounded-full bg-muted-foreground" />
        </span>
        رزرو آنلاین ۲۴ ساعته
      </div>
    </>
  )
}

export function SiteFooter() {
  const pathname = usePathname()
  const hideOnMobile = HIDE_FOOTER_ON_MOBILE.some((re) => re.test(pathname))

  return (
    <footer
      className={cn(
        "pb-safe relative overflow-hidden border-t bg-background max-md:pb-4",
        hideOnMobile && "max-md:hidden"
      )}
    >
      <div className="px-safe relative mx-auto max-w-7xl px-4">
        {/* ── MOBILE ── */}
        <div className="space-y-6 py-8 lg:hidden">
          <div>
            <BrandBlock />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {groups.map(({ title, links }) => (
              <div key={title}>
                <div className="mb-3 text-sm font-semibold">{title}</div>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={`${link.href}-${link.label}`}>
                      <Link href={link.href} className={linkCls}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <div className="mb-3 text-sm font-semibold">شبکه‌های اجتماعی</div>
              <SocialLinks />
            </div>
          </div>
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden gap-12 py-14 lg:flex">
          <div className="flex-[1.5]">
            <BrandBlock />
          </div>

          <div className="flex-1">
            <LinkGroup title="صفحات" links={aboutLinks} />
          </div>
          <div className="flex-1">
            <LinkGroup title="رزرو و پشتیبانی" links={bookingLinks} />
          </div>

          <div className="flex-1">
            <nav aria-label="شبکه‌های اجتماعی">
              <div className="mb-3 text-sm font-semibold">شبکه‌های اجتماعی</div>
              <SocialLinks />
            </nav>
          </div>
        </div>
      </div>

      {/* ── COPYRIGHT BAR ── */}
      <div className="pb-safe hidden bg-muted/60 lg:block">
        <p className="mx-auto max-w-7xl px-4 py-3 text-center text-[11px] leading-5 text-muted-foreground">
          همه حقوق برای «توپ‌سِت» است. © {toPersianDigits("1405")}
        </p>
      </div>
    </footer>
  )
}
