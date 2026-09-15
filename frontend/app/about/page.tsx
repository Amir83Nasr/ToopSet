import type { Metadata } from "next"
import Link from "next/link"
import {
  PhoneCall,
  Lightbulb,
  Rocket,
  Users,
  Eye,
  Zap,
  HeartHandshake,
  Flag,
} from "lucide-react"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { Button } from "@/components/ui/button"
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

// ── Timeline chapters ─────────────────────────────────────────────────────────

const chapters = [
  {
    era: "گذشته",
    icon: PhoneCall,
    title: "دغدغه: یک سانس ساده، چند تماس بی‌جواب",
    body: "برای یک سانس ساده باید به چند مجموعه زنگ می‌زدی؛ خیلی وقت‌ها جواب نمی‌دادند یا شماره عوض شده بود. تا لحظه تماس نمی‌دانستی امشب جای خالی هست یا نه، و قیمت سانس‌ها هم شفاف نبود.",
    points: ["تماس‌های پشت‌سرهم", "سانس نامشخص", "قیمت نامشخص"],
  },
  {
    era: "ایده",
    icon: Lightbulb,
    title: "ایده: همه قم، یک‌جا و آنلاین",
    body: "به‌جای تماس گرفتن، همه‌چیز را آنلاین ببین: سالن فوتسال، چمن مصنوعی، والیبال و بسکتبال قم را با قیمت، آدرس و امکانات در یک صفحه مقایسه کن، سانس خالی را انتخاب کن و در چند ثانیه رزرو کن.",
    points: [
      "مقایسه قیمت و امکانات",
      "رزرو در چند ثانیه",
      "نظر واقعی بازیکنان",
    ],
  },
  {
    era: "امروز",
    icon: Rocket,
    title: "امروز: توپ‌سِت در قم",
    body: "توپ‌سِت حالا پلتفرم رزرو آنلاین سانس‌های ورزشی قم است؛ بازیکن بدون استرس رزرو می‌کند و مدیر سالن بدون تلفن‌جواب‌دادن مشتری می‌گیرد. بعد از هر بازی، نظر ثبت می‌شود تا بازیکن بعدی با چشم باز انتخاب کند.",
    points: ["قفل هوشمند سانس", "پرداخت آنلاین", "امتیاز و نظر کاربران"],
  },
  {
    era: "آینده",
    icon: Flag,
    title: "آینده: هر شهر، همین تجربه",
    body: "ماموریت ما این است که رزرو ورزش در هر شهری به سادگی چند کلیک باشد؛ با تصاویر واقعی، امتیاز کاربران و دسترسی شفاف به امکانات هر مجموعه. قم نقطه شروع است.",
    points: [
      "پوشش شهرهای بیشتر",
      "سانس ثابت هفتگی تیم‌ها",
      "تجربه بهتر مدیران",
    ],
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
    icon: Users,
    title: "ساخته‌شده از تجربه",
    description:
      "توپ‌سِت را کسانی ساختند که خودشان تماس‌های بی‌جواب برای سانس گرفتن را تجربه کرده‌اند.",
  },
] as const

export default function AboutPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main id="main-content" className="relative flex-1 pt-16">
        {/* ═══ Narrative intro — editorial, not a landing hero ═══ */}
        <section>
          <div className="mx-auto max-w-3xl px-4 py-14 text-start md:py-20">
            <p className="text-xs font-bold tracking-widest text-primary">
              داستان ما
            </p>
            <h1 className="mt-3 text-3xl leading-snug font-bold tracking-tight md:text-5xl md:leading-tight">
              از دغدغه یک سانس ساده تا رزرو آنلاین در قم
            </h1>
            <p className="mt-5 max-w-2xl leading-8 text-muted-foreground md:text-lg md:leading-9">
              «سانس خالی داری؟» — این جمله‌ای بود که هر هفته ده‌ها بار بین
              بازیکنان قم رد و بدل می‌شد؛ با تماس‌های بی‌جواب، قیمت‌های نامشخص و
              برنامه‌هایی که همیشه در هوا بود. توپ‌سِت (ToopSet) برای تمام کردن
              همین جمله ساخته شد.
            </p>
          </div>
        </section>

        {/* ═══ Timeline ═══ */}
        <section className="border-t">
          <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
            <ol className="relative ms-6 space-y-10 border-s-2 border-primary/20 ps-0 md:ms-7 md:space-y-12">
              {chapters.map(({ era, icon: Icon, title, body, points }) => (
                <li key={title} className="relative ps-12 md:ps-14">
                  <span className="absolute start-0 top-0 flex size-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-primary/30 bg-background text-primary md:size-11 rtl:translate-x-1/2">
                    <Icon className="size-5" />
                  </span>
                  <p className="text-[11px] font-bold tracking-widest text-primary">
                    {era}
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">
                    {title}
                  </h2>
                  <p className="mt-2 leading-8 text-muted-foreground">{body}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {points.map((p) => (
                      <li
                        key={p}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═══ Values — plain list, no cards ═══ */}
        <section className="border-t bg-muted/50">
          <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              به چه چیزهایی پایبندیم؟
            </h2>
            <dl className="mt-8 divide-y divide-border">
              {values.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <dt className="font-bold">{title}</dt>
                    <dd className="mt-1 leading-7 text-muted-foreground">
                      {description}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="h-10 px-6 text-base font-semibold"
              >
                <Link href="/vendors">مشاهده مجموعه‌های قم</Link>
              </Button>
              <Button
                variant="outline"
                asChild
                size="lg"
                className="h-10 px-6 text-base font-semibold"
              >
                <Link href="/blog">خواندن بلاگ</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ═══ Contact CTA ═══ */}
        <section className="border-t">
          <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              حرفی داری؟ با ما در تماس باش
            </h2>
            <p className="mt-3 leading-8 text-muted-foreground">
              سوال، پیشنهاد یا انتقادی داری؟ از صفحه ارتباط با ما پیام بده؛ زود
              جواب می‌دهیم.
            </p>
            <div className="mt-6">
              <Button
                asChild
                size="lg"
                className="h-10 px-6 text-base font-semibold"
              >
                <Link href="/contact">ارتباط با ما</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
