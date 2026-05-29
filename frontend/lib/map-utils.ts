import L from "leaflet"

/**
 * Qom, Iran approximate bounding box.
 * Restricts map panning to the Qom area.
 */
export const QOM_BOUNDS: L.LatLngBoundsExpression = [
  [34.45, 50.65],
  [34.85, 51.1],
] as const

export const QOM_CENTER: [number, number] = [34.64, 50.88]
export const DEFAULT_ZOOM = 12
export const CLOSE_ZOOM = 15

/* ── Sport color palette ── */
const sportColors: Record<string, string> = {
  volleyball: "#2563eb",
  basketball: "#ea580c",
  futsal: "#16a34a",
  handball: "#7c3aed",
}

/* ── SVG pin background template ── */
function pinSvg(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="36" height="44">
    <defs>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity="0.25"/>
      </filter>
    </defs>
    <path d="M18 2C9.72 2 3 9.16 3 18c0 11.6 15 24 15 24s15-12.4 15-24C33 9.16 26.28 2 18 2z" fill="${fill}" filter="url(#s)"/>
    <circle cx="18" cy="18" r="5" fill="#fff" opacity="0.2"/>
  </svg>`
}

/* ── Sport icon SVGs (centered inside the pin) ── */
const sportIcons: Record<string, string> = {
  volleyball: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M3 5c4 4 8 1 14 1M2 10c6 3 10-2 16 0M4 16c4-4 6 0 12-2" stroke="#fff" stroke-width="0.8" opacity="0.7"/></svg>`,
  basketball: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M10 2v16M2 6c4 2 12 2 16 0M2 14c4-2 12-2 16 0" stroke="#fff" stroke-width="0.8" opacity="0.7"/></svg>`,
  futsal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M6 6l8 8M14 6l-8 8" stroke="#fff" stroke-width="1" opacity="0.5"/><path d="M10 2a8 8 0 010 16" stroke="#fff" stroke-width="0.8" fill="none" opacity="0.4"/></svg>`,
  handball: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="#fff" stroke-width="1.4"/><circle cx="7" cy="7" r="1.5" fill="#fff"/><circle cx="13" cy="7" r="1.5" fill="#fff"/><path d="M7 14c0-2 2.5-3 6-2" stroke="#fff" stroke-width="1" fill="none"/></svg>`,
}

export function getSportColor(sportType?: string): string {
  return sportColors[sportType || ""] || "#6b7280"
}

export function getSportIcon(sportType?: string): string {
  return sportIcons[sportType || ""] || sportIcons.volleyball
}

/**
 * Creates a beautiful teardrop pin marker for a court.
 */
export function createCourtIcon(sportType?: string): L.DivIcon {
  const color = getSportColor(sportType)
  const iconSvg = getSportIcon(sportType)
  return L.divIcon({
    html: `<div class="relative" style="width:36px;height:44px">
      ${pinSvg(color)}
      <div class="absolute inset-0 flex items-center justify-center" style="padding-bottom:8px">${iconSvg}</div>
    </div>`,
    className: "",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  })
}

/**
 * Creates a user location marker (pulsing dot).
 */
export function createUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div class="relative" style="width:24px;height:24px">
      <div class="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
      <div class="absolute inset-[3px] rounded-full bg-blue-500/40 animate-pulse"></div>
      <div class="absolute inset-[6px] rounded-full bg-blue-600 border-2 border-white shadow-lg"></div>
    </div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

/**
 * Default map pin icon (for single-location maps).
 */
export function createDefaultPinIcon(): L.DivIcon {
  return L.divIcon({
    html: pinSvg("hsl(var(--primary))"),
    className: "",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  })
}
