import { Search, CalendarCheck, Trophy } from "lucide-react"

const steps = [
  {
    step: "۱",
    icon: Search,
    title: "جستجوی مجموعه",
    description:
      "با فیلتر موقعیت، امکانات و قیمت، مجموعه ورزشی مورد نظرت را پیدا کن.",
  },
  {
    step: "۲",
    icon: CalendarCheck,
    title: "رزرو آنلاین سانس",
    description:
      "سانس خالی را انتخاب کن و در چند ثانیه رزرو کن؛ سانس برای تو قفل می‌شود.",
  },
  {
    step: "۳",
    icon: Trophy,
    title: "بازی و ثبت نظر",
    description:
      "سر وقت برس و بازی کن؛ بعد از بازی تجربه‌ات را با نمره و نظر ثبت کن.",
  },
] as const

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="overflow-x-hidden border-y bg-muted/40"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="animate-fade-in mb-10 text-center md:mb-12">
          <h3 className="text-2xl font-bold tracking-tight md:text-3xl">
            رزرو در سه قدم
          </h3>
          <p className="mt-2 text-muted-foreground">
            از جستجو تا بازی، همه آنلاین و بدون دردسر
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map(({ step, icon: Icon, title, description }, i) => (
            <div
              key={title}
              className="animate-fade-in flex flex-col items-center rounded-xl border bg-background p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-7" />
                <span className="absolute -start-1 -top-1 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step}
                </span>
              </div>
              <h4 className="mb-1.5 text-lg font-semibold">{title}</h4>
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
