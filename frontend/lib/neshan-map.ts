/**
 * Neshan map SDK integration utilities.
 *
 * Provides a shared L namespace from the standard leaflet SDK and a helper to create
 * a map configured with the project's API key and preferred map type using Neshan tiles.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import L from "leaflet"

export default L

/* ── Config ── */

const API_KEY = process.env.NEXT_PUBLIC_NESHAN_API_KEY
// const MAP_TYPE = "standard-day"

/** Qom bounds — restrict panning */
export const QOM_BOUNDS = [
  [34.45, 50.65],
  [34.85, 51.1],
] as const

export const QOM_CENTER: [number, number] = [34.64, 50.88]
export const DEFAULT_ZOOM = 13
export const CLOSE_ZOOM = 15

/* ── Helpers ── */

/** Create a Neshan map on the given DOM element. */
export function createNeshanMap(el: HTMLElement, extra?: any): any {
  const map = new L.Map(el, {
    center: QOM_CENTER,
    zoom: DEFAULT_ZOOM,
    maxBounds: QOM_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 10,
    maxZoom: 18,
    attributionControl: false,
    ...extra,
  })

  // Neshan raster tile layer
  const neshanTiles = L.tileLayer(
    `https://api.neshan.org/v2/raster?key=${API_KEY}&x={x}&y={y}&z={z}`,
    {
      minZoom: 10,
      maxZoom: 18,
      attribution: "",
    }
  ).addTo(map)

  // Neshan tiles may return 204 (no content) if the API key is invalid or
  // expired. Monitor for tile failures and fall back to a styled tile layer.
  let fallbackAdded = false
  let checkCount = 0
  const TILE_CHECK_INTERVAL = 200
  const TILE_MAX_CHECKS = 5

  const checkInterval = setInterval(() => {
    checkCount++
    const tiles = el.querySelectorAll("img.leaflet-tile")
    const loaded = Array.from(tiles).filter(
      (t) => t instanceof HTMLImageElement && t.complete && t.naturalWidth > 0
    )
    // If at least one tile loaded successfully, Neshan works — stop checking
    if (loaded.length > 0) {
      clearInterval(checkInterval)
      return
    }
    // After ~1s (5 × 200ms) with no loaded tiles, declare Neshan tiles failed
    if (checkCount >= TILE_MAX_CHECKS) {
      clearInterval(checkInterval)
      if (!fallbackAdded) {
        fallbackAdded = true
        map.removeLayer(neshanTiles)
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
          {
            maxZoom: 20,
            minZoom: 10,
            attribution: "",
          }
        ).addTo(map)
      }
    }
  }, TILE_CHECK_INTERVAL)

  map.once("unload", () => clearInterval(checkInterval))

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

export function createVendorIcon(sportType?: string): any {
  const path = sportSvgPaths[sportType || ""] || sportSvgPaths.volleyball
  return L.divIcon({
    html: `<div class="flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white" style="background-color:var(--map-pin, #2563eb)">
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
    html: `<div class="flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white" style="background-color:var(--map-pin, #2563eb)">
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
    html: `<div class="flex items-center justify-center w-11 h-11 rounded-full shadow-xl border-2 border-white" style="background-color:var(--map-pin, #2563eb)">
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
