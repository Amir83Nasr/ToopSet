"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react"
import L, {
  createNeshanMap,
  DEFAULT_ZOOM,
  CLOSE_ZOOM,
  QOM_CENTER,
  createDefaultPinIcon,
} from "@/lib/neshan-map"
import "leaflet/dist/leaflet.css"
import {
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toPersianDigits } from "@/lib/utils"

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onLocationChange: (lat: number, lng: number, address?: string) => void
}

function simplifyAddress(addr: Record<string, string>): string {
  const parts: string[] = []
  const street = addr.road || addr.pedestrian || addr.street || ""
  const number = addr.house_number || ""
  const streetPart = [street, number].filter(Boolean).join(" ")
  if (streetPart) parts.push(streetPart)
  const hood = addr.neighbourhood || addr.suburb || addr.city_district || ""
  if (hood) parts.push(hood)
  const city = addr.city || addr.town || addr.village || addr.municipality || ""
  if (city) parts.push(city)
  return parts.join("، ")
}

async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=fa`,
      {
        headers: { "User-Agent": "ToopSet/1.0" },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.address) return toPersianDigits(simplifyAddress(data.address))
    return data.display_name ? toPersianDigits(data.display_name) : null
  } catch {
    return null
  }
}

/* ── Main component ── */

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any | null>(null)
  const markerRef = useRef<any | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [ready, setReady] = useState(false)
  const lastGeocodeRef = useRef("")
  const initializedRef = useRef(false)

  const hasLocation = latitude != null && longitude != null

  useEffect(() => {
    function onChange() {
      setFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  function toggleFullscreen() {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen()
    }
  }

  // Create map once
  useEffect(() => {
    if (!mapContainerRef.current || initializedRef.current) return
    let destroyed = false

    const raf = requestAnimationFrame(() => {
      if (destroyed || !mapContainerRef.current) return

      try {
        const map = createNeshanMap(mapContainerRef.current, {
          center: QOM_CENTER,
          zoom: DEFAULT_ZOOM,
          zoomControl: false,
          scrollWheelZoom: false,
        })

        mapRef.current = map
        initializedRef.current = true
        setReady(true)

        // Invalidate size after a short delay to ensure container has settled
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize()
          }
        }, 300)
      } catch (err) {
        console.error("Failed to create Neshan map:", err)
        setReady(true) // Still mark ready so empty state shows instead of infinite spinner
      }
    })

    return () => {
      destroyed = true
      cancelAnimationFrame(raf)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
        initializedRef.current = false
      }
    }
  }, [])

  // Watch for container visibility changes (tab switching, fullscreen, resize)
  // and invalidate the map so tiles re-render correctly.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    function doInvalidate() {
      if (mapRef.current) {
        setTimeout(() => mapRef.current.invalidateSize(), 50)
      }
    }

    // ResizeObserver: detects container size changes (responsive layout, fullscreen)
    let resizeObserver: ResizeObserver | null = null
    if (mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => doInvalidate())
      resizeObserver.observe(mapContainerRef.current)
    }

    // IntersectionObserver: detects when container becomes visible (tab switch)
    let intersectionObserver: IntersectionObserver | null = null
    if (mapContainerRef.current) {
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
      intersectionObserver.observe(mapContainerRef.current)
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect()
      if (intersectionObserver) intersectionObserver.disconnect()
    }
  }, [ready])

  // Handle map clicks
  const handlePlace = useCallback(
    async (lat: number, lng: number) => {
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
      if (key === lastGeocodeRef.current) {
        onLocationChange(lat, lng)
        return
      }
      lastGeocodeRef.current = key

      setGeocoding(true)
      const address = await reverseGeocode(lat, lng)
      setGeocoding(false)
      onLocationChange(lat, lng, address || undefined)
    },
    [onLocationChange]
  )

  // Attach click handler once map is ready
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    function onClick(e: any) {
      handlePlace(e.latlng.lat, e.latlng.lng)
    }

    map.on("click", onClick)
    return () => {
      map.off("click", onClick)
    }
  }, [ready, handlePlace])

  // Sync marker position
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    // Remove old marker
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }

    if (hasLocation && latitude != null && longitude != null) {
      const marker = L.marker([latitude, longitude], {
        icon: createDefaultPinIcon(),
      })
      marker.addTo(map)
      markerRef.current = marker

      map.flyTo([latitude, longitude], CLOSE_ZOOM, { duration: 0.5 })
    }
  }, [ready, hasLocation, latitude, longitude])

  // Invalidate size on fullscreen change
  useEffect(() => {
    if (!mapRef.current || !ready) return
    setTimeout(() => mapRef.current!.invalidateSize(), 300)
  }, [fullscreen, ready])

  return (
    <div
      ref={containerRef}
      className={`relative ${fullscreen ? "fixed inset-0 z-9999 bg-background" : "isolate z-0"}`}
    >
      {geocoding && (
        <div className="pointer-events-none absolute top-3 right-3 z-1000 flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
          <Loader2 className="size-3 animate-spin" />
          در حال تشخیص آدرس...
        </div>
      )}

      <div
        style={{ height: fullscreen ? "100dvh" : 450 }}
        className="relative overflow-hidden rounded-xl border shadow-sm"
      >
        {/* Map container — always rendered so ref is populated on mount */}
        <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />

        {/* Loading overlay — shown while map initializes */}
        {!ready && (
          <div className="absolute inset-0 z-500 flex items-center justify-center bg-muted">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state overlay — shown when map is ready but no coordinates set */}
        {ready && !hasLocation && (
          <div className="pointer-events-none absolute inset-0 z-500 flex items-center justify-center bg-muted/30">
            <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
              <MapPin className="size-8 text-muted-foreground/40" />
              <span>روی نقشه کلیک کنید تا موقعیت را مشخص کنید</span>
            </div>
          </div>
        )}

        {ready && (
          <div className="absolute end-3 bottom-3 z-1000 flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="بزرگ‌نمایی نقشه"
              onPointerDown={(e) => {
                e.stopPropagation()
                mapRef.current?.zoomIn()
              }}
              className="pointer-events-auto bg-background text-foreground shadow-md hover:bg-accent"
            >
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="کوچک‌نمایی نقشه"
              onPointerDown={(e) => {
                e.stopPropagation()
                mapRef.current?.zoomOut()
              }}
              className="pointer-events-auto bg-background text-foreground shadow-md hover:bg-accent"
            >
              <Minus className="size-4" />
            </Button>
            {hasLocation && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={
                  fullscreen ? "خروج از تمام‌صفحه" : "نمایش تمام‌صفحه نقشه"
                }
                onPointerDown={(e) => {
                  e.stopPropagation()
                  toggleFullscreen()
                }}
                className="pointer-events-auto bg-background text-foreground shadow-md hover:bg-accent"
              >
                {fullscreen ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
