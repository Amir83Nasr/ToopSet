import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Volleyball, ArrowLeft } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 py-20 md:py-28">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />

      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 size-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 size-40 rounded-full bg-primary/5 blur-2xl animate-pulse" />
        <div className="absolute top-1/2 right-1/3 size-24 rounded-full bg-secondary/10 blur-xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
        {/* Icon */}
        <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-2xl shadow-primary/20 ring-1 ring-white/10">
          <Volleyball className="size-10" />
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
            توپ <span className="text-primary">سِت</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            سامانه هوشمند رزرو آنلاین زمین‌های ورزشی
            <br />
            والیبال، بسکتبال، فوتسال و هندبال
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          {[
            { value: "۱۵۰+", label: "زمین ورزشی" },
            { value: "۱۰,۰۰۰+", label: "کاربر فعال" },
            { value: "۹۸٪", label: "رضایت کاربران" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="h-12 px-8 text-base gap-2 shadow-lg shadow-primary/20">
            <Link href="/register">
              شروع کنید
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
            <Link href="/login">ورود به حساب</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
