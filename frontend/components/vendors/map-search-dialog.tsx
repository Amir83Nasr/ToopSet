"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import {
  LocationPicker,
  type MapVenue,
} from "@/components/vendors/location-picker"

export interface MapSearchVendor {
  id: number
  name: string
  latitude: number
  longitude: number
}

interface MapSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendors?: MapSearchVendor[]
}

// ponytail: package venues carry no id, so match the tapped pin back to the
// nearest vendor within 300m.
function nearestVendor(
  vendors: MapSearchVendor[],
  lat: number,
  lng: number
): MapSearchVendor | null {
  let best: MapSearchVendor | null = null
  let bestDist = 0.3
  for (const v of vendors) {
    const dLat = (v.latitude - lat) * 111.32
    const dLng = (v.longitude - lng) * 111.32 * Math.cos((lat * Math.PI) / 180)
    const d = Math.hypot(dLat, dLng)
    if (d < bestDist) {
      bestDist = d
      best = v
    }
  }
  return best
}

/** Fullscreen venue map - tap a pin to select, then go to the vendor page. */
export function MapSearchDialog({
  open,
  onOpenChange,
  vendors = [],
}: MapSearchDialogProps) {
  const router = useRouter()
  useScrollLock(open)
  const [selected, setSelected] = useState<MapSearchVendor | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const markers: MapVenue[] = useMemo(
    () =>
      vendors.map((v) => ({
        id: v.id,
        name: v.name,
        lat: v.latitude,
        lng: v.longitude,
      })),
    [vendors]
  )

  const handlePick = useCallback(
    (lat: number, lng: number) => {
      const hit = nearestVendor(vendors, lat, lng)
      if (hit) setSelected(hit)
    },
    [vendors]
  )

  const handleGo = useCallback(() => {
    if (!selected) return
    onOpenChange(false)
    router.push(`/vendors/${selected.id}`)
  }, [selected, onOpenChange, router])

  // Reset selection each time the dialog opens (render-time adjustment,
  // not an effect, to avoid cascading renders).
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) setSelected(null)
  }

  // Find the package's .qp-sheet-row slot; CTA renders there via portal
  // (desktop: right panel, mobile: bottom sheet under search).
  const [ctaSlot, setCtaSlot] = useState<Element | null>(null)
  if (!open && ctaSlot !== null) setCtaSlot(null)
  useEffect(() => {
    if (!open) return
    let tries = 0
    const timer = setInterval(() => {
      const row = containerRef.current?.querySelector(".qp-sheet-row")
      if (row) {
        setCtaSlot(row)
        clearInterval(timer)
        return
      }
      if (++tries > 20) clearInterval(timer)
    }, 250)
    return () => clearInterval(timer)
  }, [open])

  if (!open) return null

  // Portal to body so fixed overlay escapes any stacking context or overflow:hidden ancestor
  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="جستجو از روی نقشه"
      className="fixed inset-0 z-[70] flex flex-col bg-background"
      data-map-search-open=""
    >
      {/* Floating close button — 36px white circle, same look as package .qp-ov-close */}
      <div className="absolute top-4 left-4 z-[80]">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="بستن نقشه"
          className="map-x-btn grid size-9 shrink-0 place-items-center rounded-full border border-border bg-white text-muted-foreground shadow-lg transition-colors hover:bg-muted"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <LocationPicker
          latitude={null}
          longitude={null}
          height="100%"
          instanceKey="search"
          markers={markers}
          hideConfirm
          onPick={handlePick}
          onLocationChange={() => {}}
        />
      </div>
      {ctaSlot ? (
        createPortal(
          <div data-map-cta style={{ width: "100%" }}>
            {selected && (
              <p className="mb-2 truncate text-sm font-medium">
                {selected.name}
              </p>
            )}
            <Button
              type="button"
              size="md"
              className="w-full"
              disabled={!selected}
              onClick={handleGo}
            >
              رفتن به مجموعه انتخاب شده
            </Button>
          </div>,
          ctaSlot
        )
      ) : (
        <div className="border-t px-4 py-3">
          {selected && (
            <p className="mb-2 truncate text-sm font-medium">{selected.name}</p>
          )}
          <Button
            type="button"
            size="md"
            className="w-full"
            disabled={!selected}
            onClick={handleGo}
          >
            رفتن به مجموعه انتخاب شده
          </Button>
        </div>
      )}
    </div>,
    document.body
  )
}
