"use client"

import { motion } from "framer-motion"
import { Search, CalendarCheck, CreditCard, Play } from "lucide-react"
import { toPersianDigits } from "@/lib/utils"

const steps = [
  {
    icon: Search,
    title: "جستجو",
    description:
      "ورزش مورد نظر خود را انتخاب کنید و مجموعه‌های موجود را ببینید",
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
    description: "در ساعت مقرر در مجموعه حاضر شوید و از ورزش لذت ببرید",
  },
]

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden border-t px-4 py-16 md:py-24">
      <div className="bg-grid absolute inset-0 opacity-15 dark:opacity-[0.03]" />
      <div className="pointer-events-none absolute top-0 left-1/2 size-[400px] -translate-x-1/2 rounded-full bg-primary/3 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="mb-14 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground"
          >
            <span className="size-1.5 rounded-full bg-primary/40" />
            فرآیند رزرو
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            توپ‌سِت چطور کار می‌کند
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            تنها با {toPersianDigits(4)} قدم ساده، مجموعه ورزشی خود را رزرو کنید
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group rounded-2xl border bg-card p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm"
              >
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border-2 border-border bg-background">
                  <span className="text-sm font-bold text-foreground">
                    {toPersianDigits(i + 1)}
                  </span>
                </div>
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon className="size-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
