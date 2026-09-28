"use client"

import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  CheckmarkCircle01Icon,
  SecurityLockIcon,
  Camera01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

// ── DATA ──────────────────────────────────────────────────────────────────────

const trustPoints = [
  { icon: CheckmarkCircle01Icon, label: "رزرو آنلاین در چند ثانیه" },
  { icon: SecurityLockIcon, label: "سانس قطعی، بدون تداخل" },
  { icon: Camera01Icon, label: "تصاویر و نظرات واقعی" },
] as const

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24">
      <div className="animate-fade-in mx-auto max-w-[1120px] px-4 text-center md:px-6">
        <div className="space-y-7">
          {/* Eyebrow pill — pulsing live dot */}
          <div className="mb-7">
            <div className="inline-flex items-center gap-2.5 rounded-md border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary sm:text-[13px]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              سامانه هوشمند رزرو آنلاین مجموعه‌های ورزشی قم
            </div>
          </div>

          {/* Headline */}
          <h1 className="mx-auto mb-5 max-w-[25ch] text-[clamp(30px,5vw,52px)] leading-[1.4] font-bold tracking-tight text-balance text-foreground sm:max-w-none sm:whitespace-nowrap">
            پلتفرم هوشمند رزرو مجموعه‌های ورزشی
          </h1>

          <p className="mx-auto mb-9 max-w-[60ch] text-[clamp(15px,1.7vw,18px)] leading-[1.9] text-muted-foreground">
            با توپ‌سِت مجموعه ورزشی موردنظرت را با تصاویر، قیمت و{" "}
            <strong className="font-semibold text-foreground">
              نظرات واقعی
            </strong>{" "}
            پیدا کن،{" "}
            <strong className="font-semibold text-foreground">سانس خالی</strong>{" "}
            را انتخاب کن و به‌صورت{" "}
            <strong className="font-semibold text-foreground">آنلاین</strong>{" "}
            رزرو کن؛ بدون اتلاف وقت و{" "}
            <strong className="font-semibold text-foreground">
              تماس تلفنی
            </strong>
            .
          </p>

          {/* Edge-to-edge CTA row */}
          <div className="flex flex-col items-center justify-center gap-3 pt-1 sm:flex-row sm:flex-wrap sm:gap-4">
            <Button size="lg" asChild className="w-full px-10 sm:w-auto">
              <Link href="/vendors" prefetch>
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
                جستجوی مجموعه‌های ورزشی
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="w-full px-10 sm:w-auto"
            >
              <Link href="/login">ثبت‌نام رایگان</Link>
            </Button>
          </div>

          {/* Trust points */}
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {trustPoints.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground sm:text-[13px]"
              >
                <HugeiconsIcon
                  icon={Icon}
                  strokeWidth={1.75}
                  className="size-4 shrink-0 text-primary"
                />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
