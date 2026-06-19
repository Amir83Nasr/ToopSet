"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet"
import {
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  QOM_BOUNDS,
  QOM_CENTER,
  DEFAULT_ZOOM,
  CLOSE_ZOOM,
  createDefaultPinIcon,
} from "@/lib/map-utils"

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onLocationChange: (lat: number, lng: number, address?: string) => void
}

function ClickHandler({
  onPlace,
}: {
  onPlace: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (!done.current && lat && lng) {
      map.flyTo([lat, lng], zoom, { duration: 0.5 })
      done.current = true
    }
  })
  return null
}

function ZoomControls() {
  const map = useMap()
  const inRef = useRef<HTMLButtonElement>(null)
  const outRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const stop = (e: Event) => {
      e.stopPropagation()
    }
    const zoomIn = (e: Event) => {
      e.stopPropagation()
      map.zoomIn()
    }
    const zoomOut = (e: Event) => {
      e.stopPropagation()
      map.zoomOut()
    }

    const inBtn = inRef.current
    const outBtn = outRef.current

    inBtn?.addEventListener("pointerdown", stop, true)
    inBtn?.addEventListener("pointerup", stop, true)
    inBtn?.addEventListener("click", zoomIn, true)
    outBtn?.addEventListener("pointerdown", stop, true)
    outBtn?.addEventListener("pointerup", stop, true)
    outBtn?.addEventListener("click", zoomOut, true)

    return () => {
      inBtn?.removeEventListener("pointerdown", stop, true)
      inBtn?.removeEventListener("pointerup", stop, true)
      inBtn?.removeEventListener("click", zoomIn, true)
      outBtn?.removeEventListener("pointerdown", stop, true)
      outBtn?.removeEventListener("pointerup", stop, true)
      outBtn?.removeEventListener("click", zoomOut, true)
    }
  }, [map])

  return (
    <div className="absolute bottom-3 left-3 z-1000 flex flex-col gap-0.5">
      <Button
        ref={inRef}
        type="button"
        variant="outline"
        size="icon"
        className="bg-card text-muted-foreground shadow-sm hover:bg-accent"
      >
        <Plus className="size-4" />
      </Button>
      <Button
        ref={outRef}
        type="button"
        variant="outline"
        size="icon"
        className="bg-card text-muted-foreground shadow-sm hover:bg-accent"
      >
        <Minus className="size-4" />
      </Button>
    </div>
  )
}

function FullscreenWatcher({ fullscreen }: { fullscreen: boolean }) {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 200)
  }, [fullscreen, map])
  return null
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

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
}: LocationPickerProps) {
  const [geocoding, setGeocoding] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
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

  const markerPosition = useMemo(
    () =>
      (hasLocation ? [latitude!, longitude!] : null) as [number, number] | null,
    [hasLocation, latitude, longitude]
  )

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
        <MapContainer
          center={QOM_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
          maxBounds={QOM_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={10}
          maxZoom={18}
          attributionControl={false}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <ZoomControls />
          <ClickHandler onPlace={handlePlace} />
          <FullscreenWatcher fullscreen={fullscreen} />
          {hasLocation && markerPosition && (
            <Marker position={markerPosition} icon={createDefaultPinIcon()} />
          )}
          {hasLocation && markerPosition && (
            <FlyTo
              lat={markerPosition[0]}
              lng={markerPosition[1]}
              zoom={CLOSE_ZOOM}
            />
          )}
        </MapContainer>
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
