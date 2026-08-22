"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react"
import L, {
  createNeshanMap,
  DEFAULT_ZOOM,
  createDefaultPinIcon,
} from "@/lib/neshan-map"
import "leaflet/dist/leaflet.css"

interface VendorLocationMapProps {
  latitude: number
  longitude: number
  name: string
  height?: string
  interactive?: boolean
}

export function VendorLocationMap({
  latitude,
  longitude,
  name,
  height = "200px",
  interactive = true,
}: VendorLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any | null>(null)
  const markerRef = useRef<any | null>(null)
  const [ready, setReady] = useState(false)

  const isValidCoord =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    (latitude !== 0 || longitude !== 0)

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !isValidCoord) return
    let destroyed = false

    const raf = requestAnimationFrame(() => {
      if (destroyed || !containerRef.current) return

      try {
        const map = createNeshanMap(containerRef.current, {
          center: [latitude, longitude],
          zoom: DEFAULT_ZOOM,
          zoomControl: interactive,
          dragging: interactive,
          scrollWheelZoom: interactive,
        })

        mapRef.current = map
        setReady(true)

        setTimeout(() => map.invalidateSize(), 100)
        setTimeout(() => map.invalidateSize(), 300)
      } catch {
        // ignore map creation error
      }
    })

    return () => {
      destroyed = true
      cancelAnimationFrame(raf)
      if (mapRef.current) {
        try {
          mapRef.current.remove()
        } catch {
          // ignore
        }
        mapRef.current = null
      }
    }
  }, [latitude, longitude, interactive, isValidCoord])

  const doInvalidate = useCallback(() => {
    if (!mapRef.current) return
    try {
      mapRef.current.invalidateSize()
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!ready || !mapRef.current) return

    doInvalidate()
    const t1 = setTimeout(doInvalidate, 150)
    const t2 = setTimeout(doInvalidate, 400)

    let resizeObserver: ResizeObserver | null = null
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => doInvalidate())
      resizeObserver.observe(containerRef.current)
    }

    let intersectionObserver: IntersectionObserver | null = null
    if (containerRef.current && typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              doInvalidate()
            }
          }
        },
        { threshold: 0.1 }
      )
      intersectionObserver.observe(containerRef.current)
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      if (resizeObserver) resizeObserver.disconnect()
      if (intersectionObserver) intersectionObserver.disconnect()
    }
  }, [ready, doInvalidate])

  // Add marker once map is ready
  useEffect(() => {
    if (!mapRef.current || !ready || !isValidCoord) return

    if (markerRef.current) {
      try {
        markerRef.current.remove()
      } catch {
        // ignore
      }
      markerRef.current = null
    }

    const marker = L.marker([latitude, longitude], {
      icon: createDefaultPinIcon(),
    })
    marker
      .bindPopup(
        `<div class="text-right font-sans" dir="rtl" style="color:var(--color-popover-foreground)"><strong>${name}</strong></div>`,
        { className: "theme-popup" }
      )
      .addTo(mapRef.current)
    markerRef.current = marker

    mapRef.current.setView([latitude, longitude], 15)

    return () => {
      if (markerRef.current) {
        try {
          markerRef.current.remove()
        } catch {
          // ignore
        }
        markerRef.current = null
      }
    }
  }, [ready, latitude, longitude, name, isValidCoord])

  return (
    <div className="overflow-hidden rounded-xl border" style={{ height }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  )
}
