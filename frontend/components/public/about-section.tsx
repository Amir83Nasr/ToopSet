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

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden border-t px-4 py-16 md:py-20">
      <div className="bg-grid absolute inset-0 opacity-50" />
      <div className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            چرا <span className="text-primary">توپ‌سِت</span>؟
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            ساده‌ترین راه برای رزرو زمین ورزشی
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div key={feature.title} variants={item} className="text-center">
                <Icon className="mx-auto mb-3 size-6 text-primary" />
                <h3 className="mb-1.5 font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
