"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react"
import L, {
  createNeshanMap,
  DEFAULT_ZOOM,
  createDefaultPinIcon,
} from "@/lib/neshan-map"
import "@neshan-maps-platform/leaflet/dist/leaflet.css"

interface CourtLocationMapProps {
  latitude: number
  longitude: number
  name: string
  height?: string
  interactive?: boolean
}

export function CourtLocationMap({
  latitude,
  longitude,
  name,
  height = "200px",
  interactive = false,
}: CourtLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let destroyed = false

    const raf = requestAnimationFrame(() => {
      if (destroyed || !containerRef.current) return

      const map = createNeshanMap(containerRef.current, {
        center: [latitude, longitude],
        zoom: DEFAULT_ZOOM,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
      })

      mapRef.current = map
      setReady(true)
    })

    return () => {
      destroyed = true
      cancelAnimationFrame(raf)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [latitude, longitude, interactive])

  // Add marker once map is ready
  useEffect(() => {
    if (!mapRef.current || !ready) return

    const marker = L.marker([latitude, longitude], {
      icon: createDefaultPinIcon(),
    })
    marker
      .bindPopup(
        `<div class="text-right font-sans" dir="rtl" style="color:var(--color-popover-foreground)"><strong>${name}</strong></div>`,
        { className: "theme-popup" }
      )
      .addTo(mapRef.current)

    mapRef.current.setView([latitude, longitude], 15)

    return () => {
      marker.remove()
    }
  }, [ready, latitude, longitude, name])

  return (
    <div className="overflow-hidden rounded-xl border" style={{ height }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  )
}
