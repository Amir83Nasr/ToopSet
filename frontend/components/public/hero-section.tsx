"use client"

import { useRouter } from "next/navigation"
import { Map } from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

const HeroAnimatedIllustration = dynamic(
  () =>
    import("@/components/public/hero-illustration-v2").then((m) => ({
      default: m.HeroAnimatedIllustration,
    })),
  { ssr: false }
)

export function HeroSection() {
  const router = useRouter()

  return (
    <section className="relative overflow-hidden py-6 md:py-12">
      <div className="relative z-10 mx-auto max-w-7xl px-4 text-right">
        {/* Split layout */}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            {/* Top badge — mounted entrance via CSS */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/4 px-4 py-2 text-[10px] font-bold text-muted-foreground backdrop-blur-sm sm:text-xs">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              <span>سامانه هوشمند رزرو آنلاین مجموعه‌های ورزشی</span>
            </div>

            <h1 className="text-3xl leading-tight font-extrabold text-foreground sm:text-4xl sm:leading-snug lg:text-5xl lg:leading-normal">
              پلتفرم هوشمند رزرو
              <br />
              <span className="font-extrabold text-primary">
                مجموعه‌های ورزشی
              </span>
            </h1>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
              <Button
                size="lg"
                onClick={() => router.push("/vendors")}
                className="h-12 w-full rounded-lg px-6 text-base font-semibold shadow-sm sm:w-auto"
              >
                <Map className="size-5 shrink-0" />
                <span>مشاهده مجموعه‌های ورزشی</span>
              </Button>
              <p className="text-sm font-semibold text-foreground sm:text-base">
                برای دیدن مجموعه های ورزشی و رزرو سانس کلیک کن
              </p>
            </div>
          </div>

          {/* Left side illustration */}
          <div className="hidden w-full lg:flex lg:justify-end">
            <div className="scale-110 lg:origin-left lg:scale-[1.35]">
              <HeroAnimatedIllustration />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
