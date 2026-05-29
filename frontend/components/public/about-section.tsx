"use client"

import { motion } from "framer-motion"
import { CalendarDays, CreditCard, Headphones, Trophy } from "lucide-react"

const features = [
  {
    icon: CalendarDays,
    title: "رزرو آسان",
    description: "در چند کلیک سانس مورد نظر خود را پیدا کرده و رزرو کنید.",
  },
  {
    icon: CreditCard,
    title: "قیمت مناسب",
    description: "بهترین قیمت‌ها برای سانس‌های ورزشی در سراسر شهر.",
  },
  {
    icon: Headphones,
    title: "پشتیبانی ۲۴/۷",
    description: "تیم پشتیبانی توپ‌سِت در تمام ساعات شبانه‌روز پاسخگو است.",
  },
  {
    icon: Trophy,
    title: "تنوع ورزشی",
    description: "والیبال، بسکتبال، فوتسال و هندبال در یک سامانه.",
  },
]

const card = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      type: "spring" as const,
      stiffness: 200,
      damping: 20,
    },
  }),
}

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative overflow-hidden border-t px-4 py-16 md:py-20"
    >
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
            مزایای توپ‌سِت
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            چرا <span className="text-primary">توپ‌سِت</span>؟
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            ساده‌ترین راه برای رزرو زمین ورزشی
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={card}
                whileHover={{
                  y: -6,
                  transition: { type: "spring" as const, stiffness: 300 },
                }}
                className="rounded-xl border bg-card p-6 text-center transition-colors hover:bg-accent/50"
              >
                <Icon className="mx-auto mb-3 size-6 text-primary" />
                <h3 className="mb-1.5 font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
