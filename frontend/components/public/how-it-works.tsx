"use client"

import { motion } from "framer-motion"
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

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const card = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 200, damping: 20 },
  },
}

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden border-t px-4 py-16 md:py-20">
      <div className="bg-grid absolute inset-0 opacity-50" />
      <div className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-4 inline-block rounded-full border bg-muted/50 px-3.5 py-1 text-xs text-muted-foreground"
          >
            راهنمای گام به گام
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            چطور کار می‌کند
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            تنها با ۴ قدم ساده، زمین ورزشی خود را رزرو کنید
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-6 md:grid-cols-4"
        >
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.title}
                variants={card}
                className="group relative rounded-xl border bg-card p-6 text-center transition-colors hover:bg-accent/50"
              >
                {/* Step number badge */}
                <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border text-sm font-medium text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
                  {i + 1}
                </div>

                {/* Icon */}
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg text-primary">
                  <Icon className="size-5" />
                </div>

                <h3 className="mb-1.5 font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
