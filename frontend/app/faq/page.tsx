import type { Metadata } from "next"
import Link from "next/link"
import { SiteHeader } from "@/components/public/site-header"
import { SiteFooter } from "@/components/public/site-footer"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "سوالات پرتکرار رزرو مجموعه ورزشی در قم",
  description:
    "پاسخ سوالات پرتکرار رزرو آنلاین سالن فوتسال، زمین چمن مصنوعی، والیبال و بسکتبال در قم: نحوه رزرو، لغو سانس، پرداخت و بازگشت وجه در توپ‌سِت (ToopSet).",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "سوالات پرتکرار | توپ‌سِت (ToopSet)",
    description: "نحوه رزرو آنلاین، لغو سانس و قوانین بازگشت وجه",
    type: "website",
    locale: "fa_IR",
    url: `${SITE_URL}/faq`,
  },
  robots: { index: true, follow: true },
}

const faqs = [
  {
    q: "چطور مجموعه ورزشی در قم رزرو کنم؟",
    a: "در صفحه جستجوی مجموعه‌ها، مجموعه مورد نظر را پیدا کنید، روز و ساعت خالی را انتخاب کنید و آنلاین پرداخت کنید. کد رزرو بلافاصله صادر می‌شود و نیازی به تماس تلفنی با مدیر مجموعه نیست.",
  },
  {
    q: "قیمت اجاره سالن و زمین ورزشی در قم چقدر است؟",
    a: "قیمت هر سانس (معمولاً ۹۰ دقیقه) بسته به رشته، محله، کیفیت زمین و ساعت بازی متفاوت است؛ سانس‌های شب و آخر هفته گران‌ترند. قیمت به‌روز هر مجموعه در صفحه خودش در توپ‌سِت مشخص است.",
  },
  {
    q: "آیا می‌توانم سانس رزروشده را لغو کنم؟",
    a: "بله. هر مجموعه قوانین لغو خودش را دارد که در صفحه رزرو نمایش داده می‌شود؛ لغو زودهنگام معمولاً شامل بازگشت کامل یا جزئی وجه است و مبلغ طبق همان قوانین به حساب شما برمی‌گردد.",
  },
  {
    q: "سانس خالی امروز را از کجا پیدا کنم؟",
    a: "در صفحه جستجوی مجموعه‌ها، روز جاری را انتخاب کنید تا فقط مجموعه‌هایی که امروز جای خالی دارند نمایش داده شوند.",
  },
  {
    q: "پرداخت چطور انجام می‌شود؟",
    a: "پرداخت کاملاً آنلاین از طریق درگاه بانکی انجام می‌شود. بعد از پرداخت موفق، کد رزرو صادر می‌شود؛ آن را نگه دارید و سر سانس به مجموعه نشان دهید.",
  },
  {
    q: "اگر مجموعه سانس را لغو کند چه می‌شود؟",
    a: "اگر به هر دلیلی (مثل شرایط جوی یا مشکل مجموعه) سانس برگزار نشود، وجه طبق قوانین مجموعه به‌صورت کامل برمی‌گردد.",
  },
  {
    q: "رزرو ثابت هفتگی برای تیم‌ها ممکن است؟",
    a: "بله. اگر تیم منظمی دارید، می‌توانید هر هفته همان روز و ساعت را رزرو کنید تا ساعت دلخواه‌تان قفل شود؛ سانس‌های آخر هفته زود پر می‌شوند پس جلوتر رزرو کنید.",
  },
]

const sportLinks = [
  { href: "/futsal-qom", label: "رزرو سالن فوتسال در قم" },
  { href: "/football-qom", label: "رزرو زمین چمن مصنوعی در قم" },
  { href: "/volleyball-qom", label: "رزرو سالن والیبال در قم" },
  { href: "/basketball-qom", label: "رزرو سالن بسکتبال در قم" },
]

export default function FaqPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main id="main-content" className="relative flex-1 pt-16">
        <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            سوالات پرتکرار
          </h1>
          <p className="mt-3 leading-8 text-muted-foreground">
            پاسخ رایج‌ترین سوال‌ها درباره رزرو آنلاین مجموعه‌های ورزشی قم در
            توپ‌سِت (ToopSet).
          </p>

          <Accordion type="single" collapsible className="mt-8 space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`item-${i}`}
                className="rounded-xl border bg-card px-4 last:border"
              >
                <AccordionTrigger className="text-base hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="leading-7 text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <section className="mt-12">
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">
              رزرو بر اساس رشته
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {sportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-xl border bg-card p-4 font-semibold transition-shadow hover:shadow-md"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/vendors">مشاهده همه مجموعه‌های قم</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/contact">ارتباط با ما</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
