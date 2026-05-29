"use client"

import { motion, useScroll, useTransform, useSpring } from "framer-motion"
import { useRef } from "react"
import { Search, CalendarCheck, CreditCard, Play } from "lucide-react"
import { toPersianDigits } from "@/lib/utils"

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

const stepVariants = {
  hidden: (isLeft: boolean) => ({
    opacity: 0,
    x: isLeft ? -60 : 60,
    scale: 0.95,
  }),
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 160,
      damping: 18,
    },
  },
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end end"],
  })

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])
  const dotPosition = useTransform(scrollYProgress, [0, 0.95], ["0%", "100%"])
  const springDot = useSpring(dotPosition, { stiffness: 80, damping: 25 })

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-t px-4 py-16 md:py-24"
    >
      <div className="bg-grid absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-0 size-[400px] -translate-x-1/2 rounded-full bg-primary/3 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center md:mb-20"
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
            تنها با {toPersianDigits(4)} قدم ساده، زمین ورزشی خود را رزرو کنید
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Center connector line */}
          <div className="absolute right-[50%] top-0 hidden h-full w-px translate-x-[calc(50%+0.5px)] md:block">
            <div className="absolute inset-0 bg-border/10" />
            <motion.div
              className="absolute inset-x-0 top-0 bg-gradient-to-b from-primary/50 via-primary/30 to-primary/10"
              style={{ height: lineHeight }}
            />
            {/* Glowing progress dot */}
            <motion.div
              className="absolute right-1/2 z-20 size-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary shadow-[0_0_14px_4px_hsl(var(--primary)/0.35)]"
              style={{ top: springDot }}
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Step nodes on the line */}
            {steps.map((_, i) => (
              <motion.div
                key={i}
                className="absolute right-1/2 size-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/20"
                style={{ top: `${(i / (steps.length - 1)) * 100}%` }}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, type: "spring", stiffness: 300, damping: 15 }}
              />
            ))}
          </div>

          <div className="relative flex flex-col gap-12 md:gap-16">
            {steps.map((step, i) => {
              const Icon = step.icon
              const isLeft = i % 2 === 0

              return (
                <motion.div
                  key={step.title}
                  custom={isLeft}
                  variants={stepVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    ...stepVariants.visible.transition,
                    delay: i * 0.12,
                  }}
                  className={`group relative flex flex-col items-center gap-5 md:flex-row md:gap-8 ${
                    isLeft ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Content card */}
                  <div className="flex-1">
                    <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_0_30px_-8px_hsl(var(--primary)/0.1)] md:p-8">
                      {/* Hover glow */}
                      <div className="pointer-events-none absolute -left-20 -top-20 size-40 rounded-full bg-primary/[0.02] blur-[50px] transition-all duration-500 group-hover:bg-primary/[0.06]" />

                      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <Icon className="size-6" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Step circle — prominent */}
                  <div className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background shadow-sm transition-colors duration-300 group-hover:border-primary/30">
                    <motion.span
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        type: "spring" as const,
                        stiffness: 300,
                        damping: 12,
                        delay: i * 0.1,
                      }}
                      className="text-lg font-bold text-foreground"
                    >
                      {toPersianDigits(i + 1)}
                    </motion.span>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1 max-md:hidden" />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
