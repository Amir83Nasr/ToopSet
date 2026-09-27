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
import { faqs } from "@/lib/faq-data"

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
