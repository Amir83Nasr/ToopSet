"use client"

import { Component, useEffect, useMemo, useRef, type ReactNode } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import { toPersianDigits } from "@/lib/utils"
import { QOM_BOUNDS, QOM_CENTER, DEFAULT_ZOOM } from "@/lib/map-utils"
import { createCourtIcon, createUserLocationIcon } from "@/lib/map-utils"

const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
  football: "فوتبال",
}

interface Court {
  id: number
  name: string
  sport_types: string[]
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
  userLocation?: { latitude: number; longitude: number } | null
}

const starIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>'

const renderStars = (rating: number) => starIcon.repeat(Math.floor(rating))

function MapController({
  courts,
  userLocation,
}: {
  courts: CourtsMapProps["courts"]
  userLocation?: CourtsMapProps["userLocation"]
}) {
  const map = useMap()
  const prevIdsRef = useRef("")
  const prevUserRef = useRef("")

  useEffect(() => {
    const ids = JSON.stringify(courts.map((c) => c.id))
    const userKey = userLocation
      ? `${userLocation.latitude},${userLocation.longitude}`
      : ""

    if (ids !== prevIdsRef.current) {
      prevIdsRef.current = ids
      if (courts.length > 0) {
        try {
          const markers = courts.map((c) => L.marker([c.latitude, c.longitude]))
          if (userLocation) {
            markers.push(
              L.marker([userLocation.latitude, userLocation.longitude])
            )
          }
          const group = new L.FeatureGroup(markers)
          const bounds = group.getBounds()
          if (bounds.isValid()) {
            map.fitBounds(bounds.pad(0.15))
          }
        } catch {
          // ignore fitBounds errors
        }
      }
    }

    if (userLocation && userKey !== prevUserRef.current) {
      prevUserRef.current = userKey
      map.setView(
        [userLocation.latitude, userLocation.longitude],
        map.getZoom() || DEFAULT_ZOOM
      )
    }
  }, [courts, map, userLocation])

  return null
}

/* ── Custom Leaflet control: locate + zoom in/out ── */

function MapControls() {
  const map = useMap()

  useEffect(() => {
    const CustomControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd() {
        const container = L.DomUtil.create("div")
        if (!container) return
        container.className = "map-controls-group"

        // Locate button
        const locateBtn = L.DomUtil.create("button")
        if (!locateBtn) return
        locateBtn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>'
        locateBtn.className = "map-ctrl-btn map-ctrl-locate"
        locateBtn.title = "موقعیت من"
        locateBtn.setAttribute("aria-label", "موقعیت من")
        locateBtn.onclick = () => {
          map.locate({ setView: true, maxZoom: 15 })
        }

        // Zoom in
        const zoomInBtn = L.DomUtil.create("button")
        if (!zoomInBtn) return
        zoomInBtn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
        zoomInBtn.className = "map-ctrl-btn map-ctrl-zoom-in"
        zoomInBtn.title = "بزرگ‌نمایی"
        zoomInBtn.setAttribute("aria-label", "بزرگ‌نمایی")
        zoomInBtn.onclick = () => {
          map.zoomIn()
        }

        // Zoom out
        const zoomOutBtn = L.DomUtil.create("button")
        if (!zoomOutBtn) return
        zoomOutBtn.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>'
        zoomOutBtn.className = "map-ctrl-btn map-ctrl-zoom-out"
        zoomOutBtn.title = "کوچک‌نمایی"
        zoomOutBtn.setAttribute("aria-label", "کوچک‌نمایی")
        zoomOutBtn.onclick = () => {
          map.zoomOut()
        }

        container.appendChild(locateBtn)
        container.appendChild(zoomInBtn)
        container.appendChild(zoomOutBtn)

        return container
      },
    })

    const control = new CustomControl()
    map.addControl(control)
    return () => {
      try {
        map.removeControl(control)
      } catch {
        /* ignore */
      }
    }
  }, [map])

  return null
}

/* ── Error boundary for map failures ── */
class MapErrorBoundary extends Component<
  { children: ReactNode; height: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; height: string }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex items-center justify-center rounded-xl border bg-muted"
          style={{ height: this.props.height }}
        >
          <p className="text-sm text-muted-foreground">
            بارگذاری نقشه با خطا مواجه شد
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

function UserMarker({
  location,
}: {
  location: { latitude: number; longitude: number }
}) {
  return (
    <Marker
      position={[location.latitude, location.longitude]}
      icon={createUserLocationIcon()}
      zIndexOffset={1000}
    >
      <Popup>
        <div className="text-right font-sans" dir="rtl">
          <strong>موقعیت شما</strong>
        </div>
      </Popup>
    </Marker>
  )
}

export function CourtsMap({
  courts,
  height = "400px",
  userLocation,
}: CourtsMapProps) {
  const defaultCenter = useMemo(() => QOM_CENTER, [])

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
        <p className="text-sm text-muted-foreground">
          هیچ مجموعه‌ای برای نمایش وجود ندارد
        </p>
      </div>
    )
  }

  return (
    <MapErrorBoundary height={height}>
      <div className="overflow-hidden rounded-xl border" style={{ height }}>
        <MapContainer
          key={mapKey}
          center={defaultCenter}
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
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController courts={courts} userLocation={userLocation} />
          <MapControls />
          {userLocation && <UserMarker location={userLocation} />}
          {courts.map((court) => (
            <Marker
              key={court.id}
              position={[court.latitude, court.longitude]}
              icon={createCourtIcon(court.sport_types?.[0])}
            >
              <Popup>
                <div
                  className="text-right font-sans"
                  dir="rtl"
                  style={{ minWidth: 180 }}
                >
                  <h3 className="mb-1 text-sm font-semibold">{court.name}</h3>
                  <p className="mb-1.5 text-xs text-gray-500">
                    {court.sport_types
                      ?.map((st) => sportLabels[st] || st)
                      .join("، ")}
                  </p>
                  <p className="mb-1.5 max-w-50 truncate text-xs text-gray-500">
                    {court.address}
                  </p>
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-gray-500">
                    <span>ظرفیت: {toPersianDigits(court.capacity)} نفر</span>
                    <span
                      className="inline-flex items-center gap-0.5"
                      dir="ltr"
                    >
                      {renderStars(court.average_rating)}{" "}
                      {court.average_rating.toFixed(1)}
                    </span>
                  </div>
                  <a
                    href={`/courts/${court.id}`}
                    className="mt-1 inline-block rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    مشاهده مجموعه
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </MapErrorBoundary>
  )
}
