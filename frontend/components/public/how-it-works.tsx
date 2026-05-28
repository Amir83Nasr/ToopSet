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
    <section className="px-4 py-16 md:py-20">
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">چطور کار می‌کند</h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            تنها با ۴ قدم ساده، زمین ورزشی خود را رزرو کنید
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid gap-8 md:grid-cols-4">
          {/* Connecting line (desktop) */}
          <div className="absolute top-8 left-[calc(12.5%+1rem)] right-[calc(12.5%+1rem)] hidden h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30 md:block" />

          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                {/* Step Number */}
                <div className="relative z-10 mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20">
                  <Icon className="size-7" />
                </div>

                {/* Step Label */}
                <div className="mb-1 inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                  گام {index + 1}
                </div>

                <h3 className="mb-1 text-base font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground max-w-[200px]">{step.description}</p>
              </div>
            )
          })}
        </div>

        {/* Mobile step numbers (visible below) — the connecting line already has numbers */}
      </div>
    </section>
  )
}
