"use client"

import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { User, Building2, ArrowLeft } from "lucide-react"

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
}

const cardItem = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 180,
      damping: 18,
    },
  },
}

const roles = [
  {
    icon: User,
    title: "کاربر عادی",
    description:
      "به سادگی سالن ورزشی مورد نظرت رو پیدا کن و سانس دلخواهتو در چند ثانیه رزرو کن",
    cta: { label: "ثبت‌نام رایگان", href: "/register" },
  },
  {
    icon: Building2,
    title: "مدیر مجموعه",
    description:
      "زمین‌هات رو مدیریت کن، سانس‌ها رو تنظیم کن و گزارش درآمد و آمار بگیر",
    cta: { label: "ثبت‌نام", href: "/register" },
  },
]

export function RolesSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-t px-4 py-16 md:py-24"
    >
      <motion.div
        className="bg-grid pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ y: bgY }}
      />

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground"
          >
            <span className="size-1.5 rounded-full bg-primary/40" />
            مخاطبان
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl"
          >
            توپ‌سِت مناسب <span className="text-primary">چه کسی</span> هست؟
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: 0.08,
            }}
            className="mx-auto mt-3 max-w-lg text-muted-foreground"
          >
            چه بازیکنی باشی چه صاحب مجموعه، توپ‌سِت ابزارهای مورد نیازتو داره
          </motion.p>
        </div>

        {/* Cards — symmetric comparison */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid gap-6 md:grid-cols-2 md:gap-8"
        >
          {roles.map((role) => {
            const Icon = role.icon
            return (
              <motion.div key={role.title} variants={cardItem}>
                <div className="group relative rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm md:p-8">
                  {/* Icon */}
                  <motion.div
                    className="mb-5 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon className="size-6" />
                  </motion.div>

                  {/* Title + Description */}
                  <h3 className="mb-2 text-xl font-bold">{role.title}</h3>
                  <p className="mb-6 leading-relaxed text-muted-foreground">
                    {role.description}
                  </p>

                  {/* CTA */}
                  <div className="mt-auto">
                    <Link
                      href={role.cta.href}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-all hover:gap-2 hover:text-foreground"
                    >
                      {role.cta.label}
                      <ArrowLeft className="size-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Bottom tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center text-sm text-muted-foreground"
        >
          برای هر دو نقش کاملاً رایگان — فقط کافیه ثبت‌نام کنی
        </motion.p>
      </div>
    </section>
  )
}
