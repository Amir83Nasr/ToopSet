import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

const stats = [
  { value: "۱۵۰+", label: "زمین ورزشی" },
  { value: "۱۰,۰۰۰+", label: "کاربر فعال" },
  { value: "۹۸٪", label: "رضایت کاربران" },
]

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-24 md:pb-28 md:pt-32">
      <div className="bg-grid absolute inset-0" />
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
        <Image
          src="/favicon.svg"
          alt="توپ‌سِت"
          width={56}
          height={56}
          className="size-14"
        />

        <div className="space-y-4">
          <h1 className="animate-fade-in-up text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            توپ‌<span className="bg-linear-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              سِت
            </span>
          </h1>
          <p className="animate-fade-in-up animate-fade-in-up-delay-1 mx-auto max-w-xl text-lg text-muted-foreground md:text-xl">
            سامانه هوشمند رزرو آنلاین زمین‌های ورزشی
            <br />
            والیبال، بسکتبال، فوتسال و هندبال
          </p>
        </div>

        <div className="animate-fade-in-up animate-fade-in-up-delay-2 flex flex-wrap justify-center gap-8 md:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="animate-fade-in-up animate-fade-in-up-delay-3 flex flex-wrap justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="shimmer-border h-12 gap-2 px-8 text-base shadow-sm"
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
