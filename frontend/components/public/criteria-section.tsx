import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { toPersianDigits } from "@/lib/utils"

// ── Data ─────────────────────────────────────────────────────────────────────

const criteria = [
  {
    title: "فهرست قیمت شفاف",
    description:
      "قیمت هر سانس قبل از رزرو مشخص است؛ بدون هزینه پنهان و تفاوت سرراه.",
  },
  {
    title: "نظرات واقعی کاربران",
    description:
      "بازیکن‌های قبلی کیفیت زمین، رختکن و برخورد مدیر را نمره و نظر می‌دهند.",
  },
  {
    title: "کیفیت کفپوش و امکانات",
    description:
      "نوع کفپوش، تهویه، روشنایی و امکاناتی مثل پارکینگ و آبسردکن در یک نگاه.",
  },
  {
    title: "موقعیت و دسترسی",
    description:
      "محله، فاصله و مسیر دسترسی مجموعه قبل از انتخابت روی نقشه مشخص است.",
  },
  {
    title: "قوانین لغو و بازگشت وجه",
    description:
      "قوانین واضح ابطال سانس و بازگشت اولیه یا کامل وجه در صفحه رزرو نمایش داده می‌شود.",
  },
  {
    title: "پشتیبانی پاسخگو",
    description: "در صورت هر مشکل در رزرو یا پرداخت، تیم توپ‌سِت در دسترس است.",
  },
] as const

// ── Component ────────────────────────────────────────────────────────────────

export function CriteriaSection() {
  return (
    <section id="criteria-section" className="py-14 md:py-20">
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        {/* Section head */}
        <ScrollReveal>
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
            <span className="inline-block rounded-[8px] border border-primary/18 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              معیار انتخاب سالن
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              چطور سالن خوب انتخاب کنیم؟
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              شش معیار اصلی که با دیدن شان قبل از رزرو، انتخاب مطمئن‌تری داری.
            </p>
          </div>
        </ScrollReveal>

        {/* Numbered criteria cards (basalam .ccard) */}
        <ScrollReveal
          stagger={0.08}
          className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>div]:h-full"
        >
          {criteria.map(({ title, description }, i) => (
            <article
              key={title}
              className="relative h-full overflow-hidden rounded-2xl border bg-linear-to-b from-card to-card/40 p-6 shadow-sm"
            >
              {/* Corner glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(400px 120px at 100% 0%, var(--color-primary) 8%, transparent 70%)",
                  opacity: 0.06,
                }}
              />
              <span className="mb-4 block text-xs tracking-[0.04em] text-muted-foreground">
                {toPersianDigits(String(i + 1).padStart(2, "0"))}
              </span>
              <h3 className="text-[15px] font-semibold text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </ScrollReveal>
      </div>
    </section>
  )
}
