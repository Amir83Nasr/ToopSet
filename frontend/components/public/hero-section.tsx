import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 py-20 md:py-28">
      {/* Neon background orbs */}
      <div className="neon-orb neon-orb-1" />
      <div className="neon-orb neon-orb-2" />
      <div className="neon-orb neon-orb-3" />

      {/* Mesh gradient + dot overlay — like tailwindcss.com */}
      <div className="absolute inset-0 bg-mesh-hero pointer-events-none" />
      <div className="absolute inset-0 bg-dots pointer-events-none" />

      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
        {/* Logo icon */}
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/70 shadow-2xl shadow-primary/20 ring-1 ring-white/10 animate-float">
          <Image src="/favicon.svg" alt="توپ‌سِت" width={72} height={72} className="size-16" />
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl animate-fade-in-up">
            توپ‌<span className="text-primary neon-sign">سِت</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in-up animate-fade-in-up-delay-1">
            سامانه هوشمند رزرو آنلاین زمین‌های ورزشی
            <br />
            والیبال، بسکتبال، فوتسال و هندبال
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-12 animate-fade-in-up animate-fade-in-up-delay-2">
          {[
            { value: "۱۵۰+", label: "زمین ورزشی" },
            { value: "۱۰,۰۰۰+", label: "کاربر فعال" },
            { value: "۹۸٪", label: "رضایت کاربران" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-primary neon-glow inline-block px-2 rounded-lg">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up animate-fade-in-up-delay-3">
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
