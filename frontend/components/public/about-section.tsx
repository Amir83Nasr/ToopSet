import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { CalendarDays, CreditCard, Headphones, Trophy } from "lucide-react"

const features = [
  {
    icon: CalendarDays,
    title: "رزرو آسان",
    description:
      "در چند کلیک سانس مورد نظر خود را پیدا کرده و رزرو کنید. بدون نیاز به تماس تلفنی یا مراجعه حضوری.",
  },
  {
    icon: CreditCard,
    title: "قیمت مناسب",
    description:
      "بهترین قیمت‌ها برای سانس‌های ورزشی. مقایسه قیمت‌ها و انتخاب بهترین گزینه با بودجه شما.",
  },
  {
    icon: Headphones,
    title: "پشتیبانی ۲۴/۷",
    description:
      "تیم پشتیبانی توپ‌سِت در تمام ساعات شبانه‌روز آماده پاسخگویی به سوالات و مشکلات شماست.",
  },
  {
    icon: Trophy,
    title: "تنوع ورزشی",
    description:
      "والیبال، بسکتبال، فوتسال و هندبال. انواع زمین‌های ورزشی با کیفیت بالا در سراسر شهر.",
  },
]

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative overflow-hidden px-4 py-16 md:py-20"
    >
      <div className="neon-orb neon-orb-green" />
      <div className="neon-orb neon-orb-cyan !top-auto !bottom-[-80px] !left-[-60px]" />
      <div className="bg-mesh pointer-events-none absolute inset-0" />
      <div className="bg-dots pointer-events-none absolute inset-0" />
      <ScrollReveal className="relative z-10 mx-auto max-w-5xl">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">چرا توپ‌سِت؟</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            ساده‌ترین راه برای رزرو زمین ورزشی، با بهترین امکانات و قیمت
          </p>
        </div>

        {/* Feature Grid */}
        <div className="stagger-fade-in grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group relative rounded-xl border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-7" />
                </div>
                <h3 className="mb-2 text-base font-semibold">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </ScrollReveal>
    </section>
  )
}
