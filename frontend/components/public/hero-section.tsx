"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Map, CalendarPlus, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const trustPoints = [
  "رزرو آنلاین در چند ثانیه",
  "قفل هوشمند سانس",
  "تصاویر و نظرات واقعی",
] as const

export function HeroSection() {
  const router = useRouter()

  return (
    <section>
      <div className="mx-auto max-w-7xl px-4 py-14 md:py-20 lg:py-24">
        <div className="animate-fade-in mx-auto max-w-2xl text-center">
          <div className="space-y-6">
            {/* Top badge — centered */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/4 px-4 py-2 text-[10px] font-bold text-muted-foreground backdrop-blur-sm sm:text-xs">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              <span>سامانه هوشمند رزرو آنلاین مجموعه‌های ورزشی</span>
            </div>

            <h1 className="text-3xl leading-tight font-black text-foreground sm:text-4xl sm:leading-snug lg:text-5xl lg:leading-normal">
              پلتفرم هوشمند رزرو
              <br />
              <span className="font-black text-primary">مجموعه‌های ورزشی</span>
            </h1>

            <p className="mx-auto max-w-md text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              سانس مورد نظرت را در مجموعه‌های ورزشی قم پیدا کن و آنلاین رزرو کن؛
              بدون تماس تلفنی و اتلاف وقت.
            </p>

            {/* Action buttons — 40px */}
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Button
                size="lg"
                onClick={() => router.push("/vendors")}
                className="h-10 w-full rounded-lg px-6 text-base font-semibold shadow-sm sm:w-auto"
              >
                <Map className="size-5 shrink-0" />
                مشاهده مجموعه‌های ورزشی
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-10 w-full rounded-lg px-6 text-base font-semibold sm:w-auto"
              >
                <Link href="/login">
                  <CalendarPlus className="size-5 shrink-0" />
                  ثبت‌نام رایگان
                </Link>
              </Button>
            </div>

            {/* Trust strip */}
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-1">
              {trustPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm"
                >
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
