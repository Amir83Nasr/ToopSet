import { ScrollReveal } from "@/components/ui/scroll-reveal"

const steps = [
  { title: "جستجو", description: "ورزش مورد نظر خود را انتخاب کنید" },
  { title: "انتخاب", description: "سانس مورد نظر خود را در تاریخ دلخواه انتخاب کنید" },
  { title: "رزرو", description: "به صورت آنلاین پرداخت کنید و رزرو را قطعی کنید" },
  { title: "بازی", description: "در ساعت مقرر در زمین حاضر شوید و از ورزش لذت ببرید" },
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

        <div className="grid gap-8 md:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="flex flex-col items-center text-center">
              <div className="mb-3 flex size-8 items-center justify-center rounded-full border text-sm font-medium text-muted-foreground">
                {index + 1}
              </div>
              <h3 className="mb-1 font-semibold">{step.title}</h3>
              <p className="max-w-[180px] text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  )
}
