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
  createSearchPinIcon,
  getSportColor,
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
  base_price: number | null
  images?: string[]
  court_images?: { id: number; url: string; order: number }[]
}

function formatPrice(price: number | null): string {
  if (price == null) return "—"
  return `${new Intl.NumberFormat("fa-IR").format(price)} تومان`
}

interface CourtsMapProps {
  courts: Court[]
  height?: string
  userLocation?: { latitude: number; longitude: number } | null
  mapLocation?: { latitude: number; longitude: number } | null
  onMapClick?: (lat: number, lng: number) => void
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
  // Remove existing court markers (keep any user location / search pin markers)
  const toRemove: any[] = []
  map.eachLayer((layer: any) => {
    if (
      layer instanceof L.Marker &&
      !("_isUser" in layer) &&
      !("_isSearch" in layer)
    ) {
      toRemove.push(layer)
    }
  })
  toRemove.forEach((m: any) => m.remove())

  // Add fresh markers
  courts.forEach((court) => {
    const marker = L.marker([court.latitude, court.longitude], {
      icon: createCourtIcon(court.sport_types?.[0]),
    })

    const primarySport = court.sport_types?.[0] || ""
    const accentColor = getSportColor(primarySport)

    // Sport type badges with sport-specific colors
    const badgesHtml =
      court.sport_types
        ?.map((st) => {
          const c = getSportColor(st)
          return `<span class="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight" style="background-color:${c}18;color:${c}">${sportLabels[st] || st}</span>`
        })
        .join(" ") || ""

    // Price section (only if available)
    const priceHtml =
      court.base_price != null
        ? `<div class="mb-2 rounded-md px-3 py-1.5 text-center text-xs font-semibold" style="background-color:${accentColor}0d;color:${accentColor}">${formatPrice(court.base_price)}</div>`
        : ""

    const popupHtml = `<div class="text-right font-sans" dir="rtl" style="position:relative;min-width:220px;padding-right:8px">
      <div style="position:absolute;top:4px;right:0;bottom:4px;width:3px;border-radius:999px;background-color:${accentColor}"></div>
      <div class="flex flex-wrap gap-1 mb-2">${badgesHtml}</div>
      <h3 class="text-sm font-bold leading-snug mb-1.5 text-gray-900 dark:text-gray-100">${court.name}</h3>
      <div class="flex items-start gap-1.5 mb-2 text-xs text-gray-500 dark:text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span class="leading-normal line-clamp-2">${court.address}</span>
      </div>
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1">
          ${renderStars(court.average_rating)}
          <span class="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">${court.average_rating.toFixed(1)}</span>
        </div>
        <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>${toPersianDigits(court.capacity)}</span>
        </div>
      </div>
      ${priceHtml}
      <a href="/courts/${court.id}" class="block w-full rounded-md px-3 py-1.5 text-center text-xs font-medium text-white transition-opacity hover:opacity-90" style="background-color:${accentColor}">مشاهده مجموعه</a>
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

function renderSearchPin(
  map: any,
  location: { latitude: number; longitude: number } | null
) {
  // Remove any existing search pin
  const toRemove: any[] = []
  map.eachLayer((layer: any) => {
    if (layer instanceof L.Marker && "_isSearch" in layer) {
      toRemove.push(layer)
    }
  })
  toRemove.forEach((m: any) => m.remove())

  if (!location) return

  const marker = L.marker([location.latitude, location.longitude], {
    icon: createSearchPinIcon(),
    zIndexOffset: 1001,
  })
  ;(marker as any)._isSearch = true
  marker.bindPopup(
    '<div class="text-right font-sans" dir="rtl"><strong>محدوده جستجو</strong></div>'
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
  mapLocation,
  onMapClick,
}: CourtsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any | null>(null)
  const [ready, setReady] = useState(false)
  const prevIdsRef = useRef("")
  const prevUserRef = useRef("")

  // Create map once (deferred with rAF to avoid Strict Mode double-invoke races)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let destroyed = false

    const raf = requestAnimationFrame(() => {
      if (destroyed || !containerRef.current) return

      const map = createNeshanMap(containerRef.current, {
        center: QOM_CENTER,
        zoom: DEFAULT_ZOOM,
      })

      mapRef.current = map
      addLocateControl(map)
      setReady(true)
    })

    return () => {
      destroyed = true
      cancelAnimationFrame(raf)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Map click handler for location selection
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !onMapClick) return

    const onClick = (e: any) => onMapClick(e.latlng.lat, e.latlng.lng)
    map.on("click", onClick)
    return () => {
      map.off("click", onClick)
    }
  }, [ready, onMapClick])

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

  // Sync search pin
  const mapLocationKey = mapLocation
    ? `${mapLocation.latitude},${mapLocation.longitude}`
    : ""

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    renderSearchPin(map, mapLocation ?? null)
  }, [mapLocationKey, ready, mapLocation])

  return (
    <MapErrorBoundary height={height}>
      <div
        className="relative overflow-hidden rounded-xl border"
        style={{ height }}
      >
        {courts.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
            <p className="rounded-full bg-background/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
              هیچ مجموعه‌ای برای نمایش وجود ندارد
            </p>
          </div>
        )}
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      </div>
    </MapErrorBoundary>
  )
}
