"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import { buildVendorImageUrl } from "@/lib/api"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { toPersianDigits } from "@/lib/utils"
import { ImageLightbox } from "@/components/ui/image-lightbox"
import {
  Stars,
  formatPrice,
  sportColors,
  sportLabels,
} from "@/components/vendors/vendor-shared"

interface VendorHeroGalleryProps {
  images: string[]
  vendorName: string
  vendorId: number
  sportTypes: string[]
  averageRating: number
  reviewsTotal: number
  minPrice: number | null
}

export function VendorHeroGallery({
  images,
  vendorName,
  sportTypes,
  averageRating,
  reviewsTotal,
  minPrice,
}: VendorHeroGalleryProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const hasImages = images && images.length > 0

  const onSelect = useCallback(() => {
    if (!api) return
    setActiveIndex(api.selectedScrollSnap())
  }, [api])

  function openLightbox(index: number) {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  /* ── No images: gradient fallback ── */
  if (!hasImages) {
    return (
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-linear-to-br from-primary/20 via-primary/10 to-chart-2/20">
        <div className="relative z-10 flex min-h-80 flex-col justify-end px-8 pt-20 pb-8">
          {/* Sport badges */}
          {sportTypes.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {sportTypes.map((st) => (
                <Badge
                  key={st}
                  variant="secondary"
                  className={sportColors[st] || ""}
                >
                  {sportLabels[st] || st}
                </Badge>
              ))}
            </div>
          )}

          <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {vendorName}
          </h1>

          <div className="flex items-center gap-3">
            <Stars rating={averageRating} size={16} />
            <span className="text-sm font-semibold">
              {toPersianDigits(averageRating.toFixed(1))}
            </span>
            {reviewsTotal > 0 && (
              <span className="text-sm text-muted-foreground">
                ({toPersianDigits(reviewsTotal)} نظر)
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="group relative mb-8 overflow-hidden rounded-3xl border">
        <Carousel
          className="w-full"
          setApi={setApi}
          opts={{ loop: true, align: "start" }}
          onSelect={onSelect}
        >
          <CarouselContent>
            {images.map((img, i) => (
              <CarouselItem key={i}>
                <div
                  className="relative aspect-21/9 min-h-80 cursor-pointer sm:min-h-100 lg:min-h-120"
                  onClick={() => openLightbox(i)}
                >
                  <Image
                    src={buildVendorImageUrl(img)}
                    alt={`${vendorName} - ${i + 1}`}
                    fill
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    className="object-cover transition-all duration-700 group-hover:scale-[1.02]"
                    priority={i === 0}
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = "none"
                      const parent = target.parentElement
                      if (parent) {
                        parent.classList.add("bg-muted")
                        const fallback = document.createElement("div")
                        fallback.className =
                          "flex h-full items-center justify-center"
                        fallback.innerHTML =
                          '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground/30"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                        parent.prepend(fallback)
                      }
                    }}
                  />
                  {/* Multi-layer gradient overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-background via-background/10 to-transparent" />
                  <div className="absolute inset-0 bg-linear-to-r from-background/40 via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-linear-to-b from-background/10 via-transparent to-background/60" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* ── Hero overlay content ── */}
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 sm:p-8 lg:p-10">
            {/* Top row: sport badges */}
            <div className="pointer-events-auto flex flex-wrap gap-2">
              {sportTypes.map((st) => (
                <Badge
                  key={st}
                  variant="secondary"
                  className={`border-0 shadow-lg backdrop-blur-md ${sportColors[st] || ""}`}
                >
                  {sportLabels[st] || st}
                </Badge>
              ))}
            </div>

            {/* Bottom row: name + rating + price */}
            <div className="pointer-events-auto flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
                  {vendorName}
                </h1>
                <div className="flex items-center gap-3">
                  <Stars rating={averageRating} size={16} />
                  <span className="text-sm font-semibold text-white/90">
                    {toPersianDigits(averageRating.toFixed(1))}
                  </span>
                  {reviewsTotal > 0 && (
                    <span className="text-sm text-white/70">
                      ({toPersianDigits(reviewsTotal)} نظر)
                    </span>
                  )}
                </div>
              </div>

              {minPrice && (
                <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-center backdrop-blur-xl">
                  <p className="text-[11px] font-medium text-white/70">
                    قیمت هر سانس از
                  </p>
                  <p className="text-2xl font-bold text-white drop-shadow-sm">
                    {formatPrice(minPrice)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Carousel nav arrows ── */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon-lg"
                onClick={() => api?.scrollNext()}
                className="absolute top-1/2 right-4 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 text-white opacity-0 shadow-lg backdrop-blur-md group-hover:opacity-100 hover:bg-white/20"
              >
                <ChevronRight className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                onClick={() => api?.scrollPrev()}
                className="absolute top-1/2 left-4 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 text-white opacity-0 shadow-lg backdrop-blur-md group-hover:opacity-100 hover:bg-white/20"
              >
                <ChevronLeft className="size-5" />
              </Button>
            </>
          )}
        </Carousel>

        {/* ── Thumbnail strip ── */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 py-2 backdrop-blur-md">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => api?.scrollTo(i)}
                  className={`relative size-8 overflow-hidden rounded-full border-2 transition-all ${
                    i === activeIndex
                      ? "border-white shadow-md shadow-white/20"
                      : "border-transparent opacity-60 hover:opacity-90"
                  }`}
                >
                  <Image
                    src={buildVendorImageUrl(img)}
                    alt=""
                    fill
                    className="object-cover"
                    onError={(e) => {
                      ;(e.currentTarget as HTMLElement).style.display = "none"
                    }}
                  />
                </button>
              ))}
              <span className="mr-1 text-[11px] font-medium text-white/80">
                {toPersianDigits(activeIndex + 1)}/
                {toPersianDigits(images.length)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      <ImageLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={images}
        vendorName={vendorName}
        lightboxIndex={lightboxIndex}
        setLightboxIndex={setLightboxIndex}
      />
    </>
  )
}

/** @deprecated Use VendorHeroGallery instead — simple carousel without hero overlay */
export function VendorImageGallery({
  images,
  vendorName,
}: {
  images: string[]
  vendorName: string
}) {
  if (!images || images.length === 0) return null
  return (
    <div className="group relative mb-8 overflow-hidden rounded-2xl border">
      <Carousel className="w-full">
        <CarouselContent>
          {images.map((img, i) => (
            <CarouselItem key={i}>
              <div className="relative aspect-21/9 cursor-pointer">
                <Image
                  src={img}
                  alt={`${vendorName} - ${i + 1}`}
                  fill
                  className="object-cover"
                  priority={i === 0}
                  onError={(e) => {
                    const target = e.currentTarget
                    target.style.display = "none"
                    const parent = target.parentElement
                    if (parent) {
                      parent.classList.add("bg-muted")
                      const fallback = document.createElement("div")
                      fallback.className =
                        "flex h-full items-center justify-center"
                      fallback.innerHTML =
                        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground/30"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                      parent.prepend(fallback)
                    }
                  }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious className="absolute top-1/2 right-4 size-10 -translate-y-1/2 border-0 bg-white/20 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white/30" />
            <CarouselNext className="absolute top-1/2 left-4 size-10 -translate-y-1/2 border-0 bg-white/20 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white/30" />
          </>
        )}
      </Carousel>
    </div>
  )
}
