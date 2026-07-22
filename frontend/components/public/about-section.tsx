import Link from "next/link"
import {
  Search,
  Star,
  ListChecks,
  Target,
  Eye,
  Building2,
  BarChart3,
  Clock,
  MessageSquare,
  ShieldCheck,
  Camera,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card"
import { toPersianDigits } from "@/lib/utils"

// ── Data ─────────────────────────────────────────────────────────────────────

const stats = [
  { kind: "number", value: 15, suffix: "+", label: "سالن ورزشی" },
  { kind: "number", value: 2000, suffix: "+", label: "کاربر فعال" },
  { kind: "number", value: 5000, suffix: "+", label: "رزرو موفق" },
  { kind: "string", value: "قم", label: "شهر فعال" },
] as const

const features = [
  {
    icon: Search,
    title: "جستجوی هوشمند",
    description: "مقایسه قیمت، موقعیت و امکانات سالن‌ها در یک نگاه",
  },
  {
    icon: Camera,
    title: "گالری تصاویر واقعی",
    description:
      "تصاویر واقعی از سالن، رختکن و سرویس بهداشتی توسط مدیران بارگذاری می‌شود",
  },
  {
    icon: Star,
    title: "نمره و نظر کاربران",
    description:
      "کاربران پس از هر بازی می‌توانند تجربه خود را با نمره و نظر ثبت کنند",
  },
  {
    icon: ListChecks,
    title: "چک‌لیست امکانات",
    description:
      "مشاهده کامل امکانات هر سالن: کفپوش استاندارد، پارکینگ، تهویه و آبسردکن",
  },
  {
    icon: ShieldCheck,
    title: "قفل هوشمند سانس",
    description:
      "اولین درخواست رزرو برنده است — سانس به محض رزرو برای دیگران قفل می‌شود",
  },
] as const

const managerBenefits = [
  { icon: Building2, title: "تعریف و مدیریت سالن و سانس‌ها" },
  { icon: BarChart3, title: "گزارش درآمد روزانه و ماهانه" },
  { icon: Clock, title: "مشاهده لحظه‌ای رزروهای امروز" },
  { icon: MessageSquare, title: "پاسخ به نظرات و مدیریت کیفیت" },
] as const

// ── Icons ────────────────────────────────────────────────────────────────────

function CardIcon({
  icon: Icon,
}: {
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
      <Icon className="size-5" />
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function AboutSection() {
  return (
    <section id="about-section" className="overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-4">
        {/* ═══ Header ═══ */}
        <div className="animate-fade-in pt-10 pb-8 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/80 px-4 py-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary/80" />
            درباره توپ‌سِت
          </div>

          <h2 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
            سامانه هوشمند رزرو
            <span className="text-primary"> سانس‌های ورزشی</span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-muted-foreground">
            توپ‌سِت یک سامانه آنلاین رزرو سانس ورزشی است که کاربران می‌توانند
            سالن‌های والیبال، بسکتبال، فوتسال و هندبال را بر اساس موقعیت، قیمت و
            امکانات مقایسه کرده و در لحظه سانس مورد نظر خود را رزرو کنند. مدیران
            سالن‌ها نیز ابزار کاملی برای مدیریت سانس‌ها، مشاهده درآمد و پاسخ به
            نظرات کاربران در اختیار دارند.
          </p>
        </div>

        {/* ═══ Stats ═══ */}
        <div className="pb-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <Card
                key={stat.label}
                className="animate-fade-in text-center"
                size="sm"
              >
                <CardContent className="py-2">
                  <div className="text-3xl font-bold tracking-tight">
                    {stat.kind === "string"
                      ? stat.value
                      : `${toPersianDigits(stat.value)}${stat.suffix}`}
                  </div>
                  <CardDescription className="mt-1">
                    {stat.label}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ═══ Mission & Vision ═══ */}
        <div className="pb-10">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="animate-fade-in h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CardIcon icon={Target} />
                  <CardTitle className="font-semibold">رسالت ما</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">
                  ما در توپ‌سِت می‌خواهیم تجربه رزرو سانس ورزشی را برای همه
                  آسان، شفاف و لذت‌بخش کنیم. دیگر هیچ تیمی نباید برای پیدا کردن
                  سالن مناسب سردرگم شود یا نگران دو‌باره رزرو شدن سانس باشد.
                </p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CardIcon icon={Eye} />
                  <CardTitle className="font-semibold">چشم‌انداز ما</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">
                  توپ‌سِت در تلاش است تا به اولین و کامل‌ترین سامانه رزرو آنلاین
                  سالن‌های ورزشی در ایران تبدیل شود، جایی که هر ورزشکاری بتواند
                  در هر شهر ایران، سالن مورد نظر خود را در چند ثانیه پیدا و رزرو
                  کند.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══ Features ═══ */}
        <div className="pb-10">
          <div className="animate-fade-in mb-10 text-center">
            <h3 className="text-2xl font-bold tracking-tight md:text-3xl">
              چرا توپ‌سِت؟
            </h3>
            <p className="mt-2 text-muted-foreground">
              امکاناتی که توپ‌سِت را از روش سنتی جدا می‌کند
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <Card
                  key={feature.title}
                  className="group animate-fade-in h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <CardHeader>
                    <div className="mb-2 flex items-center gap-3">
                      <CardIcon icon={Icon} />
                      <CardTitle className="font-semibold">
                        {feature.title}
                      </CardTitle>
                    </div>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>

        {/* ═══ For Managers ═══ */}
        <div className="pb-10">
          <div className="animate-fade-in mb-10 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary/80" />
              مدیران مجموعه
            </div>
            <h3 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
              مدیریت هوشمند سالن‌ها
            </h3>
            <p className="mx-auto max-w-xl leading-relaxed text-muted-foreground">
              مدیر سالن دیگر نیازی به پاسخگویی تلفنی، ثبت دستی رزروها، یا نگرانی
              از پر شدن دوگانه سانس‌ها ندارد. همه چیز آنلاین، خودکار و شفاف است.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {managerBenefits.map((benefit, i) => {
              const Icon = benefit.icon
              return (
                <Card
                  key={benefit.title}
                  className="group animate-fade-in h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <CardHeader className="items-center gap-3 max-sm:flex">
                    <CardIcon icon={Icon} />
                    <CardTitle>{benefit.title}</CardTitle>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>

        {/* ═══ CTA ═══ */}
        <div className="pb-16">
          <div className="animate-fade-in mx-auto max-w-2xl text-center">
            <h3 className="text-2xl font-bold tracking-tight md:text-3xl">
              آماده شروع هستی؟
            </h3>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              دیگر وقت خود را با تماس‌های تلفنی تلف نکن. در چند کلیک سانس مورد
              نظرت را پیدا کن و رزرو کن.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4">
              <Button asChild>
                <Link href="/login">ثبت‌نام رایگان</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/vendors">مشاهده سالن‌ها</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
