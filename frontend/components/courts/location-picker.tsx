"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
  ZoomControl,
} from "react-leaflet"
import L from "leaflet"
import { Loader2, MapPin } from "lucide-react"
import {
  QOM_BOUNDS,
  QOM_CENTER,
  DEFAULT_ZOOM,
  CLOSE_ZOOM,
} from "@/lib/map-utils"

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onLocationChange: (lat: number, lng: number, address?: string) => void
}

function ClickHandler({
  onPlace,
  enabled,
}: {
  onPlace: (lat: number, lng: number) => void
  enabled: boolean
}) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onPlace(e.latlng.lat, e.latlng.lng)
      }
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
    return data.display_name || null
  } catch {
    return null
  }
}

function createStyledPinIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width: 32px;
      height: 32px;
      background: hsl(var(--primary));
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      transform: translate(-50%, -100%);
    "></div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
}: LocationPickerProps) {
  const [geocoding, setGeocoding] = useState(false)
  const lastGeocodeRef = useRef("")

  const hasLocation = latitude != null && longitude != null

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

  const handleDragEnd = useCallback(
    (e: L.LeafletEvent) => {
      const marker = e.target as L.Marker
      const pos = marker.getLatLng()
      handlePlace(pos.lat, pos.lng)
    },
    [handlePlace]
  )

  const markerPosition = useMemo(
    () =>
      (hasLocation ? [latitude!, longitude!] : null) as [number, number] | null,
    [hasLocation, latitude, longitude]
  )

  return (
    <div className="relative">
      {/* Geocoding indicator */}
      {geocoding && (
        <div className="pointer-events-none absolute top-3 right-3 z-[1000] flex items-center gap-1.5 rounded-full border bg-background/80 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
          <Loader2 className="size-3 animate-spin" />
          در حال تشخیص آدرس...
        </div>
      )}

      <div
        style={{ height: 450 }}
        className="overflow-hidden rounded-xl border shadow-sm"
      >
        <MapContainer
          center={QOM_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
          maxBounds={QOM_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={10}
          maxZoom={18}
          attributionControl={false}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />
          <ZoomControl position="bottomleft" />
          <ClickHandler onPlace={handlePlace} enabled />
          {hasLocation && markerPosition && (
            <Marker
              position={markerPosition}
              icon={createStyledPinIcon()}
              draggable={true}
              eventHandlers={{ dragend: handleDragEnd }}
            />
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

      {/* Click hint */}
      {!hasLocation && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
          <MapPin className="size-3.5" />
          روی نقشه کلیک کنید تا موقعیت را مشخص کنید
        </div>
      )}
    </div>
  )
}
