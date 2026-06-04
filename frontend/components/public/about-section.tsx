"use client"

import { motion } from "framer-motion"
import { Sparkles, Search, CalendarCheck, ShieldCheck } from "lucide-react"
import { toPersianDigits } from "@/lib/utils"

const benefits = [
  {
    icon: Search,
    title: "جستجوی هوشمند",
    description: "سالن‌های ورزشی را بر اساس ورزش، موقعیت و قیمت فیلتر کنید",
  },
  {
    icon: CalendarCheck,
    title: "رزرو آنلاین",
    description: "در چند ثانیه سانس مورد نظر خود را به صورت آنلاین رزرو کنید",
  },
  {
    icon: ShieldCheck,
    title: "ضمانت کیفیت",
    description: "تمامی سالن‌ها توسط تیم توپ‌سِت بررسی و تأیید شده‌اند",
  },
]

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative overflow-hidden border-t px-4 py-16 md:py-20"
    >
      <div className="bg-grid absolute inset-0 opacity-15 dark:opacity-[0.03]" />
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
            className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground"
          >
            <span className="size-1.5 rounded-full bg-primary/40" />
            مزایای توپ‌سِت
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            چرا <span className="text-primary">توپ‌سِت</span>؟
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            ساده‌ترین راه برای رزرو مجموعه ورزشی
          </p>
        </motion.div>

        {/* Content: editorial split layout */}
        <div className="grid items-start gap-8 lg:grid-cols-5 lg:gap-12">
          {/* Left — value proposition */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="rounded-2xl border bg-card p-8">
              <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-muted">
                <Sparkles className="size-7 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-bold tracking-tight">
                سامانه هوشمند رزرو ورزشی
              </h3>
              <p className="mb-6 leading-relaxed text-muted-foreground">
                توپ‌سِت یک سامانه آنلاین برای جستجو، مقایسه و رزرو سانس
                مجموعه‌های ورزشی است. ما به شما کمک می‌کنیم تا در سریع‌ترین زمان
                ممکن، مناسب‌ترین سالن را پیدا کنید.
              </p>
              <div className="flex flex-wrap gap-4 border-t pt-5 text-sm text-muted-foreground">
                <span>{toPersianDigits("۱۵")}+ سالن</span>
                <span>{toPersianDigits("۴")} رشته</span>
                <span>{toPersianDigits("۱۰۰۰")}+ رزرو</span>
              </div>
            </div>
          </motion.div>

          {/* Right — benefits */}
          <div className="flex flex-col gap-4 lg:col-span-3">
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="group rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <Icon className="size-6" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold">{benefit.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
