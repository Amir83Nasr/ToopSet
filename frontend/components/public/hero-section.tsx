"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Background animated webp layer */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/output.webp')" }}
      />

      <div className="mx-auto max-w-7xl px-4 py-20 md:py-28 lg:py-36">
        <div className="animate-fade-in mx-auto flex max-w-2xl flex-col items-center gap-7 text-center">
          <h1 className="rounded-3xl border border-foreground/10 bg-background/35 px-6 py-5 text-3xl leading-tight font-bold text-foreground shadow-lg backdrop-blur-lg sm:px-10 sm:text-4xl sm:leading-snug lg:text-5xl lg:leading-normal">
            سامانه رزرو آنلاین
            <br />
            <span className="font-bold text-primary">مجموعه‌های ورزشی</span>
          </h1>

          <Button
            size="lg"
            asChild
            className="cta-shine animate-cta-glow mt-8 h-12 w-full rounded-xl px-10 text-lg font-bold sm:mt-0 sm:w-auto"
          >
            <Link href="/vendors" prefetch>
              مشاهده مجموعه‌های ورزشی
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
