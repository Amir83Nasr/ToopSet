import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  SmartPhone01Icon,
  WhistleIcon,
  Calendar01Icon,
} from "@hugeicons/core-free-icons"
import { toPersianDigits } from "@/lib/utils"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

const goodPoints = [
  "رزرو آنلاین در چند ثانیه، بدون تماس تلفنی با مجموعه",
  "قفل هوشمند سانس: اولین درخواست برنده است",
  "قیمت، تصاویر و امکانات هر سالن شفاف و به‌روز",
  "نمره و نظر واقعی کاربران بعد از هر بازی",
  "بازگشت وجه شفاف طبق قوانین هر مجموعه",
] as const

const badPoints = [
  "زنگ زدن به چند مجموعه برای پیدا کردن سانس خالی",
  "نبودن تصویر و قیمت مشخص تا لحظه حضور",
  "رزرو حضوری یا واریز دستی و دردسر لغو",
  "نبودن امکان مقایسه سالن‌ها کنار هم",
  "پر شدن سانس بدون اطلاع در آخرین لحظه",
] as const

const steps = [
  {
    icon: SmartPhone01Icon,
    title: "جستجو",
    text: "مجموعه را با فیلتر رشته و ساعت پیدا کن",
  },
  {
    icon: Calendar01Icon,
    title: "رزرو",
    text: "سانس خالی را انتخاب کن و آنلاین پرداخت کن",
  },
  { icon: WhistleIcon, title: "بازی", text: "کد رزرو را نشان بده و بازی کن" },
] as const

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative border-y border-border/40 bg-linear-to-b from-muted/40 to-transparent py-14 md:py-20"
    >
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        {/* Section head */}
        <ScrollReveal>
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
            <span className="inline-block rounded-[8px] border border-primary/18 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              تفاوت توپ‌سِت
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              رزرو هوشمند، نه زنگ زدن به سرایداری
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              تجربه مدرن رزرو سانس‌های ورزشی در برابر روش سنتی.
            </p>
          </div>
        </ScrollReveal>

        {/* Duo comparison */}
        <ScrollReveal stagger={0.12} className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border bg-card p-6 shadow-sm">
            <header className="mb-4 flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl border border-primary/18 bg-primary/6 text-primary">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                با توپ‌سِت
              </h3>
            </header>
            <ul className="flex flex-col gap-2.5">
              {goodPoints.map((point) => (
                <li
                  key={point}
                  className="relative pr-6 text-sm leading-6 text-muted-foreground"
                >
                  <span className="absolute top-1 right-0 flex size-4 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      strokeWidth={2.25}
                      className="size-3"
                    />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border bg-card p-6 shadow-sm">
            <header className="mb-4 flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/6 text-destructive">
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                روش سنتی
              </h3>
            </header>
            <ul className="flex flex-col gap-2.5">
              {badPoints.map((point) => (
                <li
                  key={point}
                  className="relative pr-6 text-sm leading-6 text-muted-foreground"
                >
                  <span className="absolute top-1 right-0 flex size-4 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      strokeWidth={2.25}
                      className="size-3"
                    />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </article>
        </ScrollReveal>

        {/* 3-step strip */}
        <ScrollReveal stagger={0.1} className="mt-8 grid gap-3 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <div
              key={title}
              className="flex items-center gap-3 rounded-2xl border bg-card/50 p-4"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={Icon} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  <span className="text-primary">
                    {toPersianDigits(String(i + 1).padStart(2, "0"))}.
                  </span>{" "}
                  {title}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </ScrollReveal>
      </div>
    </section>
  )
}
