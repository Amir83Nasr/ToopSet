/**
 * Neshan map SDK integration utilities.
 *
 * Provides a shared L namespace from the Neshan SDK and a helper to create
 * a map configured with the project's API key and preferred map type.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import L from "@neshan-maps-platform/leaflet"

export default L

/* ── Config ── */

const API_KEY = process.env.NEXT_PUBLIC_NESHAN_API_KEY
const MAP_TYPE = "standard-day"

/** Qom bounds — restrict panning */
export const QOM_BOUNDS = [
  [34.45, 50.65],
  [34.85, 51.1],
] as const

export const QOM_CENTER: [number, number] = [34.64, 50.88]
export const DEFAULT_ZOOM = 13
export const CLOSE_ZOOM = 15

/* ── Helpers ── */

/** Strip Neshan watermark + leaflet attribution — uses MutationObserver to catch async injection. */
function removeNeshanWatermark(el: HTMLElement, _map: any) {
  function strip() {
    // Remove Neshan-branded links anywhere in the map container
    el.querySelectorAll(
      'a[href*="neshan"], a[href*="nsh"], a[href*="Neshan"], a[href*="openstreetmap"]'
    ).forEach((a) => a.remove())
    // Remove Neshan-branded images
    el.querySelectorAll(
      'img[src*="neshan"], img[src*="nsh"], img[src*="Neshan"]'
    ).forEach((img) => img.remove())
    // Remove attribution flag icon (OSM / Neshan)
    el.querySelectorAll(".leaflet-attribution-flag").forEach((flag) =>
      flag.remove()
    )
    // Remove any node containing Neshan text (watermark, attribution)
    el.querySelectorAll(
      ".leaflet-control-attribution, .leaflet-bottom a"
    ).forEach((node) => {
      if (
        node instanceof HTMLElement &&
        (node.innerHTML.toLowerCase().includes("neshan") ||
          node.innerHTML.includes("نشان"))
      ) {
        node.remove()
      }
    })
  }

  strip()

  // Watch for async injections (watermark loads long after map init)
  const observer = new MutationObserver(() => strip())
  observer.observe(el, { childList: true, subtree: true })

  // Cleanup observer when map is destroyed
  _map.once("unload", () => observer.disconnect())

  // Extra safety: keep polling for a few seconds in case the observer misses something
  let attempts = 0
  const interval = setInterval(() => {
    strip()
    attempts++
    if (attempts > 20) clearInterval(interval) // ~10 seconds
  }, 500)
  _map.once("unload", () => clearInterval(interval))
}

/** Create a Neshan map on the given DOM element. */
export function createNeshanMap(el: HTMLElement, extra?: any): any {
  const map = new L.Map(el, {
    key: API_KEY,
    maptype: MAP_TYPE,
    center: QOM_CENTER,
    zoom: DEFAULT_ZOOM,
    maxBounds: QOM_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 10,
    maxZoom: 18,
    attributionControl: false,
    ...extra,
  })

  removeNeshanWatermark(el, map)

  return map
}

/* ── Marker icons ── */

/* Sport color palette */
const sportColors: Record<string, string> = {
  volleyball: "#3b82f6",
  basketball: "#f97316",
  futsal: "#22c55e",
  handball: "#a855f7",
  football: "#dc2626",
}

/* Sport SVG paths (Material-style) */
const sportSvgPaths: Record<string, string> = {
  volleyball:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-3.5l6-4.5-6-4.5v9z",
  basketball:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6l5.25 3.15L17 14.23l-4-2.37V7z",
  futsal:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-5h2v-2h-2v2zm0-4h2V7h-2v4z",
  handball:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v2h-2zm0 4h2v6h-2z",
  football:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
}

export function getSportColor(sportType?: string): string {
  return sportColors[sportType || ""] || "#6b7280"
}

export function createCourtIcon(sportType?: string): any {
  const path = sportSvgPaths[sportType || ""] || sportSvgPaths.volleyball
  return L.divIcon({
    html: `<div class="flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white" style="background-color:var(--color-primary)">
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

export function createUserLocationIcon(): any {
  return L.divIcon({
    html: `<div class="relative" style="width:24px;height:24px">
      <div class="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
      <div class="absolute inset-0.75 rounded-full bg-blue-500/40 animate-pulse"></div>
      <div class="absolute inset-1.5 rounded-full bg-blue-600 border-2 border-white shadow-lg"></div>
    </div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export function createDefaultPinIcon(): any {
  return L.divIcon({
    html: `<div class="flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white" style="background-color:var(--primary)">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="0.5">
        <circle cx="12" cy="12" r="6"/>
      </svg>
    </div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  })
}

export function createSearchPinIcon(): any {
  return L.divIcon({
    html: `<div class="flex items-center justify-center w-11 h-11 rounded-full shadow-xl border-2 border-white" style="background-color:var(--primary)">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
      </svg>
    </div>`,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  })
}
