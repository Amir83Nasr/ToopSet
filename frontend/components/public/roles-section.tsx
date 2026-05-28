import Link from "next/link"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { Button } from "@/components/ui/button"
import { User, Building2, Shield, Check } from "lucide-react"

const roles = [
  {
    icon: User,
    title: "کاربر عادی",
    color: "from-blue-500 to-cyan-500",
    bgLight: "bg-blue-50 dark:bg-blue-950",
    textColor: "text-blue-600 dark:text-blue-400",
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
    color: "from-emerald-500 to-teal-500",
    bgLight: "bg-emerald-50 dark:bg-emerald-950",
    textColor: "text-emerald-600 dark:text-emerald-400",
    features: [
      "ثبت و مدیریت زمین‌های ورزشی",
      "تعریف و مدیریت سانس‌ها",
      "مشاهده گزارش درآمد",
      "مدیریت رزروها",
      "نظارت بر عملکرد مجموعه",
      "درصد اشغال سالن",
    ],
    cta: { label: "ثبت‌نام به عنوان مدیر", href: "/register" },
    featured: true,
  },
  {
    icon: Shield,
    title: "ادمین",
    color: "from-purple-500 to-pink-500",
    bgLight: "bg-purple-50 dark:bg-purple-950",
    textColor: "text-purple-600 dark:text-purple-400",
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
    <section className="relative overflow-hidden bg-muted/30 px-4 py-16 md:py-20">
      <div className="neon-orb neon-orb-purple" />
      <div className="neon-orb neon-orb-cyan !right-auto left-1/4 top-1/3" />
      <div className="absolute inset-0 bg-mesh pointer-events-none" />
      <div className="absolute inset-0 bg-dots pointer-events-none" />
      <ScrollReveal className="mx-auto max-w-5xl relative z-10">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">نقش‌های کاربری</h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            توپ‌سِت برای نیازهای مختلف کاربران طراحی شده است
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid gap-6 md:grid-cols-3 stagger-fade-in">
          {roles.map((role) => {
            const Icon = role.icon
            return (
              <div
                key={role.title}
                className={`relative rounded-xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 ${
                  role.featured ? "ring-2 ring-primary shadow-lg shadow-primary/20 scale-[1.02] md:scale-105 neon-border" : ""
                }`}
              >
                {role.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground shadow">
                    محبوب‌ترین
                  </div>
                )}

                {/* Icon */}
                <div className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl ${role.bgLight}`}>
                  <Icon className={`size-7 ${role.textColor}`} />
                </div>

                <h3 className="mb-4 text-center text-lg font-semibold">{role.title}</h3>

                {/* Features */}
                <ul className="mb-6 space-y-2.5">
                  {role.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className={`mt-0.5 size-4 shrink-0 ${role.textColor}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button asChild variant={role.featured ? "default" : "outline"} className="w-full">
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
