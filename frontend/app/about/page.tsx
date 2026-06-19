"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  Search,
  CalendarCheck,
  Star,
  ListChecks,
  Smartphone,
  Building2,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"

const features = [
  {
    icon: Search,
    title: "مقایسه سریع قیمت و امکانات",
    description:
      "مثل دیوار، اما برای ورزش. یک جدول مقایسه کنار هم: سالن الف با قیمت ۲۰۰ تومان + آبسردکن + کفپوش استاندارد، سالن ب ۱۵۰ تومان + بدون آبسردکن + سرویس بهداشتی مشترک. همه چیز شفاف و قابل مقایسه.",
  },
  {
    icon: CalendarCheck,
    title: "گالری تصاویر واقعی",
    description:
      "هر مدیر سالن موظف است حداقل ۳ تصویر از سالن (نمای کلی، سرویس بهداشتی، رختکن) آپلود کند. کاربران هم می‌توانند تصاویر خودشان را بعد از بازی اضافه کنند تا هیچ دروغی در کار نباشد.",
  },
  {
    icon: Star,
    title: "سیستم نمره و نظر",
    description:
      "کاربران پس از پایان هر سانس می‌توانند به سالن از ۱ تا ۵ ستاره بدهند و نظر بنویسند: «کفپوش عالی، اما نور سالن کم بود». این نظرات برای کاربر بعدی مثل چراغ راهنما می‌ماند.",
  },
  {
    icon: ListChecks,
    title: "چک‌لیست امکانات",
    description:
      "یک بخش چک‌لیست در صفحه هر سالن شامل: سرویس بهداشتی مجزا، آبسردکن، کفپوش استاندارد، جایگاه تماشاگر، تهویه مطبوع، پارکینگ اختصاصی و سایر امکانات.",
  },
  {
    icon: ShieldCheck,
    title: "مدیریت هوشمند ناهماهنگی‌ها",
    description:
      "در روش سنتی ممکن بود دو تیم برای یک ساعت یکسان با مدیر صحبت کنند و او اشتباه کند. در توپ‌سِت به محض رزرو یک سانس توسط تیمی، آن سانس برای دیگران قفل می‌شود. پایان روزهای دوباره‌کاری.",
  },
]

const stories = [
  {
    title: "روایت شماره یک: نبرد آخرین سانس",
    content:
      "علی و رضا هر دو تیم‌های والیبال متفاوتی دارند. هر دو دقیقاً در یک لحظه روی دکمه «رزرو» برای سانس ۲۰ سالن اصلی کلیک می‌کنند. سیستم توپ‌سِت با استفاده از قفل بهینه‌سازانه، تنها به اولین درخواستی که به پایگاه داده می‌رسد، سانس را می‌دهد. به دیگری پیام «سانس در لحظه پر شد» نمایش داده می‌شود. بدون دعوا، بدون ناهماهنگی.",
  },
  {
    title: "روایت شماره دو: مدیر سالنی که نفس راحت می‌کشد",
    content:
      "مدیر سالن «آرنا» قبلاً هر روز صبح باید ۲۰ تماس تلفنی را پاسخ می‌داد، در دفترچه یادداشت می‌کرد، بعداً می‌دید دو تیم برای یک ساعت ثبت کرده و مجبور می‌شد با یکی تماس بگیرد و عذرخواهی کند. حالا در توپ‌سِت، پنل مدیریت به او نشان می‌دهد: «امروز ۳ سانس پر، ۲ سانس خالی، درآمد امروز ۱.۲ میلیون تومان». با یک کلیک، قیمت سانس آخر هفته را ۲۰٪ افزایش می‌دهد. همه چیز در جیب اوست.",
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 180, damping: 18 },
  },
}

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
}

export default function AboutPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-16 md:py-24">
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground"
            >
              <span className="size-1.5 rounded-full bg-primary/40" />
              درباره توپ‌سِت
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="text-3xl font-bold tracking-tight md:text-5xl lg:text-6xl"
            >
              سامانه هوشمند{" "}
              <span className="text-primary">رزرو سانس ورزشی</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.08,
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
              className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
            >
              از سردرگمی تلفنی تا انتخاب هوشمندانه — توپ‌سِت پلconnecting عاشقان
              والیبال، بسکتبال، فوتسال و هندبال با سالن‌های ورزشی است
            </motion.p>
          </div>
        </section>

        {/* Problem & Solution */}
        <section className="px-4 py-16 md:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-10 md:grid-cols-2">
              {/* Problem */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
                className="rounded-2xl border bg-card p-6 md:p-8"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <Smartphone className="size-6" />
                </div>
                <h2 className="mb-3 text-xl font-bold">
                  روش سنتی: سردرگمی تلفنی
                </h2>
                <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive/50" />
                    باید شماره ۱۰ سالن را پیدا کنی، ۷ تایشان جواب ندهند
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive/50" />
                    ۲ تایشان سانس اشتباه بدهند و یکی هم گران باشد
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive/50" />
                    دوباره‌کاری، نارضایتی و از دست دادن زمان
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive/50" />
                    قیمت‌ها ثابت نیست، کیفیت سالن مشخص نیست
                  </li>
                </ul>
              </motion.div>

              {/* Solution */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 180, damping: 18 }}
                className="rounded-2xl border bg-card p-6 md:p-8"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-6" />
                </div>
                <h2 className="mb-3 text-xl font-bold">
                  توپ‌سِت: انتخاب هوشمندانه
                </h2>
                <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
                    همه سانس‌ها آنلاین و لحظه‌ای در دسترس
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
                    ظرفیت واقعی سالن در همان لحظه قابل مشاهده
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
                    قیمت‌ها توسط مدیر ثبت شده و برای همه یکسان
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
                    کاربران قبلی با نمرات و نظرات خود آینه تمام‌نمای کیفیت سالن
                    شده‌اند
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-16 md:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl font-bold tracking-tight md:text-4xl"
              >
                امکاناتی که توپ‌سِت را از روش سنتی جدا می‌کند
              </motion.h2>
            </div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={feature.title}
                    variants={fadeUp}
                    className="group rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm"
                  >
                    <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="mb-2 text-base font-semibold">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </section>

        {/* For Managers */}
        <section className="px-4 py-16 md:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary/40" />
                  مدیران مجموعه
                </div>
                <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
                  مدیریت هوشمند سالن‌ها
                </h2>
                <p className="mb-6 leading-relaxed text-muted-foreground">
                  مدیر سالن دیگر نیازی به پاسخگویی تلفنی، ثبت دستی رزروها، یا
                  نگرانی از پر شدن دوگانه سانس‌ها ندارد. همه چیز آنلاین، خودکار
                  و شفاف است.
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Building2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    تعریف سالن و سانس‌ها با قیمت‌گذاری دلخواه
                  </li>
                  <li className="flex items-start gap-2">
                    <Building2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    مشاهده رزروهای امروز و فردا به صورت لحظه‌ای
                  </li>
                  <li className="flex items-start gap-2">
                    <Building2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    گزارش درآمد روزانه، ماهانه به تفکیک هر سالن
                  </li>
                  <li className="flex items-start gap-2">
                    <Building2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    پاسخ به نظرات کاربران و مدیریت کیفیت
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="rounded-2xl border bg-muted/30 p-8 text-center"
              >
                <h3 className="mb-2 text-lg font-semibold">
                  آیا سالن ورزشی دارید؟
                </h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  با توپ‌سِت سالن خود را آنلاین کنید و از مدیریت هوشمند لذت
                  ببرید
                </p>
                <Button asChild>
                  <Link href="/contact">
                    تماس با پشتیبانی
                    <ArrowLeft className="mr-2 size-4" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stories */}
        <section className="px-4 py-16 md:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl font-bold tracking-tight md:text-4xl"
              >
                روایت‌هایی از زندگی با توپ‌سِت
              </motion.h2>
            </div>

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="grid gap-6 md:grid-cols-2"
            >
              {stories.map((story) => (
                <motion.div
                  key={story.title}
                  variants={fadeUp}
                  className="rounded-2xl border bg-card p-6 md:p-8"
                >
                  <h3 className="mb-3 text-lg font-semibold">{story.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {story.content}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                آماده شروع هستی؟
              </h2>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                دیگر وقت خود را با تماس‌های تلفنی تلف نکن. در چند کلیک سانس مورد
                نظرت را پیدا کن و رزرو کن.
              </p>
              <div className="mt-8 flex items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/register">ثبت‌نام رایگان</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/courts">مشاهده سالن‌ها</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
