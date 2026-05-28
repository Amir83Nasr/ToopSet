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
    <section id="about" className="relative overflow-hidden border-t px-4 py-16 md:py-20">
      <div className="bg-grid absolute inset-0 opacity-50" />
      <ScrollReveal className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            چرا{" "}
            <span className="bg-linear-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              توپ‌سِت
            </span>
            ؟
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            ساده‌ترین راه برای رزرو زمین ورزشی، با بهترین امکانات و قیمت
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 transition-colors hover:bg-accent"
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-6" />
                </div>
                <h3 className="mb-2 font-semibold">{feature.title}</h3>
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
