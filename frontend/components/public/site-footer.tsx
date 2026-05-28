import Link from "next/link"
import { Volleyball, MapPin, Phone, Mail, Globe, Send, MessageCircle } from "lucide-react"

const quickLinks = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/#about", label: "معرفی" },
  { href: "/#courts", label: "جستجوی سالن‌ها" },
  { href: "/contact", label: "ارتباط با ما" },
  { href: "/terms", label: "قوانین و مقررات" },
  { href: "/privacy", label: "حریم خصوصی" },
]

const socialLinks = [
  { href: "#", label: "اینستاگرام", icon: Globe },
  { href: "#", label: "تلگرام", icon: Send },
  { href: "#", label: "واتساپ", icon: MessageCircle },
]

export function SiteFooter() {
  return (
    <footer id="contact" className="border-t bg-muted/40">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Volleyball className="size-5" />
              </div>
              <span>توپ سِت</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              سامانه هوشمند رزرو آنلاین زمین‌های ورزشی. والیبال، بسکتبال، فوتسال و هندبال.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">لینک‌های سریع</h4>
            <ul className="space-y-2">
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
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">ارتباط با ما</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                <span>تهران، خیابان ولیعصر، مجتمع ورزشی توپ سِت</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="size-4 shrink-0" />
                <span dir="ltr">۰۲۱-۱۲۳۴۵۶۷۸</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                <span>info@toopset.com</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">ما را دنبال کنید</h4>
            <div className="flex gap-3">
              {socialLinks.map((link) => {
                const Icon = link.icon
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex size-10 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                    aria-label={link.label}
                  >
                    <Icon className="size-5" />
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          <p>تمامی حقوق مادی و معنوی این سایت متعلق به توپ سِت می‌باشد.</p>
          <p className="mt-1">© ۱۴۰۴ توپ سِت — ToopSet</p>
        </div>
      </div>
    </footer>
  )
}
