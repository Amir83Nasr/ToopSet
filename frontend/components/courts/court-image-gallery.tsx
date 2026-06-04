"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { toPersianDigits } from "@/lib/utils"

interface CourtImageGalleryProps {
  images: string[]
  courtName: string
}

export function CourtImageGallery({
  images,
  courtName,
}: CourtImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  if (!images || images.length === 0) return null

  function openLightbox(index: number) {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  return (
    <>
      <div className="group relative mb-8 overflow-hidden rounded-2xl border">
        <Carousel className="w-full">
          <CarouselContent>
            {images.map((img, i) => (
              <CarouselItem key={i}>
                <div
                  className="relative aspect-[21/9] cursor-pointer"
                  onClick={() => openLightbox(i)}
                >
                  <Image
                    src={img}
                    alt={`${courtName} - ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                    priority={i === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
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
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <div
                key={i}
                className="size-1.5 rounded-full bg-white/60 transition-all data-[active=true]:w-4 data-[active=true]:bg-white"
                data-active={i === lightboxIndex}
              />
            ))}
          </div>
        </Carousel>
      </div>

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
              <button className="absolute top-3 left-3 flex size-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white">
                <X className="size-4" />
              </button>
            </DialogClose>
            {lightboxIndex > 0 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex - 1)}
                className="absolute right-3 flex size-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              >
                <ChevronRight className="size-5" />
              </button>
            )}
            {lightboxIndex < images.length - 1 && (
              <button
                onClick={() => setLightboxIndex(lightboxIndex + 1)}
                className="absolute left-3 flex size-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs text-white/80 backdrop-blur-xs">
              {toPersianDigits(lightboxIndex + 1)} /{" "}
              {toPersianDigits(images.length)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
