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
import "@neshan-maps-platform/leaflet/dist/leaflet.css"
import { Loader2, MapPin, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

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
    if (data.address) return simplifyAddress(data.address)
    return data.display_name || null
  } catch {
    return null
  }
}

/* ── Custom zoom control ── */

function addZoomControls(map: any) {
  const ZoomControl = L.Control.extend({
    options: { position: "bottomleft" },
    onAdd() {
      const container = L.DomUtil.create("div")
      container.className =
        "flex flex-col gap-0.5 [&_button]:!relative [&_button]:!static"

      const inBtn = L.DomUtil.create("button")
      inBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5v14"/></svg>`
      inBtn.className =
        "flex items-center justify-center w-9 h-9 rounded-lg border bg-card text-muted-foreground shadow-sm hover:bg-accent cursor-pointer"
      inBtn.type = "button"
      inBtn.onclick = () => map.zoomIn()

      const outBtn = L.DomUtil.create("button")
      outBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>`
      outBtn.className =
        "flex items-center justify-center w-9 h-9 rounded-lg border bg-card text-muted-foreground shadow-sm hover:bg-accent cursor-pointer"
      outBtn.type = "button"
      outBtn.onclick = () => map.zoomOut()

      container.appendChild(inBtn)
      container.appendChild(outBtn)
      return container
    },
  })

  const control = new ZoomControl()
  map.addControl(control)
  return () => {
    try {
      map.removeControl(control)
    } catch {
      /* ignore */
    }
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
  const [mounted, setMounted] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [ready, setReady] = useState(false)
  const lastGeocodeRef = useRef("")

  const hasLocation = latitude != null && longitude != null

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

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

  // Create map once (deferred with rAF to avoid Strict Mode double-invoke races)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    let destroyed = false

    const raf = requestAnimationFrame(() => {
      if (destroyed || !mapContainerRef.current) return

      const map = createNeshanMap(mapContainerRef.current, {
        center: QOM_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
      })

      mapRef.current = map
      addZoomControls(map)
      setReady(true)
    })

    return () => {
      destroyed = true
      cancelAnimationFrame(raf)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [])

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
    setTimeout(() => mapRef.current!.invalidateSize(), 200)
  }, [fullscreen, ready])

  if (!mounted) {
    return (
      <div
        style={{ height: 450 }}
        className="flex items-center justify-center rounded-xl border bg-muted"
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${fullscreen ? "fixed inset-0 z-9999 bg-background" : ""}`}
    >
      {geocoding && (
        <div className="pointer-events-none absolute top-3 right-3 z-1000 flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
          <Loader2 className="size-3 animate-spin" />
          در حال تشخیص آدرس...
        </div>
      )}

      <div
        style={{ height: fullscreen ? "100dvh" : 450 }}
        className="overflow-hidden rounded-xl border shadow-sm"
      >
        <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onPointerDown={(e) => {
          e.stopPropagation()
          toggleFullscreen()
        }}
        className="absolute right-3 bottom-3 z-1000 bg-card text-muted-foreground shadow-sm hover:bg-accent"
      >
        {fullscreen ? (
          <Minimize2 className="size-4" />
        ) : (
          <Maximize2 className="size-4" />
        )}
      </Button>

      {!hasLocation && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-1000 flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
          <MapPin className="size-3.5" />
          روی نقشه کلیک کنید تا موقعیت را مشخص کنید
        </div>
      )}
    </div>
  )
}
