"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import { QOM_BOUNDS } from "@/lib/map-utils"

interface CourtLocationMapProps {
  latitude: number
  longitude: number
  name: string
  height?: string
  interactive?: boolean
}

const markerIcon = L.divIcon({
  html: `<div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary shadow-lg border-2 border-white">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2C20 17.5 12 22 12 22z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
  className: "",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
})

export function CourtLocationMap({
  latitude,
  longitude,
  name,
  height = "200px",
  interactive = false,
}: CourtLocationMapProps) {
  return (
    <div className="overflow-hidden rounded-xl border" style={{ height }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        attributionControl={interactive}
        maxBounds={QOM_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[latitude, longitude]} icon={markerIcon}>
          <Popup>
            <div className="text-right font-sans" dir="rtl">
              <strong>{name}</strong>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
