"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    /* The banner is a permanently dark surface — the `dark` class keeps
       every token (foreground, primary, muted-foreground…) on its dark
       value in both themes, so the same photo + white text works in
       light and dark mode alike. */
    <section className="dark relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden">
      <Image
        src="/images/homepage.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {/* Scrim — keeps the text in front of the photo readable even over
          the brightest patches of the illustration */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/50 to-black/60"
      />
      <div className="mx-auto w-full max-w-7xl px-4 py-14 md:py-20 lg:py-24">
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

            <h1 className="text-3xl leading-tight font-bold text-foreground sm:text-4xl sm:leading-snug lg:text-5xl lg:leading-normal">
              پلتفرم هوشمند رزرو
              <br />
              <span className="font-bold text-primary">مجموعه‌های ورزشی</span>
            </h1>

            {/* Primary CTA — 48px */}
            <Button
              size="lg"
              asChild
              className="h-12 w-full rounded-lg px-8 text-lg font-bold shadow-lg sm:w-auto"
            >
              <Link href="/vendors" prefetch>
                مشاهده مجموعه‌های ورزشی
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
