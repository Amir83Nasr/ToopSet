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
      <div className="bg-mesh-hero pointer-events-none absolute inset-0" />
      <div className="bg-dots pointer-events-none absolute inset-0" />

      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
        {/* Logo icon */}
        <Image
          src="/favicon.svg"
          alt="توپ‌سِت"
          width={72}
          height={72}
          className="size-16"
        />

        {/* Title */}
        <div className="space-y-4">
          <h1 className="animate-fade-in-up text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
            توپ‌<span className="neon-sign text-primary">سِت</span>
          </h1>
          <p className="animate-fade-in-up animate-fade-in-up-delay-1 mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            سامانه هوشمند رزرو آنلاین زمین‌های ورزشی
            <br />
            والیبال، بسکتبال، فوتسال و هندبال
          </p>
        </div>

        {/* Stats */}
        <div className="animate-fade-in-up animate-fade-in-up-delay-2 flex flex-wrap justify-center gap-8 md:gap-12">
          {[
            { value: "۱۵۰+", label: "زمین ورزشی" },
            { value: "۱۰,۰۰۰+", label: "کاربر فعال" },
            { value: "۹۸٪", label: "رضایت کاربران" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="neon-glow inline-block rounded-lg px-2 text-2xl font-bold text-primary">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="animate-fade-in-up animate-fade-in-up-delay-3 flex flex-wrap justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="h-12 gap-2 px-8 text-base shadow-lg shadow-primary/20"
          >
            <Link href="/register">
              شروع کنید
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 px-8 text-base"
          >
            <Link href="/login">ورود به حساب</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
