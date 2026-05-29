"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import { QOM_BOUNDS } from "@/lib/map-utils"
import { createDefaultPinIcon } from "@/lib/map-utils"

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
  return (
    <div className="overflow-hidden rounded-xl border" style={{ height }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        attributionControl={false}
        maxBounds={QOM_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[latitude, longitude]} icon={createDefaultPinIcon()}>
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
