"use client"

import {
  LocationPickerView,
  setupQomPickWorker,
  type Venue,
} from "@amir83nasr/map"
import "@amir83nasr/map/styles.css"
import { toast } from "@/lib/toast"
import { toPersianDigits } from "@/lib/utils"
import { QOM_SUGGESTIONS_EXTENDED } from "@/lib/qom-suggestions"

// ponytail: workers land in public/maplibre via scripts/copy-maplibre-workers.mjs
// (postinstall/prebuild). Gray map + .qp-map-err overlay = worker 404, rerun it.
setupQomPickWorker("/maplibre/maplibre-gl-worker.mjs")

export interface MapVenue extends Venue {
  id: number
}

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  /** Final pick — engine `onConfirm` (modal "تایید" button). */
  onLocationChange?: (lat: number, lng: number, address?: string) => void
  height?: number | string
  /** Remount key salt — bump when the visible container size changes. */
  instanceKey?: string
  /** Generic pins — engine applies them on mount only. */
  markers?: Venue[]
  /** Fired when a venue pin is tapped (engine also moves the map there). */
  onPick?: (lat: number, lng: number) => void
  /** Hide the in-map confirm button (direct-confirm mode). */
  hideConfirm?: boolean
  /** Live center — engine `onLocationChange` (fires on every move). */
  onLiveChange?: (lat: number, lng: number, address?: string) => void
  /** Fired when reverse-geocode resolves (carries the fresh address). */
  onAddressResolved?: (lat: number, lng: number, address?: string) => void
}

/** Address picker on @amir83nasr/map - Persian UI, Qom center. Saves on confirm only. */
export function LocationPicker({
  latitude,
  longitude,
  onLocationChange = () => {},
  height = 450,
  instanceKey = "",
  markers,
  onPick,
  hideConfirm = false,
  onLiveChange,
  onAddressResolved,
}: LocationPickerProps) {
  const hasLocation = latitude != null && longitude != null
  const centerKey = hasLocation
    ? String(latitude) + "," + String(longitude)
    : "empty"

  return (
    <LocationPickerView
      key={instanceKey ? instanceKey + ":" + centerKey : centerKey}
      style={{ height }}
      map={
        hasLocation && latitude != null && longitude != null
          ? { center: { lat: latitude, lng: longitude }, zoom: 15 }
          : undefined
      }
      search={{
        placeholder: "جست‌وجوی آدرس، محله، خیابان...",
        suggestions: QOM_SUGGESTIONS_EXTENDED,
        limit: QOM_SUGGESTIONS_EXTENDED.length,
      }}
      {...(hideConfirm ? { controls: { confirmButton: false } } : {})}
      onConfirm={(loc) =>
        onLocationChange(loc.lat, loc.lng, toPersianDigits(loc.address))
      }
      {...(onLiveChange
        ? {
            onLocationChange: (loc: { lat: number; lng: number }) =>
              onLiveChange(loc.lat, loc.lng),
          }
        : {})}
      {...(onAddressResolved
        ? {
            onAddressResolved: (loc: {
              lat: number
              lng: number
              address: string
            }) =>
              onAddressResolved(loc.lat, loc.lng, toPersianDigits(loc.address)),
          }
        : {})}
      {...(markers ? { markers } : {})}
      {...(onPick
        ? {
            onPick: (loc: { lat: number; lng: number }) =>
              onPick(loc.lat, loc.lng),
          }
        : {})}
      onError={(err) =>
        toast.error("خطا در بارگذاری نقشه", { description: err.message })
      }
    />
  )
}
