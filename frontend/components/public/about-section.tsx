import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  Camera01Icon,
  StarIcon,
  Shield01Icon,
  CreditCardAcceptIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

// ── Data ─────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Search01Icon,
    title: "جستجوی هوشمند",
    description: "مقایسه قیمت، موقعیت و امکانات مجموعه‌ها در یک نگاه",
  },
  {
    icon: Camera01Icon,
    title: "گالری تصاویر واقعی",
    description:
      "تصاویر واقعی از سالن، رختکن و سرویس بهداشتی توسط مدیران بارگذاری می‌شود",
  },
  {
    icon: StarIcon,
    title: "نمره و نظر کاربران",
    description:
      "کاربران پس از هر بازی می‌توانند تجربه خود را با نمره و نظر ثبت کنند",
  },
  {
    icon: Shield01Icon,
    title: "قفل هوشمند سانس",
    description:
      "اولین درخواست رزرو برنده است — سانس به محض رزرو برای دیگران قفل می‌شود",
  },
  {
    icon: CreditCardAcceptIcon,
    title: "پرداخت آنلاین امن",
    description: "پرداخت از طریق درگاه بانکی، صدور فوری کد رزرو و ابطال آنلاین",
  },
  {
    icon: Clock01Icon,
    title: "رزرو ۲۴ ساعته",
    description: "بدون نیاز به تماس تلفنی و حضور در مجموعه",
  },
] as const

// ── Component ────────────────────────────────────────────────────────────────

export function AboutSection() {
  return (
    <section id="about-section" className="py-14 md:py-20">
      <div className="mx-auto max-w-[1120px] px-4 md:px-6">
        {/* Section head */}
        <ScrollReveal>
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
            <span className="inline-block rounded-[8px] border border-primary/18 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              قابلیت‌ها
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              چرا توپ‌سِت؟
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
              امکاناتی که توپ‌سِت را از روش سنتی جدا می‌کند
            </p>
          </div>
        </ScrollReveal>

        {/* Feature cards (basalam .feat) */}
        <ScrollReveal
          stagger={0.07}
          className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>div]:h-full"
        >
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="group h-full rounded-2xl border bg-card p-6 shadow-sm transition-colors hover:border-border/60"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-primary/18 bg-primary/6 text-primary transition-colors group-hover:bg-primary/10">
                <HugeiconsIcon icon={Icon} strokeWidth={1.75} />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </ScrollReveal>
      </div>
    </section>
  )
}
