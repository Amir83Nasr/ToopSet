"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  Search,
  Star,
  ListChecks,
  Target,
  Eye,
  Building2,
  BarChart3,
  Clock,
  Camera,
  MessageSquare,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card"
import { toPersianDigits } from "@/lib/utils"

// ── Section data ───────────────────────────────────────────────────────────

const stats = [
  { value: 15, suffix: "+", label: "سالن ورزشی" },
  { value: 2000, suffix: "+", label: "کاربر فعال" },
  { value: 5000, suffix: "+", label: "رزرو موفق" },
  { label: "قم", suffix: "", value: 1, isString: true },
]

const features = [
  {
    icon: Search,
    title: "جستجوی هوشمند",
    description: "مقایسه قیمت، موقعیت و امکانات سالن‌ها در یک نگاه",
  },
  {
    icon: Camera,
    title: "گالری تصاویر واقعی",
    description:
      "تصاویر واقعی از سالن، رختکن و سرویس بهداشتی توسط مدیران بارگذاری می‌شود",
  },
  {
    icon: Star,
    title: "نمره و نظر کاربران",
    description:
      "کاربران پس از هر بازی می‌توانند تجربه خود را با نمره و نظر ثبت کنند",
  },
  {
    icon: ListChecks,
    title: "چک‌لیست امکانات",
    description:
      "مشاهده کامل امکانات هر سالن: کفپوش استاندارد، پارکینگ، تهویه و آبسردکن",
  },
  {
    icon: ShieldCheck,
    title: "قفل هوشمند سانس",
    description:
      "اولین درخواست رزرو برنده است — سانس به محض رزرو برای دیگران قفل می‌شود",
  },
]

const managerBenefits = [
  { icon: Building2, title: "تعریف و مدیریت سالن و سانس‌ها" },
  { icon: BarChart3, title: "گزارش درآمد روزانه و ماهانه" },
  { icon: Clock, title: "مشاهده لحظه‌ای رزروهای امروز" },
  { icon: MessageSquare, title: "پاسخ به نظرات و مدیریت کیفیت" },
]

// ── Animation variants ─────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 180, damping: 18 },
  },
}

const fadeLeft = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 160, damping: 17 },
  },
}

const fadeRight = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 160, damping: 17 },
  },
}

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
}

const staggerFast = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

// ── Component ──────────────────────────────────────────────────────────────

export function AboutSection() {
  return (
    <section id="about-section" className="overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-4">
        {/* ═══ Header ═══ */}
        <div className="px-4 pt-16 pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/80 px-4 py-1.5 text-xs text-muted-foreground"
          >
            <span className="size-1.5 rounded-full bg-primary/80" />
            درباره توپ‌سِت
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="text-3xl font-bold tracking-tight md:text-4xl"
          >
            سامانه هوشمند <span className="text-primary">رزرو سانس ورزشی</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: 0.1,
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
            className="mx-auto mt-5 max-w-2xl leading-relaxed text-muted-foreground"
          >
            توپ‌سِت یک سامانه آنلاین رزرو سانس ورزشی است که کاربران می‌توانند
            سالن‌های والیبال، بسکتبال، فوتسال و هندبال را بر اساس موقعیت، قیمت و
            امکانات مقایسه کرده و در لحظه سانس مورد نظر خود را رزرو کنند. مدیران
            سالن‌ها نیز ابزار کاملی برای مدیریت سانس‌ها، مشاهده درآمد و پاسخ به
            نظرات کاربران در اختیار دارند.
          </motion.p>
        </div>

        {/* ═══ Stats ═══ */}
        <div className="px-4 pb-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={fadeUp}>
                <Card className="text-center" size="sm">
                  <CardContent className="py-2">
                    <div className="text-3xl font-bold tracking-tight">
                      {stat.isString
                        ? stat.label
                        : `${toPersianDigits(stat.value)}${stat.suffix}`}
                    </div>
                    <CardDescription className="mt-1">
                      {stat.isString ? "شهر فعال" : stat.label}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ═══ Mission & Vision ═══ */}
        <div className="px-4 pb-16">
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeLeft}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Target className="size-5" />
                    </div>
                    <CardTitle>رسالت ما</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    ما در توپ‌سِت می‌خواهیم تجربه رزرو سانس ورزشی را برای همه
                    آسان، شفاف و لذت‌بخش کنیم. دیگر هیچ تیمی نباید برای پیدا
                    کردن سالن مناسب سردرگم شود یا نگران دو‌باره رزرو شدن سانس
                    باشد.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeRight}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Eye className="size-5" />
                    </div>
                    <CardTitle>چشم‌انداز ما</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    توپ‌سِت در تلاش است تا به اولین و کامل‌ترین سامانه رزرو
                    آنلاین سالن‌های ورزشی در ایران تبدیل شود، جایی که هر
                    ورزشکاری بتواند در هر شهر ایران، سالن مورد نظر خود را در چند
                    ثانیه پیدا و رزرو کند.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* ═══ Features ═══ */}
        <div className="px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              چرا توپ‌سِت؟
            </h2>
            <p className="mt-2 text-muted-foreground">
              امکاناتی که توپ‌سِت را از روش سنتی جدا می‌کند
            </p>
          </motion.div>

          <motion.div
            variants={staggerFast}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <motion.div key={feature.title} variants={fadeUp}>
                  <Card className="group h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                    <CardHeader>
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                        <Icon className="size-5" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* ═══ For Managers ═══ */}
        <div className="px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary/40" />
              مدیران مجموعه
            </div>
            <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
              مدیریت هوشمند سالن‌ها
            </h2>
            <p className="mx-auto max-w-xl leading-relaxed text-muted-foreground">
              مدیر سالن دیگر نیازی به پاسخگویی تلفنی، ثبت دستی رزروها، یا نگرانی
              از پر شدن دوگانه سانس‌ها ندارد. همه چیز آنلاین، خودکار و شفاف است.
            </p>
          </motion.div>

          <motion.div
            variants={staggerFast}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
          >
            {managerBenefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <motion.div key={benefit.title} variants={fadeUp}>
                  <Card className="group h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
                    <CardHeader>
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                        <Icon className="size-5" />
                      </div>
                      <CardTitle>{benefit.title}</CardTitle>
                    </CardHeader>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* ═══ CTA ═══ */}
        <div className="px-4 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              آماده شروع هستی؟
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              دیگر وقت خود را با تماس‌های تلفنی تلف نکن. در چند کلیک سانس مورد
              نظرت را پیدا کن و رزرو کن.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4">
              <Button asChild>
                <Link href="/login">ثبت‌نام رایگان</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/vendors">مشاهده سالن‌ها</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
