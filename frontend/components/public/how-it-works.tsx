import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { Search, CalendarCheck, CreditCard, Play } from "lucide-react"

const steps = [
  {
    icon: Search,
    title: "جستجو",
    description: "ورزش مورد نظر خود را انتخاب کنید و زمین‌های موجود را ببینید",
  },
  {
    icon: CalendarCheck,
    title: "انتخاب",
    description: "سانس مورد نظر خود را در تاریخ و ساعت دلخواه انتخاب کنید",
  },
  {
    icon: CreditCard,
    title: "رزرو",
    description: "به صورت آنلاین پرداخت کنید و رزرو خود را قطعی کنید",
  },
  {
    icon: Play,
    title: "بازی",
    description: "در ساعت مقرر در زمین حاضر شوید و از ورزش لذت ببرید",
  },
]

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden border-t px-4 py-16 md:py-20">
      <div className="bg-grid absolute inset-0 opacity-50" />
      <ScrollReveal className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            چطور کار می‌کند
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            تنها با ۴ قدم ساده، زمین ورزشی خود را رزرو کنید
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-4">
          <div className="absolute top-5 right-[calc(12.5%+1rem)] left-[calc(12.5%+1rem)] hidden h-px bg-linear-to-r from-transparent via-border to-transparent md:block" />

          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={step.title}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-4 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {index + 1}
                </div>
                <h3 className="mb-1 font-semibold">{step.title}</h3>
                <p className="max-w-[200px] text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>
      </ScrollReveal>
    </section>
  )
}
