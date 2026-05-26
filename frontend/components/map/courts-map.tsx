"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import { toPersianDigits } from "@/lib/utils"

const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
}

interface Court {
  id: number
  name: string
  sport_type: string
  address: string
  latitude: number
  longitude: number
  capacity: number
  is_active: boolean
  average_rating: number
}

interface CourtsMapProps {
  courts: Court[]
  height?: string
}

const MapController = ({ courts }: { courts: Court[] }) => {
  const map = useMap()
  useEffect(() => {
    if (courts.length > 0) {
      const group = new L.FeatureGroup(courts.map(c => L.marker([c.latitude, c.longitude])))
      map.fitBounds(group.getBounds().pad(0.2))
    }
  }, [courts, map])
  return null
}

const createSportIcon = (sportType: string) => {
  const colors: Record<string, string> = {
    volleyball: "#3b82f6",
    basketball: "#f97316",
    futsal: "#22c55e",
    handball: "#a855f7",
  }
  const color = colors[sportType] || "#6b7280"
  return L.divIcon({
    html: `<div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg" style="background-color: ${color}">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-white">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <circle cx="15" cy="9" r="2" />
        <circle cx="9" cy="15" r="2" />
        <circle cx="15" cy="15" r="2" />
      </svg>
    </div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })
}

export function CourtsMap({ courts, height = "400px" }: CourtsMapProps) {
  const defaultCenter = useMemo(() => [35.7, 51.4] as [number, number], [])

  if (courts.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-muted" style={{ height }}>
        <p className="text-sm text-muted-foreground">هیچ زمینی برای نمایش وجود ندارد</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController courts={courts} />
        {courts.map(court => (
          <Marker
            key={court.id}
            position={[court.latitude, court.longitude]}
            icon={createSportIcon(court.sport_type)}
          >
            <Popup>
              <div className="text-right" dir="rtl">
                <h3 className="font-semibold text-sm mb-1">{court.name}</h3>
                <p className="text-xs text-muted-foreground mb-1">{sportLabels[court.sport_type] || court.sport_type}</p>
                <p className="text-xs mb-1">{court.address}</p>
                <p className="text-xs">
                  ظرفیت: {toPersianDigits(court.capacity)} نفر
                </p>
                <p className="text-xs">
                  وضعیت: {court.is_active ? "فعال" : "غیرفعال"}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}