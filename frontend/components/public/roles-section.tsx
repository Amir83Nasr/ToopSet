"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { User, Building2, ArrowLeft } from "lucide-react"

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
      "مجموعه‌هات رو مدیریت کن، سانس‌ها رو تنظیم کن و گزارش درآمد و آمار بگیر",
    cta: { label: "تماس با پشتیبانی", href: "/contact" },
  },
]

export function RolesSection() {
  return (
    <section className="relative overflow-hidden border-t px-4 py-16 md:py-24">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-15 dark:opacity-[0.03]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground"
          >
            <span className="size-1.5 rounded-full bg-primary/40" />
            مخاطبان توپ‌سِت
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl"
          >
            مناسب <span className="text-primary">چه کسیه</span>؟
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mx-auto mt-3 max-w-lg text-muted-foreground"
          >
            چه بازیکنی باشی چه صاحب مجموعه، توپ‌سِت ابزارهای مورد نیازتو داره
          </motion.p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {roles.map((role, i) => {
            const Icon = role.icon
            return (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm md:p-8"
              >
                {/* Icon */}
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon className="size-6" />
                </div>

                <h3 className="mb-2 text-xl font-bold">{role.title}</h3>

                <p className="mb-6 leading-relaxed text-muted-foreground">
                  {role.description}
                </p>

                <Link
                  href={role.cta.href}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-all hover:gap-2 hover:text-foreground"
                >
                  {role.cta.label}
                  <ArrowLeft className="size-4" />
                </Link>
              </motion.div>
            )
          })}
        </div>

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
