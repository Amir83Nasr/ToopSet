"use client"

import { motion } from "framer-motion"
import { CircleDot, Crosshair, Goal, Hand, ArrowLeft } from "lucide-react"
import Link from "next/link"

const sports = [
  {
    icon: CircleDot,
    name: "والیبال",
    desc: "سالن‌های مجهز والیبال با استانداردهای مسابقات",
  },
  {
    icon: Crosshair,
    name: "بسکتبال",
    desc: "مجموعه‌های استاندارد بسکتبال با کفپوش مناسب",
  },
  {
    icon: Goal,
    name: "فوتسال",
    desc: "سالن‌های فوتسال با چمن مصنوعی باکیفیت",
  },
  {
    icon: Hand,
    name: "هندبال",
    desc: "مجموعه‌های استاندارد هندبال برای مسابقات و تمرین",
  },
]

export function SportsShowcase() {
  return (
    <section className="relative overflow-hidden border-t px-4 py-16 md:py-24">
      <div className="bg-grid absolute inset-0 opacity-15 dark:opacity-[0.03]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3 blur-[120px]" />

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
            رشته‌های ورزشی
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            چه ورزشی دوست <span className="text-primary">داری</span>؟
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            چهار رشته ورزشی محبوب در سراسر شهر
          </p>
        </motion.div>

        {/* Sports grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {sports.map((sport, i) => {
            const Icon = sport.icon
            return (
              <motion.div
                key={sport.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group rounded-2xl border bg-card p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm"
              >
                {/* Icon */}
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon className="size-7" />
                </div>

                <h3 className="mb-2 text-lg font-bold">{sport.name}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {sport.desc}
                </p>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-10 text-center"
        >
          <Link
            href="/#courts"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-all hover:gap-2 hover:text-foreground"
          >
            مشاهده همه سالن‌ها
            <ArrowLeft className="size-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
