import Link from "next/link"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { Button } from "@/components/ui/button"
import { User, Building2, Shield, Check } from "lucide-react"

const roles = [
  {
    icon: User,
    title: "کاربر عادی",
    features: [
      "مشاهده و جستجوی زمین‌های ورزشی",
      "مشاهده سانس‌های موجود",
      "رزرو آنلاین سانس",
      "پرداخت اینترنتی امن",
      "پنل کاربری با کیف پول",
      "مشاهده تاریخچه رزروها",
    ],
    cta: { label: "ثبت‌نام رایگان", href: "/register" },
  },
  {
    icon: Building2,
    title: "مدیر مجموعه",
    featured: true,
    features: [
      "ثبت و مدیریت زمین‌های ورزشی",
      "تعریف و مدیریت سانس‌ها",
      "مشاهده گزارش درآمد",
      "مدیریت رزروها",
      "نظارت بر عملکرد مجموعه",
      "درصد اشغال سالن",
    ],
    cta: { label: "ثبت‌نام به عنوان مدیر", href: "/register" },
  },
  {
    icon: Shield,
    title: "ادمین",
    features: [
      "مدیریت تمام کاربران",
      "مدیریت تمام زمین‌ها",
      "بررسی و مدیریت نظرات",
      "مشاهده آمار کلی سیستم",
      "مدیریت تنظیمات سیستم",
      "دسترسی کامل به همه بخش‌ها",
    ],
    cta: { label: "ورود ادمین", href: "/login" },
  },
]

export function RolesSection() {
  return (
    <section className="relative overflow-hidden border-t bg-muted/30 px-4 py-16 md:py-20">
      <div className="bg-grid absolute inset-0 opacity-50" />
      <ScrollReveal className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            نقش‌های کاربری
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            توپ‌سِت برای نیازهای مختلف کاربران طراحی شده است
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon
            return (
              <div
                key={role.title}
                className={`relative rounded-xl border bg-card p-6 transition-all hover:shadow-md ${
                  role.featured
                    ? "scale-[1.02] shadow-sm ring-1 ring-primary md:scale-105"
                    : ""
                }`}
              >
                {role.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground shadow-sm">
                    محبوب‌ترین
                  </div>
                )}

                <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-6" />
                </div>

                <h3 className="mb-4 text-center font-semibold">
                  {role.title}
                </h3>

                <ul className="mb-6 space-y-2.5">
                  {role.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={role.featured ? "default" : "outline"}
                  className="w-full"
                >
                  <Link href={role.cta.href}>{role.cta.label}</Link>
                </Button>
              </div>
            )
          })}
        </div>
      </ScrollReveal>
    </section>
  )
}
