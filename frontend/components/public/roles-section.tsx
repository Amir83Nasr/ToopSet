"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { User, Building2, ArrowLeft } from "lucide-react"

const roles = [
  {
    icon: User,
    title: "کاربر عادی",
    description: "به سادگی سالن ورزشی مورد نظرت رو پیدا کن و سانس دلخواهتو در چند ثانیه رزرو کن",
    cta: { label: "ثبت‌نام رایگان", href: "/register" },
    gradient: "from-blue-500/10 to-blue-600/5",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-200/50 dark:border-blue-800/30",
    hoverGlow: "group-hover:shadow-blue-500/10",
    accentColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Building2,
    title: "مدیر مجموعه",
    description: "زمین‌هات رو مدیریت کن، سانس‌ها رو تنظیم کن و گزارش درآمد و آمار بگیر",
    cta: { label: "ثبت‌نام", href: "/register" },
    gradient: "from-emerald-500/10 to-emerald-600/5",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-200/50 dark:border-emerald-800/30",
    hoverGlow: "group-hover:shadow-emerald-500/10",
    accentColor: "text-emerald-600 dark:text-emerald-400",
  },
]

const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
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

export function RolesSection() {
  return (
    <section className="relative overflow-hidden border-t px-4 py-16 md:py-24">
      {/* Background decorations */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.03]" />
      <div className="pointer-events-none absolute -left-32 top-1/2 size-96 -translate-y-1/2 rounded-full bg-blue-500/3 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 top-1/2 size-96 -translate-y-1/2 rounded-full bg-emerald-500/3 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="text-3xl font-bold tracking-tight md:text-4xl"
          >
            مناسب{" "}
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-emerald-400">
              چه کسی
            </span>{" "}
            هستی؟
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.08 }}
            className="mx-auto mt-3 max-w-lg text-muted-foreground"
          >
            چه بازیکنی باشی چه صاحب مجموعه، توپ‌سِت ابزارهای مورد نیازتو داره
          </motion.p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid gap-6 md:grid-cols-2"
        >
          {roles.map((role, i) => {
            const Icon = role.icon
            return (
              <motion.div
                key={role.title}
                variants={cardItem}
                whileHover={{
                  y: -8,
                  transition: { type: "spring" as const, stiffness: 300, damping: 15 },
                }}
                className={`group relative overflow-hidden rounded-2xl border ${role.borderColor} ${role.gradient} bg-card/50 p-6 md:p-8 ${role.hoverGlow} transition-shadow duration-300`}
              >
                {/* Subtle corner accent */}
                <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-gradient-to-br from-foreground/[0.03] to-transparent" />

                {/* Icon */}
                <motion.div
                  className={`mb-4 flex size-12 items-center justify-center rounded-xl ${role.iconBg}`}
                  whileHover={{
                    rotate: [0, -10, 10, -5, 0],
                    scale: 1.1,
                    transition: { duration: 0.4 },
                  }}
                >
                  <Icon className="size-6" />
                </motion.div>

                <h3 className="mb-2 text-xl font-bold">{role.title}</h3>

                <p className="mb-6 leading-relaxed text-muted-foreground">
                  {role.description}
                </p>

                <Link
                  href={role.cta.href}
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold ${role.accentColor} transition-all hover:gap-2`}
                >
                  {role.cta.label}
                  <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
                </Link>

                {/* Hover shine effect */}
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] to-transparent dark:from-white/[0.04]" />
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
          className="mt-10 text-center text-sm text-muted-foreground"
        >
          برای هر دو نقش کاملاً رایگان — فقط کافیه ثبت‌نام کنی
        </motion.p>
      </div>
    </section>
  )
}
