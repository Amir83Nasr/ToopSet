"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import L, {
  createNeshanMap,
  DEFAULT_ZOOM,
  QOM_CENTER,
  createCourtIcon,
  createUserLocationIcon,
} from "@/lib/neshan-map"
import "@neshan-maps-platform/leaflet/dist/leaflet.css"
import { toPersianDigits } from "@/lib/utils"

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

/* ── Locate button as a Leaflet control ── */

function addLocateControl(map: any) {
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
    try {
      map.removeControl(control)
    } catch {
      /* ignore */
    }
  }
}

/* ── Internal hook: keeps markers & popups in sync ── */

function renderCourtMarkers(map: any, courts: Court[]) {
  // Remove existing court markers (keep any user location markers)
  const toRemove: any[] = []
  map.eachLayer((layer: any) => {
    if (layer instanceof L.Marker && !("_isUser" in layer)) {
      toRemove.push(layer)
    }
  })
  toRemove.forEach((m: any) => m.remove())

  // Add fresh markers
  courts.forEach((court) => {
    const marker = L.marker([court.latitude, court.longitude], {
      icon: createCourtIcon(court.sport_types?.[0]),
    })

    const popupHtml = `<div class="text-right font-sans" dir="rtl" style="min-width:180px">
      <h3 class="mb-1 text-sm font-semibold">${court.name}</h3>
      <p class="mb-1.5 text-xs text-gray-500">${court.sport_types?.map((st) => sportLabels[st] || st).join("، ") || ""}</p>
      <p class="mb-1.5 max-w-50 truncate text-xs text-gray-500">${court.address}</p>
      <div class="mb-1.5 flex items-center gap-2 text-xs text-gray-500">
        <span>ظرفیت: ${toPersianDigits(court.capacity)} نفر</span>
        <span class="inline-flex items-center gap-0.5" dir="ltr">${renderStars(court.average_rating)} ${court.average_rating.toFixed(1)}</span>
      </div>
      <a href="/courts/${court.id}" class="mt-1 inline-block rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700">مشاهده مجموعه</a>
    </div>`

    marker.bindPopup(popupHtml)
    marker.addTo(map)
  })
}

function renderUserMarker(
  map: any,
  location: { latitude: number; longitude: number } | null
) {
  // Remove any existing user marker
  const toRemove: any[] = []
  map.eachLayer((layer: any) => {
    if (layer instanceof L.Marker && "_isUser" in layer) {
      toRemove.push(layer)
    }
  })
  toRemove.forEach((m: any) => m.remove())

  if (!location) return

  const marker = L.marker([location.latitude, location.longitude], {
    icon: createUserLocationIcon(),
    zIndexOffset: 1000,
  })
  ;(marker as any)._isUser = true
  marker.bindPopup(
    '<div class="text-right font-sans" dir="rtl"><strong>موقعیت شما</strong></div>'
  )
  marker.addTo(map)
}

/* ── Error boundary ── */

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

/* ── Main component ── */

export function CourtsMap({
  courts,
  height = "400px",
  userLocation,
}: CourtsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any | null>(null)
  const [ready, setReady] = useState(false)
  const prevIdsRef = useRef("")
  const prevUserRef = useRef("")

  // Create map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = createNeshanMap(containerRef.current, {
      center: QOM_CENTER,
      zoom: DEFAULT_ZOOM,
    })

    mapRef.current = map
    addLocateControl(map)
    setReady(true)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Sync courts to map
  const courtIds = useMemo(
    () => JSON.stringify(courts.map((c) => c.id)),
    [courts]
  )

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    if (courtIds === prevIdsRef.current) return
    prevIdsRef.current = courtIds

    renderCourtMarkers(map, courts)
    renderUserMarker(map, userLocation ?? null)

    // Fit bounds
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtIds, ready, userLocation])

  // Sync user location
  const userKey = userLocation
    ? `${userLocation.latitude},${userLocation.longitude}`
    : ""

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    if (userKey === prevUserRef.current) return
    prevUserRef.current = userKey

    renderUserMarker(map, userLocation ?? null)

    if (userLocation) {
      map.setView(
        [userLocation.latitude, userLocation.longitude],
        map.getZoom() || DEFAULT_ZOOM
      )
    }
  }, [userKey, ready, userLocation])

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
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      </div>
    </MapErrorBoundary>
  )
}
