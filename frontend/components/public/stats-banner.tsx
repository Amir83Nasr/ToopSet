"use client"

import { motion, useInView, useMotionValue, animate } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { Building2, Hash, Users, Star } from "lucide-react"
import { toPersianDigits } from "@/lib/utils"

const stats = [
  {
    icon: Building2,
    value: 15,
    suffix: "+",
    label: "سالن ورزشی",
    desc: "مجهز و استاندارد در سراسر شهر",
  },
  {
    icon: Hash,
    value: 4,
    suffix: "",
    label: "رشته ورزشی",
    desc: "والیبال، بسکتبال، فوتسال، هندبال",
  },
  {
    icon: Users,
    value: 1000,
    suffix: "+",
    label: "رزرو موفق",
    desc: "ثبت‌شده در سامانه",
  },
  {
    icon: Star,
    value: 48,
    suffix: "",
    label: "میانگین امتیاز",
    desc: "رضایت بالای کاربران",
    format: (v: number) => toPersianDigits((v / 10).toFixed(1)),
  },
]

function Counter({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const count = useMotionValue(0)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const controls = animate(count, to, {
      duration: 2.2,
      ease: [0.16, 1, 0.3, 1],
    })
    const unsubscribe = count.on("change", (v) => setDisplay(Math.round(v)))
    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [isInView, count, to])

  return (
    <motion.span
      ref={ref}
      className="text-4xl font-bold tracking-tight tabular-nums md:text-5xl"
    >
      {toPersianDigits(display)}
      {suffix}
    </motion.span>
  )
}

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.18 },
  },
}

const item = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 160, damping: 16 },
  },
}

export function StatsBanner() {
  return (
    <section className="relative overflow-hidden border-t px-4 py-16 md:py-24">
      {/* Background */}
      <div className="bg-grid absolute inset-0 opacity-[0.03]" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-[500px] rounded-full bg-primary/3 blur-[100px]" />
      </div>

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
            آمار توپ‌سِت
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            رشد سریع <span className="text-primary">اعتماد</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            آمارهای توپ‌سِت نشون‌دهنده کیفیت و محبوبیت این سامانه است
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
        >
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                variants={item}
                className="group flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-sm md:p-8"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors duration-300 group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon className="size-5" />
                </div>

                {stat.format ? (
                  <span className="text-4xl font-bold tracking-tight md:text-5xl">
                    {stat.format(stat.value)}
                  </span>
                ) : (
                  <Counter to={stat.value} suffix={stat.suffix} />
                )}

                <span className="text-xs text-muted-foreground md:text-sm">
                  {stat.label}
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground/60">
                  {stat.desc}
                </span>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
