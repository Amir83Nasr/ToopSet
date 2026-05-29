import L from "leaflet"

/**
 * Qom, Iran approximate bounding box.
 * Restricts map panning to the Qom area so users don't navigate
 * outside the city's geographical limits.
 */
export const QOM_BOUNDS: L.LatLngBoundsExpression = [
  [34.45, 50.65], // southwest
  [34.85, 51.10], // northeast
] as const

export const QOM_CENTER: [number, number] = [34.64, 50.88]

export const DEFAULT_ZOOM = 12
export const CLOSE_ZOOM = 15

/**
 * Creates a default marker icon for courts.
 */
export function createCourtIcon(sportType: string, color: string): L.DivIcon {
  return L.divIcon({
    html: `<div class="flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white" style="background-color: ${color}">
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
