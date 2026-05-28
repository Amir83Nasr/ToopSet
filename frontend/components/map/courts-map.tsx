"use client"

import { useEffect, useMemo, useRef } from "react"
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
  images?: { image_url: string }[]
}

interface CourtsMapProps {
  courts: Court[]
  height?: string
}

const sportSvgPaths: Record<string, string> = {
  volleyball:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-3.5l6-4.5-6-4.5v9z",
  basketball:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6l5.25 3.15L17 14.23l-4-2.37V7z",
  futsal:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-5h2v-2h-2v2zm0-4h2V7h-2v4z",
  handball:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v2h-2zm0 4h2v6h-2z",
}

const sportColors: Record<string, string> = {
  volleyball: "#3b82f6",
  basketball: "#f97316",
  futsal: "#22c55e",
  handball: "#a855f7",
}

const createSportIcon = (sportType: string) => {
  const color = sportColors[sportType] || "#6b7280"
  const path = sportSvgPaths[sportType] || sportSvgPaths.volleyball
  return L.divIcon({
    html: `<div class="flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white" style="background-color: ${color}">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="0.5">
        <path d="${path}"/>
      </svg>
    </div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  })
}

const starIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>'

const renderStars = (rating: number) => {
  const full = Math.floor(rating)
  return starIcon.repeat(full)
}

function MapController({ courts }: { courts: CourtsMapProps["courts"] }) {
  const map = useMap()
  const prevIdsRef = useRef("")

  useEffect(() => {
    const ids = JSON.stringify(courts.map((c) => c.id))
    if (ids === prevIdsRef.current) return
    prevIdsRef.current = ids

    if (courts.length > 0) {
      const group = new L.FeatureGroup(courts.map((c) => L.marker([c.latitude, c.longitude])))
      map.fitBounds(group.getBounds().pad(0.2))
    }
  }, [courts, map])

  return null
}

function LocateButton() {
  const map = useMap()

  useEffect(() => {
    const LocateControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd() {
        const btn = L.DomUtil.create("button")
        btn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>'
        btn.className =
          "leaflet-control-zoom leaflet-bar part flex items-center justify-center cursor-pointer border border-gray-300 bg-white rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
        btn.style.cssText = "width:34px;height:34px;margin-bottom:4px"
        btn.title = "موقعیت من"
        btn.setAttribute("aria-label", "موقعیت من")

        btn.onclick = () => {
          map.locate({ setView: true, maxZoom: 15 })
        }
        return btn
      },
    })

    const control = new LocateControl()
    map.addControl(control)
    return () => {
      map.removeControl(control)
    }
  }, [map])

  return null
}

export function CourtsMap({ courts, height = "400px" }: CourtsMapProps) {
  const defaultCenter = useMemo(() => [35.7, 51.4] as [number, number], [])

  const mapKey = useMemo(
    () => `map-${courts.map((c) => c.id).join("-") || "empty"}`,
    [courts]
  )

  if (courts.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border bg-muted"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">هیچ زمینی برای نمایش وجود ندارد</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ height }}>
      <MapContainer
        key={mapKey}
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
        <LocateButton />
        {courts.map((court) => (
          <Marker
            key={court.id}
            position={[court.latitude, court.longitude]}
            icon={createSportIcon(court.sport_type)}
          >
            <Popup>
              <div className="text-right font-sans" dir="rtl" style={{ minWidth: 180 }}>
                <h3 className="font-semibold text-sm mb-1">{court.name}</h3>
                <p className="text-xs text-gray-500 mb-1.5">
                  {sportLabels[court.sport_type] || court.sport_type}
                </p>
                <p className="text-xs text-gray-500 mb-1.5 truncate max-w-[200px]">
                  {court.address}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
                  <span>ظرفیت: {toPersianDigits(court.capacity)} نفر</span>
                  <span className="inline-flex items-center gap-0.5" dir="ltr">
                    {renderStars(court.average_rating)} {court.average_rating.toFixed(1)}
                  </span>
                </div>
                <a
                  href={`/courts/${court.id}`}
                  className="inline-block mt-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  مشاهده زمین
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
