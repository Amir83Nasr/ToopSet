"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, ChevronRight, ChevronLeft } from "lucide-react"
import { toPersianDigits } from "@/lib/utils"
import { FavoriteButton } from "@/components/courts/favorite-button"
import {
  Stars,
  formatPrice,
  sportColors,
  sportLabels,
} from "@/components/courts/court-shared"

interface CourtHeroGalleryProps {
  images: string[]
  courtName: string
  courtId: number
  sportTypes: string[]
  averageRating: number
  reviewsTotal: number
  minPrice: number | null
}

export function CourtHeroGallery({
  images,
  courtName,
  courtId,
  sportTypes,
  averageRating,
  reviewsTotal,
  minPrice,
}: CourtHeroGalleryProps) {
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
            {courtName}
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
                    src={img}
                    alt={`${courtName} - ${i + 1}`}
                    fill
                    className="object-cover transition-all duration-700 group-hover:scale-[1.02]"
                    unoptimized
                    priority={i === 0}
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
            {/* Top row: sport badges + favorite */}
            <div className="pointer-events-auto flex items-start justify-between gap-4">
              <div className="flex flex-wrap gap-2">
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
              <FavoriteButton courtId={courtId} size="sm" />
            </div>

            {/* Bottom row: name + rating + price */}
            <div className="pointer-events-auto flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
                  {courtName}
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
                size="icon"
                onClick={() => api?.scrollPrev()}
                className="absolute top-1/2 right-4 z-20 size-10 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 text-white opacity-0 shadow-lg backdrop-blur-md group-hover:opacity-100 hover:bg-white/20"
              >
                <ChevronRight className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => api?.scrollNext()}
                className="absolute top-1/2 left-4 z-20 size-10 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 text-white opacity-0 shadow-lg backdrop-blur-md group-hover:opacity-100 hover:bg-white/20"
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
                    src={img}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
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
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-w-[90vw] border-0 bg-black/95 p-0 sm:max-w-4xl"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">تصاویر {courtName}</DialogTitle>
          <div className="relative flex aspect-video items-center justify-center">
            {images[lightboxIndex] && (
              <Image
                src={images[lightboxIndex]}
                alt={`${courtName} - ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                unoptimized
              />
            )}
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 left-3 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              >
                <X className="size-4" />
              </Button>
            </DialogClose>
            {lightboxIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute right-3 size-10 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              >
                <ChevronRight className="size-5" />
              </Button>
            )}
            {lightboxIndex < images.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute left-3 size-10 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              >
                <ChevronLeft className="size-5" />
              </Button>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xs">
              {toPersianDigits(lightboxIndex + 1)} /{" "}
              {toPersianDigits(images.length)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** @deprecated Use CourtHeroGallery instead — simple carousel without hero overlay */
export function CourtImageGallery({
  images,
  courtName,
}: {
  images: string[]
  courtName: string
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
                  alt={`${courtName} - ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                  priority={i === 0}
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
