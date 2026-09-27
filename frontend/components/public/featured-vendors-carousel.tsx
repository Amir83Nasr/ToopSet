"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"
import Autoplay from "embla-carousel-autoplay"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from "@/components/ui/carousel"
import { VendorCardSkeleton } from "@/components/vendors/vendor-card-skeleton"
import { VendorCard, type Vendor } from "@/components/vendors/vendor-card"

const FEATURED_LIMIT = 9
const AUTOPLAY_DELAY = 4000

// Module-level so the single instance survives re-renders without ref access in render
const autoplayPlugin = Autoplay({
  delay: AUTOPLAY_DELAY,
  stopOnInteraction: false,
  stopOnMouseEnter: true,
})

export function FeaturedVendorsCarousel() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFeatured = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(FEATURED_LIMIT),
        is_active: "true",
        sort: "rating",
      })
      const res = await api<{ vendors: Vendor[]; total: number }>(
        `/api/v1/vendors?${params.toString()}`
      )
      setVendors(res.vendors || [])
    } catch {
      // API may not be available — section hides itself
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchFeatured(), 0)
    return () => clearTimeout(timer)
  }, [fetchFeatured])

  // Nothing to feature — don't render an empty section
  if (!loading && vendors.length === 0) return null

  return (
    <section className="relative isolate overflow-hidden py-8 md:py-10">
      {/* Soft white-blue themed backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-primary/5 to-background"
      />

      <div className="mx-auto max-w-7xl sm:px-4">
        {/* Blue panel — full-bleed on mobile, rounded card on larger screens */}
        <div className="relative overflow-hidden rounded-none bg-primary sm:rounded-3xl">
          {/* Panel header — title right, CTA left */}
          <div className="relative flex items-center justify-between gap-3 p-3.5 pb-0 sm:p-5 sm:pb-0">
            <h2 className="flex items-center gap-1 text-sm font-bold text-primary-foreground sm:text-base">
              <Sparkles className="size-3.5" />
              مجموعه‌های برتر
            </h2>
            <Link
              href="/vendors"
              prefetch
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-foreground/90 transition-colors hover:text-primary-foreground"
            >
              مشاهده بیشتر
              <ArrowLeft className="size-3" />
            </Link>
          </div>

          {/* Carousel */}
          <Carousel
            opts={{ direction: "rtl", align: "start", loop: true }}
            plugins={[autoplayPlugin]}
            className="relative p-3.5 sm:p-5"
          >
            <CarouselContent className="-ms-2.5">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <CarouselItem
                      key={i}
                      className="basis-full ps-2.5 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                    >
                      <VendorCardSkeleton />
                    </CarouselItem>
                  ))
                : vendors.map((vendor) => (
                    <CarouselItem
                      key={vendor.id}
                      className="basis-full ps-2.5 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                    >
                      <VendorCard vendor={vendor} />
                    </CarouselItem>
                  ))}
            </CarouselContent>

            {/* Desktop arrows */}
            <CarouselPrevious className="absolute -start-2 top-1/2 size-7 -translate-y-1/2 border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground shadow-md backdrop-blur-sm hover:bg-primary-foreground/25 hover:text-primary-foreground md:-start-2.5 [&_svg]:size-3" />
            <CarouselNext className="absolute -end-2 top-1/2 size-7 -translate-y-1/2 border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground shadow-md backdrop-blur-sm hover:bg-primary-foreground/25 hover:text-primary-foreground md:-end-2.5 [&_svg]:size-3" />

            <CarouselDots />
          </Carousel>
        </div>
      </div>
    </section>
  )
}

/** Slide indicator dots — swipe/scroll affordance for touch users. Lives inside <Carousel>. */
function CarouselDots() {
  const { api } = useCarousel()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [snapCount, setSnapCount] = useState(0)

  useEffect(() => {
    if (!api) return

    const onSelect = () => setSelectedIndex(api.selectedScrollSnap())
    const onReInit = () => {
      setSnapCount(api.scrollSnapList().length)
      onSelect()
    }

    onReInit()
    api.on("select", onSelect)
    api.on("reInit", onReInit)

    return () => {
      api.off("select", onSelect)
      api.off("reInit", onReInit)
    }
  }, [api])

  if (snapCount < 2) return null

  return (
    <div className="mt-3 flex justify-center gap-1">
      {Array.from({ length: snapCount }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "h-1 rounded-full transition-all duration-300",
            i === selectedIndex
              ? "w-3.5 bg-primary-foreground"
              : "w-1 bg-primary-foreground/30"
          )}
        />
      ))}
    </div>
  )
}
