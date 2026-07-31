import Link from "next/link"
import { Search, Star, ListChecks, ShieldCheck, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

// ── Data ─────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Search,
    title: "جستجوی هوشمند",
    description: "مقایسه قیمت، موقعیت و امکانات مجموعه‌ها در یک نگاه",
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
        {/* ═══ Features ═══ */}
        <div className="pt-10 pb-10">
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
                <Link href="/vendors">مشاهده مجموعه‌ها</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
