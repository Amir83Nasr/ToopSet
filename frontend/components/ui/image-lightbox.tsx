"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { buildVendorImageUrl } from "@/lib/api"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { toPersianDigits } from "@/lib/utils"

interface ImageLightboxProps {
  open: boolean
  onClose: () => void
  images: string[]
  vendorName: string
  lightboxIndex: number
  setLightboxIndex: (index: number | ((prev: number) => number)) => void
}

export function ImageLightbox({
  open,
  onClose,
  images,
  vendorName,
  lightboxIndex,
  setLightboxIndex,
}: ImageLightboxProps) {
  const [api, setApi] = useState<CarouselApi>()

  // ── Mobile back-button: closes the lightbox instead of leaving the page ──
  useEffect(() => {
    if (!open) return
    window.history.pushState({ lightbox: true }, "")
    const handlePop = () => onClose()
    window.addEventListener("popstate", handlePop)
    return () => {
      window.removeEventListener("popstate", handlePop)
      // If we closed via the X / backdrop (not the back button), consume the
      // history entry we pushed so a later Back press doesn't skip a route.
      if (window.history.state?.lightbox) {
        window.history.back()
      }
    }
  }, [open, onClose])

  // ── Sync the counter with the carousel position (drag / swipe / arrows) ──
  useEffect(() => {
    if (!api) return
    const onSelect = () => setLightboxIndex(api.selectedScrollSnap())
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api, setLightboxIndex])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 z-9999 max-w-none translate-x-0! translate-y-0! gap-0 rounded-none border-none bg-black/95 p-0 ring-0 md:inset-auto md:inset-s-1/2 md:top-1/2 md:max-w-[85vw] md:-translate-x-1/2! md:-translate-y-1/2! md:rounded-xl"
      >
        <DialogTitle className="sr-only">تصاویر {vendorName}</DialogTitle>
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden md:h-[80vh]">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 flex size-8 items-center justify-center rounded-full bg-black/60 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
            aria-label="بستن"
          >
            <X className="size-4" />
          </button>

          {/* Counter */}
          <span className="absolute top-3 left-3 z-20 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white/70">
            {toPersianDigits(lightboxIndex + 1)} /{" "}
            {toPersianDigits(images.length)}
          </span>

          {/* Prev — right side */}
          {images.length > 1 && (
            <button
              onClick={() => api?.scrollPrev()}
              className="absolute right-3 z-20 flex size-10 items-center justify-center rounded-full bg-black/60 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
              aria-label="قبلی"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          {/* Next — left side */}
          {images.length > 1 && (
            <button
              onClick={() => api?.scrollNext()}
              className="absolute left-3 z-20 flex size-10 items-center justify-center rounded-full bg-black/60 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
              aria-label="بعدی"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {/* Swipeable / draggable image track */}
          <Carousel
            className="h-full w-full [&>div]:h-full"
            setApi={setApi}
            opts={{ startIndex: lightboxIndex, loop: false, align: "center" }}
          >
            <CarouselContent className="ms-0 h-full">
              {images.map((img, i) => (
                <CarouselItem key={i} className="ps-0">
                  <div className="relative h-full w-full p-0 md:p-8">
                    <Image
                      src={buildVendorImageUrl(img)}
                      alt={`${vendorName} - ${i + 1}`}
                      fill
                      sizes="100vw"
                      className="object-contain"
                      priority={i === lightboxIndex}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </DialogContent>
    </Dialog>
  )
}
