"use client"

import { useEffect, useState } from "react"

interface AuthHeroSlidesProps {
  /** Resolved server-side (SSR) so the first image paints immediately. */
  urls?: string[]
  fallback?: React.ReactNode
}

export function AuthHeroSlides({ urls = [], fallback }: AuthHeroSlidesProps) {
  // Filter to only URL strings (image-based slides)
  const images = urls.filter(
    (s) => typeof s === "string" && (s.startsWith("http") || s.startsWith("/"))
  )
  const [current, setCurrent] = useState(0)

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [images.length])

  if (images.length === 0) {
    return (
      fallback || (
        <div className="relative size-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/futsal.svg"
            alt="ورزش"
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      )
    )
  }

  return (
    <div className="relative size-full overflow-hidden">
      {images.map((url, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${
            idx === current
              ? "translate-x-0 opacity-100"
              : idx < current
                ? "-translate-x-4 opacity-0"
                : "translate-x-4 opacity-0"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`تصویر ${idx + 1}`}
            className="size-full object-cover"
            // First image is LCP — prioritize + decode async so it paints ASAP
            {...(idx === 0 ? { fetchPriority: "high", decoding: "async" } : {})}
            onError={(e) => {
              // Dead URL (file deleted) → fall back to default art instead of
              // rendering a broken image. Guard prevents error-looping on the fallback.
              if (e.currentTarget.src.endsWith("futsal.svg")) return
              e.currentTarget.src = "/images/futsal.svg"
            }}
          />

          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      ))}

      {/* Dots navigator */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrent(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === current
                  ? "w-6 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`تصویر ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
