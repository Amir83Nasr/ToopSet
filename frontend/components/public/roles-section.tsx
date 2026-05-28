import Link from "next/link"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { User, Building2, Shield } from "lucide-react"

const roles = [
  {
    icon: User,
    title: "کاربر عادی",
    description: "رزرو آسان زمین‌های ورزشی با چند کلیک",
    cta: { label: "ثبت‌نام رایگان", href: "/register" },
  },
  {
    icon: Building2,
    title: "مدیر مجموعه",
    description: "مدیریت زمین‌ها، سانس‌ها و گزارش‌های درآمد",
    cta: { label: "ثبت‌نام", href: "/register" },
  },
  {
    icon: Shield,
    title: "ادمین",
    description: "مدیریت کاربران، محتوا و تنظیمات سیستم",
    cta: { label: "ورود", href: "/login" },
  },
]

export function RolesSection() {
  return (
    <section className="relative overflow-hidden border-t px-4 py-16 md:py-20">
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
              <div key={role.title} className="rounded-xl border bg-card p-6 text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full border text-muted-foreground">
                  <Icon className="size-5" />
                </div>
                <h3 className="mb-1.5 font-semibold">{role.title}</h3>
                <p className="mb-5 text-sm text-muted-foreground">{role.description}</p>
                <Link
                  href={role.cta.href}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {role.cta.label}
                </Link>
              </div>
            )
          })}
        </div>
      </ScrollReveal>
    </section>
  )
}
