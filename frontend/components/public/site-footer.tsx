import Link from "next/link"

const quickLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/#about", label: "معرفی" },
  { href: "/#courts", label: "جستجوی سالن‌ها" },
  { href: "/contact", label: "ارتباط با ما" },
  { href: "/terms", label: "قوانین و مقررات" },
  { href: "/privacy", label: "حریم خصوصی" },
]

export function SiteFooter() {
  return (
    <footer className="border-t px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
        <Link href="/" className="text-lg font-bold">
          توپ‌سِت
        </Link>
        <p className="max-w-xs text-sm text-muted-foreground">
          سامانه هوشمند رزرو آنلاین زمین‌های ورزشی
        </p>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
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
        <p className="text-xs text-muted-foreground">
          تمامی حقوق مادی و معنوی این سایت متعلق به توپ‌سِت می‌باشد.
        </p>
      </div>
    </footer>
  )
}
