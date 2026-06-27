"use client"

import { useEffect, useState } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface AuthHeroSlidesProps {
  fallback?: React.ReactNode
}

const DEFAULT_IMAGES = ["/placeholder-hero.svg"]

export function AuthHeroSlides({ fallback }: AuthHeroSlidesProps) {
  const [images, setImages] = useState<string[]>([])
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/settings/public/hero-slides`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Filter to only URL strings (image-based slides)
          const urls = data.filter(
            (s): s is string =>
              typeof s === "string" &&
              (s.startsWith("http") || s.startsWith("/"))
          )
          if (urls.length > 0) {
            setImages(urls)
          } else {
            setImages([])
          }
        }
      })
      .catch(() => {
        /* swallow */
      })
  }, [])

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [images.length])

  if (images.length === 0) {
    return <>{fallback}</>
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
          />

          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
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
