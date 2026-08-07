import type { Metadata } from "next"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import { BRAND } from "@/lib/site"

export const metadata: Metadata = {
  title: "درباره توپ‌سِت",
  description:
    "توپ‌سِت (ToopSet) پلتفرم رزرو آنلاین سانس‌های ورزشی در قم است؛ سالن فوتسال، زمین چمن مصنوعی و دیگر مجموعه‌های ورزشی را بدون تماس تلفنی مقایسه و رزرو کنید.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: `درباره ${BRAND}`,
    description: "پلتفرم رزرو آنلاین زمین‌های ورزشی در قم",
    type: "website",
    locale: "fa_IR",
  },
}

export default function AboutPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main id="main-content" className="relative flex-1 pt-16">
        <div className="mx-auto max-w-3xl px-4 py-12 md:py-20">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            درباره توپ‌سِت (ToopSet)
          </h1>
          <div className="mt-8 space-y-8 leading-8">
            <section>
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                توپ‌سِت چیست؟
              </h2>
              <p className="mt-3 text-muted-foreground">
                توپ‌سِت یک سامانه رزرو آنلاین زمین‌های ورزشی است. با توپ‌ست
                (ToopSet) می‌توانید سالن فوتسال، زمین چمن مصنوعی و دیگر
                مجموعه‌های ورزشی قم را در یک جا ببینید، قیمت و امکاناتشان را
                مقایسه کنید و سانس مورد نظرتان را آنلاین رزرو کنید.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                چرا توپ‌سِت ایجاد شد؟
              </h2>
              <p className="mt-3 text-muted-foreground">
                رزرو سانس ورزشی در گذشته یعنی تماس‌های پشت‌سرهم، رفتن به دنبال
                شماره مجموعه‌ها و انتظار برای شنیدن «سانس خالی نداریم». ToopSet
                این روند را آنلاین کرد تا هر بازیکنی در قم سانس خالی را بدون
                تماس تلفنی پیدا کند و در چند ثانیه رزرو کند.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                چه کسانی از توپ‌سِت استفاده می‌کنند؟
              </h2>
              <p className="mt-3 text-muted-foreground">
                از تیم‌های منظم فوتبال و فوتسال تا دورهمی‌های دوستانه والیبال و
                بسکتبال — همه کسانی که در قم به دنبال سالن ورزشی یا زمین چمن
                هستند. توپ ست برای مدیریت مجموعه‌ها هم امکاناتی دارد؛ مدیران
                سالن می‌توانند سانس‌ها را تعریف و رزروها را مدیریت کنند.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                ماموریت ما
              </h2>
              <p className="mt-3 text-muted-foreground">
                هدف ما این است که رزرو ورزش در قم به سادگی چند کلیک باشد؛ با
                تصاویر واقعی، امتیاز و نظر کاربران و دسترسی شفاف به امکانات هر
                مجموعه. توپ‌سِت برای این ساخته شده که ورزش‌دوستان قمی وقت خود را
                صرف بازی کنند، نه صرف پیدا کردن سالن.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
