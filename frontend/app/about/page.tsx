import type { Metadata } from "next"
import Link from "next/link"
import {
  PhoneCall,
  CalendarX2,
  BadgeDollarSign,
  Lightbulb,
  Search,
  CalendarCheck2,
  Trophy,
  Eye,
  Zap,
  HeartHandshake,
  Building2,
} from "lucide-react"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { BRAND } from "@/lib/site"

export const metadata: Metadata = {
  title: "درباره توپ‌سِت",
  description:
    "داستان توپ‌سِت (ToopSet): از دغدغه رزرو تلفنی سانس‌های ورزشی در قم تا پلتفرم آنلاین مقایسه و رزرو سالن فوتسال، زمین چمن مصنوعی و مجموعه‌های ورزشی.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: `درباره ${BRAND}`,
    description: "داستان توپ‌سِت؛ رزرو آنلاین زمین‌های ورزشی در قم",
    type: "website",
    locale: "fa_IR",
  },
  robots: {
    index: true,
    follow: true,
  },
}

const pains = [
  {
    icon: PhoneCall,
    title: "تماس‌های پشت‌سرهم",
    description:
      "برای یک سانس ساده باید به چند مجموعه زنگ می‌زدی؛ خیلی وقت‌ها جواب نمی‌دادند یا شماره عوض شده بود.",
  },
  {
    icon: CalendarX2,
    title: "سانس نامشخص",
    description:
      "تا لحظه تماس نمی‌دانستی امشب جای خالی هست یا نه؛ برنامه تیم همیشه در هوا بود.",
  },
  {
    icon: BadgeDollarSign,
    title: "قیمت نامشخص",
    description:
      "قیمت سانس‌ها شفاف نبود؛ مقایسه سالن‌ها ممکن نبود و همیشه حس می‌کردی شاید گران‌تر حساب شده.",
  },
] as const

const ideaSteps = [
  {
    step: "۱",
    icon: Search,
    title: "همه قم، یک‌جا",
    description:
      "سالن فوتسال، چمن مصنوعی، والیبال و بسکتبال قم را با قیمت، آدرس و امکانات در یک صفحه ببین.",
  },
  {
    step: "۲",
    icon: CalendarCheck2,
    title: "رزرو در چند ثانیه",
    description:
      "سانس خالی را انتخاب کن و آنلاین پرداخت کن؛ سانس همان لحظه برای تو قفل می‌شود.",
  },
  {
    step: "۳",
    icon: Trophy,
    title: "بازی و اعتماد",
    description:
      "بعد از بازی نظرت را ثبت کن تا بازیکن بعدی با چشم باز انتخاب کند و سالن خوب دیده شود.",
  },
] as const

const values = [
  {
    icon: Eye,
    title: "شفافیت",
    description:
      "قیمت واقعی، تصاویر واقعی سالن و نظر واقعی بازیکنان — بدون غافلگیری.",
  },
  {
    icon: Zap,
    title: "سرعت",
    description:
      "از جستجو تا کد رزرو کمتر از یک دقیقه؛ وقتت را صرف بازی کن نه پیدا کردن سالن.",
  },
  {
    icon: HeartHandshake,
    title: "احترام به هر دو طرف",
    description:
      "بازیکن بدون استرس رزرو می‌کند؛ مدیر سالن بدون تلفن‌جواب‌دادن مشتری می‌گیرد.",
  },
  {
    icon: Lightbulb,
    title: "ساخته‌شده از تجربه",
    description:
      "توپ‌سِت را کسانی ساختند که خودشان برای سانس گرفتن تماس‌های بی‌جواب را تجربه کرده‌اند.",
  },
] as const

export default function AboutPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main id="main-content" className="relative flex-1 pt-16">
        {/* ═══ Hero ═══ */}
        <section>
          <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
            <div className="animate-fade-in mx-auto max-w-2xl text-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/4 px-4 py-2 text-[10px] font-bold text-muted-foreground backdrop-blur-sm sm:text-xs">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                  </span>
                  <span>داستان توپ‌سِت</span>
                </div>

                <h1 className="text-3xl leading-tight font-bold text-foreground sm:text-4xl sm:leading-snug lg:text-5xl lg:leading-normal">
                  از دغدغه یک سانس ساده
                  <br />
                  <span className="font-bold text-primary">
                    تا رزرو آنلاین در قم
                  </span>
                </h1>

                <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                  توپ‌سِت (ToopSet) پلتفرم رزرو آنلاین سانس‌های ورزشی قم است؛
                  جایی که سالن فوتسال، زمین چمن مصنوعی و دیگر مجموعه‌ها را بدون
                  تماس تلفنی مقایسه و رزرو می‌کنی.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ دغدغه ═══ */}
        <section className="overflow-x-hidden border-y bg-muted/50">
          <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
            <div className="animate-fade-in mb-10 text-center md:mb-12">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                دغدغه از کجا شروع شد؟
              </h2>
              <p className="mt-2 text-muted-foreground">
                هر کسی که در قم دنبال سانس ورزشی بوده، این سه درد را می‌شناسد
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {pains.map(({ icon: Icon, title, description }, i) => (
                <div
                  key={title}
                  className="animate-fade-in flex flex-col items-center rounded-xl border bg-background p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-7" />
                  </div>
                  <h3 className="mb-1.5 text-lg font-semibold">{title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ ایده ═══ */}
        <section className="overflow-x-hidden">
          <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
            <div className="animate-fade-in mb-10 text-center md:mb-12">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                ایده توپ‌سِت چه بود؟
              </h2>
              <p className="mt-2 text-muted-foreground">
                به‌جای تماس گرفتن، همه‌چیز را آنلاین ببین و در سه قدم رزرو کن
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {ideaSteps.map(({ step, icon: Icon, title, description }, i) => (
                <div
                  key={title}
                  className="animate-fade-in flex flex-col items-center rounded-xl border bg-background p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-7" />
                    <span className="absolute -inset-s-1 -top-1 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {step}
                    </span>
                  </div>
                  <h3 className="mb-1.5 text-lg font-semibold">{title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ ارزش‌ها ═══ */}
        <section className="overflow-x-hidden">
          <div className="mx-auto max-w-7xl px-4">
            <div className="py-12 md:py-16">
              <div className="animate-fade-in mb-10 text-center md:mb-12">
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  به چه چیزهایی پایبندیم؟
                </h2>
                <p className="mt-2 text-muted-foreground">
                  چهار اصلی که هر تصمیم توپ‌سِت با آن سنجیده می‌شود
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {values.map(({ icon: Icon, title, description }, i) => (
                  <Card
                    key={title}
                    className="group animate-fade-in h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <CardHeader>
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                          <Icon className="size-5" />
                        </div>
                        <CardTitle className="font-semibold">{title}</CardTitle>
                      </div>
                      <CardDescription>{description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            {/* ═══ ماموریت ═══ */}
            <div className="pb-12 md:pb-16">
              <div className="animate-fade-in mx-auto max-w-2xl rounded-3xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center md:p-8">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Building2 className="size-6" />
                </div>
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                  ماموریت ما
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                  رزرو ورزش در قم باید به سادگی چند کلیک باشد؛ با تصاویر واقعی،
                  امتیاز و نظر کاربران و دسترسی شفاف به امکانات هر مجموعه.
                  توپ‌سِت ساخته شده تا ورزش‌دوستان قمی وقتشان را صرف بازی کنند،
                  نه صرف پیدا کردن سالن.
                </p>
              </div>
            </div>

            {/* ═══ CTA ═══ */}
            <div className="pb-16 md:pb-20">
              <div className="animate-fade-in mx-auto max-w-2xl text-center">
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  آماده شروع هستی؟
                </h2>
                <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                  دیگر وقت خود را با تماس‌های تلفنی تلف نکن. در چند کلیک سانس
                  مورد نظرت را پیدا کن و رزرو کن.
                </p>
                <div className="mt-6 flex items-center justify-center gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="h-10 px-6 text-base font-semibold"
                  >
                    <Link href="/login">ثبت‌نام رایگان</Link>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    size="lg"
                    className="h-10 px-6 text-base font-semibold"
                  >
                    <Link href="/vendors">مشاهده مجموعه‌ها</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
