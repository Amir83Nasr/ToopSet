"use client"

import { useCallback, useEffect, useRef } from "react"
import Image from "next/image"
import { buildVendorImageUrl } from "@/lib/api"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog"
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
  // Keep latest onClose in a ref so effect and handlers use the current
  // version without the effect depending on it.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Track whether the current effect instance pushed a history entry so
  // cleanup only replaces what it created — not a stale sibling entry.
  const pushedRef = useRef(false)

  // ── Mobile back-button: closes the lightbox instead of leaving the page ──
  useEffect(() => {
    if (!open) return

    window.history.pushState({ lightbox: true }, "")
    pushedRef.current = true

    const handlePop = () => onCloseRef.current()
    window.addEventListener("popstate", handlePop)

    return () => {
      window.removeEventListener("popstate", handlePop)
      if (pushedRef.current) {
        // Only replace if the current entry still carries our marker
        if (window.history.state?.lightbox) {
          window.history.replaceState({}, "", window.location.href)
        }
        pushedRef.current = false
      }
    }
  }, [open]) // <-- only depends on open, NOT onClose (accessed via ref)

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev + 1) % images.length)
  }, [setLightboxIndex, images.length])

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [setLightboxIndex, images.length])

  // ── Keyboard navigation: ArrowLeft / ArrowRight ──
  useEffect(() => {
    if (!open || images.length <= 1) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev()
      else if (e.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, images.length, goNext, goPrev])

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCloseRef.current()
      }}
      mobileAsSheet={false}
    >
      <ResponsiveDialogContent
        showCloseButton={false}
        className="fixed inset-0 start-1/2 top-1/2 z-9999 h-svh max-w-none gap-0 rounded-none border-none bg-black/95 p-0 ring-0 md:h-[85vh] md:w-[90vw] md:max-w-none md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl"
      >
        <ResponsiveDialogTitle className="sr-only">
          تصاویر {vendorName}
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="sr-only">
          نمایش تصویر {toPersianDigits(lightboxIndex + 1)} از{" "}
          {toPersianDigits(images.length)} — {vendorName}
        </ResponsiveDialogDescription>
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
          {/* Close */}
          <button
            onClick={() => onCloseRef.current()}
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

          {/* Prev — positioned on right (RTL: next appears on right side) */}
          {images.length > 1 && (
            <button
              onClick={goPrev}
              className="absolute right-3 z-20 flex size-10 items-center justify-center rounded-full bg-black/60 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
              aria-label="قبلی"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          {/* Next — positioned on left (RTL: prev appears on left side) */}
          {images.length > 1 && (
            <button
              onClick={goNext}
              className="absolute left-3 z-20 flex size-10 items-center justify-center rounded-full bg-black/60 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
              aria-label="بعدی"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {/* Current image */}
          <div className="relative h-full w-full p-0 md:p-8">
            <Image
              src={buildVendorImageUrl(images[lightboxIndex])}
              alt={`${vendorName} - ${lightboxIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
