"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import {
  Sparkles,
  Search,
  CalendarCheck,
  ShieldCheck,
} from "lucide-react"
import { toPersianDigits } from "@/lib/utils"

const highlight = {
  icon: Sparkles,
  title: "سامانه هوشمند رزرو ورزشی",
  description:
    "توپ‌سِت تمام مراحل پیدا کردن و رزرو زمین ورزشی رو برای تو ساده کرده. از جستجو تا پرداخت، همه چیز در چند کلیک.",
  stats: [
    { value: 15, suffix: "+", label: "سالن ورزشی" },
    { value: 4, suffix: "", label: "رشته ورزشی" },
    { value: 1000, suffix: "+", label: "رزرو موفق" },
  ],
}

const benefits = [
  {
    icon: Search,
    title: "جستجوی هوشمند",
    description:
      "با فیلترهای دقیق و نقشه تعاملی، سریع‌ترین راه برای پیدا کردن نزدیک‌ترین سالن به خودت",
  },
  {
    icon: CalendarCheck,
    title: "رزرو آنلاین",
    description:
      "بدون نیاز به تماس تلفنی و هماهنگی حضوری، سانس مورد نظرت رو در چند ثانیه رزرو کن",
  },
  {
    icon: ShieldCheck,
    title: "ضمانت کیفیت",
    description:
      "همه سالن‌ها دارای استانداردهای لازم و نظرات کاربران واقعی هستند",
  },
]

const springItem = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 160,
      damping: 18,
    },
  },
}

export function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })
  const gridY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"])

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative overflow-hidden border-t px-4 py-16 md:py-24"
    >
      <motion.div
        className="bg-grid absolute inset-0 opacity-50"
        style={{ y: gridY }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
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
            مزایا
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            چرا <span className="text-primary">توپ‌سِت</span>؟
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            ساده‌ترین راه برای رزرو زمین ورزشی
          </p>
        </motion.div>

        {/* Editorial split layout */}
        <div className="grid gap-6 md:grid-cols-5">
          {/* Left: Value proposition card — 2 cols */}
          <motion.div
            variants={springItem}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="md:col-span-2"
          >
            <div className="group relative flex h-full flex-col rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_0_25px_-6px_hsl(var(--primary)/0.08)] md:p-8">
              {/* Glow */}
              <div className="pointer-events-none absolute -left-20 -top-20 size-56 rounded-full bg-primary/[0.03] blur-[80px] transition-all duration-500 group-hover:bg-primary/[0.08]" />

              <motion.div
                className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/15"
                whileHover={{ scale: 1.08, rotate: [0, -3, 3, 0] }}
                transition={{ duration: 0.3 }}
              >
                <Sparkles className="size-7" />
              </motion.div>

              <h3 className="mb-3 text-xl font-bold leading-tight transition-colors duration-300 group-hover:text-primary md:text-2xl">
                {highlight.title}
              </h3>
              <p className="mb-6 leading-relaxed text-muted-foreground">
                {highlight.description}
              </p>

              {/* Stats row */}
              <div className="mt-auto flex gap-4 border-t pt-4">
                {highlight.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col transition-all duration-300 group-hover:translate-y-[-1px]"
                  >
                    <span className="text-sm font-bold tabular-nums text-foreground transition-colors duration-300 group-hover:text-primary">
                      {toPersianDigits(stat.value)}
                      {stat.suffix}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Benefit items — 3 cols */}
          <div className="flex flex-col gap-4 md:col-span-3">
            {benefits.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  variants={springItem}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    ...springItem.visible.transition,
                    delay: i * 0.1,
                  }}
                >
                  <div className="group relative rounded-2xl border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.06)] md:p-6">
                    {/* Glow */}
                    <div className="pointer-events-none absolute -right-16 -top-16 size-32 rounded-full bg-primary/[0.02] blur-[60px] transition-all duration-500 group-hover:bg-primary/[0.07]" />

                    <div className="flex items-start gap-4">
                      <motion.div
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors duration-300 group-hover:bg-primary/10 group-hover:text-primary"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Icon className="size-5" />
                      </motion.div>
                      <div className="min-w-0">
                        <h4 className="mb-1 text-sm font-semibold transition-colors duration-300 group-hover:text-primary md:text-base">
                          {item.title}
                        </h4>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
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
