/**
 * Map integration utilities using Leaflet with reliable raster tiles.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import L from "leaflet"

export default L

/* ── Config ── */

export const QOM_CENTER: [number, number] = [34.64, 50.88]
export const DEFAULT_ZOOM = 13
export const CLOSE_ZOOM = 15

/* ── Helpers ── */

/** Create a map on the given DOM element with reliable raster tiles. */
export function createNeshanMap(el: HTMLElement, extra?: any): any {
  const map = new L.Map(el, {
    center: QOM_CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: 4,
    maxZoom: 19,
    attributionControl: false,
    ...extra,
  })

  // Reliable, high-performance Carto Voyager raster tiles (with Persian & English support)
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      minZoom: 4,
      subdomains: "abcd",
      attribution: "",
    }
  ).addTo(map)

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
    className: "border-0 bg-transparent",
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
    className: "border-0 bg-transparent",
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
    className: "border-0 bg-transparent",
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
    className: "border-0 bg-transparent",
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  })
}
