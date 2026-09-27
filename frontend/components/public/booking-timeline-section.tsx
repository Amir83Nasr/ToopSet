import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { toPersianDigits } from "@/lib/utils"

// ── Data ─────────────────────────────────────────────────────────────────────

const phases = [
  {
    title: "جستجوی مجموعه",
    text: "مجموعه موردنظرت را با فیلتر رشته، ساعت و محله پیدا کن و امکانات و قیمت را مقایسه کن.",
  },
  {
    title: "انتخاب سانس خالی",
    text: "روز و ساعت خالی مجموعه را ببین و سانس دلخواهت را برای قفل شدن انتخاب کن.",
  },
  {
    title: "پرداخت آنلاین",
    text: "با درگاه بانکی امن پرداخت کن؛ کد رزرو بلافاصله صادر و سانس برای تو قفل می‌شود.",
  },
  {
    title: "بازی و ثبت نظر",
    text: "سر وقت برو و بازی کن؛ بعد از بازی با نمره و نظر به بقیه کمک کن.",
  },
] as const

// ── Component ────────────────────────────────────────────────────────────────

export function BookingTimelineSection() {
  return (
    <section
      id="booking-timeline-section"
      className="relative border-y border-border/40 bg-linear-to-b from-muted/40 to-transparent py-14 md:py-20"
    >
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        {/* Section head */}
        <ScrollReveal>
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
            <span className="inline-block rounded-[8px] border border-primary/18 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              مراحل رزرو
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              از جستجو تا بازی
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              چهار قدم ساده تا داشتن سانس رزروشده؛ بدون تماس تلفنی.
            </p>
          </div>
        </ScrollReveal>

        {/* Phase rows (basalam .tl) */}
        <div className="mx-auto flex max-w-[880px] flex-col gap-4">
          {phases.map(({ title, text }, i) => (
            <ScrollReveal key={title}>
              <div className="relative rounded-2xl border bg-card p-6 pr-16 shadow-sm">
                <span className="absolute top-7 right-6 flex size-2.5 rounded-full bg-primary shadow-[0_0_0_4px] shadow-primary/15" />
                <span className="mb-2 block text-[11px] tracking-[0.03em] text-muted-foreground">
                  گام {toPersianDigits(String(i + 1))}
                </span>
                <h3 className="text-base font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {text}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
