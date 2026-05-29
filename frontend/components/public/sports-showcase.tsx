"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import {
  CircleDot,
  Crosshair,
  Goal,
  Hand,
  ArrowLeft,
} from "lucide-react"
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
    desc: "زمین‌های استاندارد بسکتبال با کفپوش مناسب",
  },
  {
    icon: Goal,
    name: "فوتسال",
    desc: "سالن‌های فوتسال با چمن مصنوعی باکیفیت",
  },
  {
    icon: Hand,
    name: "هندبال",
    desc: "زمین‌های استاندارد هندبال برای مسابقات و تمرین",
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 160,
      damping: 16,
    },
  },
}

export function SportsShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-t px-4 py-16 md:py-24"
    >
      <motion.div
        className="bg-grid absolute inset-0 opacity-[0.03]"
        style={{ y: bgY }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3 blur-[120px]" />

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
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {sports.map((sport, i) => {
            const Icon = sport.icon
            return (
              <motion.div
                key={sport.name}
                variants={cardVariants}
                transition={{
                  ...cardVariants.visible.transition,
                  delay: i * 0.1,
                }}
              >
                <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-sm">
                  {/* Corner glow */}
                  <div className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-primary/5 blur-[50px] opacity-0 transition-opacity duration-500 group-hover:opacity-60" />

                  {/* Icon */}
                  <motion.div
                    className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary"
                    whileHover={{
                      rotate: [0, -8, 8, -4, 0],
                      scale: 1.12,
                      transition: { duration: 0.4 },
                    }}
                  >
                    <Icon className="size-8" />
                  </motion.div>

                  <h3 className="mb-2 text-lg font-bold">{sport.name}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {sport.desc}
                  </p>

                  {/* Bottom accent line */}
                  <div className="mx-auto mt-4 h-0.5 w-0 rounded-full bg-primary/20 transition-all duration-300 group-hover:w-12" />
                </div>
              </motion.div>
            )
          })}
        </motion.div>

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
