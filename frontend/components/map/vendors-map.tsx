"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Component,
  useCallback,
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
  createVendorIcon,
  createUserLocationIcon,
  createSearchPinIcon,
} from "@/lib/neshan-map"
import "leaflet/dist/leaflet.css"
import { Loader2 } from "lucide-react"

const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
  football: "فوتبال",
}

// Track overlay markers without extending the Marker type
let lastUserMarker: any = null
let lastSearchMarker: any = null

interface Vendor {
  id: number
  name: string
  sport_types: string[]
  address: string
  latitude: number
  longitude: number
  capacity?: number
  is_active?: boolean
  average_rating?: number
  base_price?: number | null
  images?: string[]
  vendor_images?: { id: number; url: string; order: number }[]
}

interface VendorsMapProps {
  vendors: Vendor[]
  height?: string
  loading?: boolean
  userLocation?: { latitude: number; longitude: number } | null
  mapLocation?: { latitude: number; longitude: number } | null
  onMapClick?: (lat: number, lng: number) => void
}

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

function renderVendorMarkers(map: any, vendors: Vendor[]) {
  // Remove existing vendor markers (keep user location / search pin markers)
  const toRemove: any[] = []
  map.eachLayer((layer: any) => {
    if (
      layer instanceof L.Marker &&
      layer !== lastUserMarker &&
      layer !== lastSearchMarker
    ) {
      toRemove.push(layer)
    }
  })
  toRemove.forEach((m: any) => m.remove())

  // Add fresh markers
  vendors.forEach((vendor) => {
    if (
      typeof vendor.latitude !== "number" ||
      typeof vendor.longitude !== "number" ||
      isNaN(vendor.latitude) ||
      isNaN(vendor.longitude) ||
      (vendor.latitude === 0 && vendor.longitude === 0)
    ) {
      return
    }

    const marker = L.marker([vendor.latitude, vendor.longitude], {
      icon: createVendorIcon(vendor.sport_types?.[0]),
    })

    // Sport badges
    const badgesHtml =
      vendor.sport_types
        ?.map(
          (st) =>
            `<span class="inline-block rounded-full bg-muted-foreground/10 px-2 py-0.5 text-[10px] font-medium leading-tight text-muted-foreground">${sportLabels[st] || st}</span>`
        )
        .join(" ") || ""

    const popupHtml = `<div class="text-right font-sans" dir="rtl" style="min-width:220px">
      <div class="px-3 ps-7 pt-3">
        <div class="flex flex-wrap gap-1 mb-3">${badgesHtml}</div>
        <h3 class="text-sm font-bold leading-snug mb-1.5" style="color:var(--color-popover-foreground)">${vendor.name}</h3>
        <div class="flex items-start gap-1.5 mb-4 text-xs" style="color:var(--color-muted-foreground)">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span class="leading-normal line-clamp-2">${vendor.address}</span>
        </div>
      </div>
      <div class="p-3 pt-0">
        <a href="/vendors/${vendor.id}" class="group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[expanded]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 h-8 w-full bg-background hover:bg-muted hover:text-foreground border-border text-foreground shadow-xs">
          مشاهده مجموعه
        </a>
      </div>
    </div>`

    marker.bindPopup(popupHtml, { className: "theme-popup" })
    marker.addTo(map)
  })
}

function renderUserMarker(
  map: any,
  location: { latitude: number; longitude: number } | null
) {
  if (lastUserMarker) {
    try {
      lastUserMarker.remove()
    } catch {
      // ignore
    }
    lastUserMarker = null
  }
  if (
    !location ||
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number"
  ) {
    return
  }

  const marker = L.marker([location.latitude, location.longitude], {
    icon: createUserLocationIcon(),
    zIndexOffset: 1000,
  })
  marker.bindPopup(
    '<div class="text-right font-sans" dir="rtl" style="color:var(--color-popover-foreground)"><strong>موقعیت شما</strong></div>',
    { className: "theme-popup" }
  )
  marker.addTo(map)
  lastUserMarker = marker
}

function renderSearchPin(
  map: any,
  location: { latitude: number; longitude: number } | null
) {
  if (lastSearchMarker) {
    try {
      lastSearchMarker.remove()
    } catch {
      // ignore
    }
    lastSearchMarker = null
  }
  if (
    !location ||
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number"
  ) {
    return
  }

  const marker = L.marker([location.latitude, location.longitude], {
    icon: createSearchPinIcon(),
    zIndexOffset: 1001,
  })
  marker.bindPopup(
    '<div class="text-right font-sans" dir="rtl" style="color:var(--color-popover-foreground)"><strong>محدوده جستجو</strong></div>',
    { className: "theme-popup" }
  )
  marker.addTo(map)
  lastSearchMarker = marker
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

export function VendorsMap({
  vendors,
  height = "400px",
  loading = false,
  userLocation,
  mapLocation,
  onMapClick,
}: VendorsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any | null>(null)
  const [ready, setReady] = useState(false)

  // Filter valid coordinates
  const validVendors = useMemo(() => {
    return (vendors || []).filter(
      (v) =>
        typeof v.latitude === "number" &&
        typeof v.longitude === "number" &&
        !isNaN(v.latitude) &&
        !isNaN(v.longitude) &&
        (v.latitude !== 0 || v.longitude !== 0)
    )
  }, [vendors])

  // Create map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let destroyed = false

    const raf = requestAnimationFrame(() => {
      if (destroyed || !containerRef.current) return

      try {
        const map = createNeshanMap(containerRef.current, {
          center: QOM_CENTER,
          zoom: DEFAULT_ZOOM,
        })

        mapRef.current = map
        addLocateControl(map)
        setReady(true)

        // Multiple invalidates to handle transitions
        setTimeout(() => map.invalidateSize(), 100)
        setTimeout(() => map.invalidateSize(), 350)
      } catch {
        // ignore map creation error
      }
    })

    return () => {
      destroyed = true
      cancelAnimationFrame(raf)
      if (mapRef.current) {
        try {
          mapRef.current.remove()
        } catch {
          // ignore
        }
        mapRef.current = null
      }
    }
  }, [])

  // Invalidate map size when container is resized or becomes visible
  const doInvalidate = useCallback(() => {
    if (!mapRef.current) return
    try {
      mapRef.current.invalidateSize()
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!ready || !mapRef.current) return

    doInvalidate()
    const t1 = setTimeout(doInvalidate, 100)
    const t2 = setTimeout(doInvalidate, 300)
    const t3 = setTimeout(doInvalidate, 600)

    let resizeObserver: ResizeObserver | null = null
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => doInvalidate())
      resizeObserver.observe(containerRef.current)
    }

    let intersectionObserver: IntersectionObserver | null = null
    if (containerRef.current && typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              doInvalidate()
            }
          }
        },
        { threshold: 0.1 }
      )
      intersectionObserver.observe(containerRef.current)
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      if (resizeObserver) resizeObserver.disconnect()
      if (intersectionObserver) intersectionObserver.disconnect()
    }
  }, [ready, doInvalidate])

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

  // Sync markers and viewport bounds
  const vendorFingerprint = useMemo(
    () =>
      validVendors.map((c) => `${c.id}:${c.latitude},${c.longitude}`).join("|"),
    [validVendors]
  )

  const userKey = userLocation
    ? `${userLocation.latitude},${userLocation.longitude}`
    : ""

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    renderVendorMarkers(map, validVendors)
    renderUserMarker(map, userLocation ?? null)

    // Adjust view bounds to fit all markers
    if (validVendors.length > 0) {
      try {
        const markers = validVendors.map((c) =>
          L.marker([c.latitude, c.longitude])
        )
        if (
          userLocation &&
          typeof userLocation.latitude === "number" &&
          typeof userLocation.longitude === "number"
        ) {
          markers.push(
            L.marker([userLocation.latitude, userLocation.longitude])
          )
        }
        const group = L.featureGroup(markers)
        const bounds = group.getBounds()
        if (bounds.isValid()) {
          if (validVendors.length === 1 && !userLocation) {
            map.setView(
              [validVendors[0].latitude, validVendors[0].longitude],
              15
            )
          } else {
            map.fitBounds(bounds.pad(0.15), { maxZoom: 15, padding: [40, 40] })
          }
        }
      } catch {
        // ignore fitBounds errors
      }
    } else if (userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], 14)
    } else {
      map.setView(QOM_CENTER, DEFAULT_ZOOM)
    }
  }, [vendorFingerprint, ready, userKey, validVendors, userLocation])

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
        {loading && (
          <div className="absolute inset-0 z-500 flex items-center justify-center bg-background/50 backdrop-blur-xs">
            <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm text-foreground shadow-md">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>در حال به‌روزرسانی نقشه...</span>
            </div>
          </div>
        )}

        {!loading && validVendors.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-500 flex items-center justify-center">
            <p className="rounded-full bg-background/85 px-4 py-2 text-sm font-medium text-muted-foreground shadow-md backdrop-blur-sm">
              هیچ مجموعه‌ای برای نمایش در این محدوده یافت نشد
            </p>
          </div>
        )}
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      </div>
    </MapErrorBoundary>
  )
}
