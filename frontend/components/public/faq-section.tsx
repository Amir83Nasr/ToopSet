import Link from "next/link"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { faqs } from "@/lib/faq-data"

export function FaqSection() {
  return (
    <section
      id="faq-section"
      className="relative border-y border-border/40 bg-linear-to-b from-muted/40 to-transparent py-14 md:py-20"
    >
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        <ScrollReveal>
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
            <span className="inline-block rounded-[8px] border border-primary/18 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              پرسش‌های رایج
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              سوالات پرتکرار
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              پاسخ رایج‌ترین سوال‌ها درباره رزرو آنلاین مجموعه‌های ورزشی قم.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <Accordion
            type="single"
            collapsible
            className="mx-auto max-w-3xl space-y-2"
          >
            {faqs.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`item-${i}`}
                className="rounded-xl border bg-card px-4 last:border"
              >
                <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-3 text-sm leading-7 text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>

        <div className="mt-6 flex justify-center">
          <Button variant="outline" size="sm" asChild>
            <Link href="/faq">مشاهده همه پرسش‌ها</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
