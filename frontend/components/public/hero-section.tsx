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

      <div className="mx-auto flex max-w-7xl flex-col px-4 pt-4 pb-4 md:pt-8 md:pb-4 lg:pt-12 lg:pb-8">
        <div className="animate-fade-in mt-16 flex flex-col items-end gap-7 text-right sm:items-center sm:text-center md:mt-16 lg:mt-20">
          <h1 className="me-6 max-w-2xl text-xl leading-tight font-bold text-white sm:me-0 sm:text-2xl sm:leading-snug lg:text-3xl lg:leading-normal">
            سامانه رزرو آنلاین
            <br />
            <span className="font-bold text-white">مجموعه‌های ورزشی</span>
          </h1>

          <Button
            size="lg"
            asChild
            className="cta-shine animate-cta-glow -mt-2 h-10 w-1/3 translate-x-3 rounded-xl px-2 text-xs font-bold whitespace-nowrap"
          >
            <Link href="/vendors" prefetch>
              همین حالا رزرو کن
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
