"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { LocationPicker } from "@/components/vendors/location-picker"

// ponytail: engine default center (Qom) — matches @amir83nasr/map internal default.
const FALLBACK_LAT = 34.6416
const FALLBACK_LNG = 50.8764

interface LocationPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  latitude: number | null
  longitude: number | null
  onConfirm: (lat: number, lng: number, address?: string) => void
}

/** Fullscreen map overlay - direct confirm, no engine final modal. */
export function LocationPickerDialog({
  open,
  onOpenChange,
  latitude,
  longitude,
  onConfirm,
}: LocationPickerDialogProps) {
  const [pending, setPending] = useState<{
    lat: number
    lng: number
    address?: string
  } | null>(() =>
    open
      ? { lat: latitude ?? FALLBACK_LAT, lng: longitude ?? FALLBACK_LNG }
      : null
  )

  // Reset pending when the dialog opens or the initial coords change.
  // Render-time adjustment (not an effect) to avoid cascading renders.
  const openKey = open
    ? `${latitude ?? "null"}:${longitude ?? "null"}`
    : "closed"
  const [prevOpenKey, setPrevOpenKey] = useState(openKey)
  if (prevOpenKey !== openKey) {
    setPrevOpenKey(openKey)
    if (open) {
      setPending({
        lat: latitude ?? FALLBACK_LAT,
        lng: longitude ?? FALLBACK_LNG,
      })
    }
  }

  const handleConfirm = useCallback(() => {
    if (!pending) return
    onConfirm(pending.lat, pending.lng, pending.address)
    onOpenChange(false)
  }, [onConfirm, onOpenChange, pending])

  const handleLiveChange = useCallback((lat: number, lng: number) => {
    setPending({ lat, lng, address: undefined })
  }, [])

  const handleAddressResolved = useCallback(
    (lat: number, lng: number, address?: string) => {
      setPending({ lat, lng, address })
    },
    []
  )

  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="انتخاب موقعیت روی نقشه"
      className="fixed inset-0 z-[60] flex flex-col bg-background"
    >
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">انتخاب موقعیت روی نقشه</h2>
          <p className="text-xs text-muted-foreground">
            نقطه را جابه‌جا کنید و تایید موقعیت را بزنید.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          aria-label="بستن نقشه"
        >
          <X className="size-5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          height="100%"
          instanceKey="dialog"
          hideConfirm
          onLiveChange={handleLiveChange}
          onAddressResolved={handleAddressResolved}
        />
      </div>
      <div className="flex items-center gap-2 border-t px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {pending?.address ?? "در حال پیدا کردن آدرس..."}
        </p>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!pending}
          className="gap-1.5"
        >
          <Check className="size-4" />
          تایید موقعیت
        </Button>
      </div>
    </div>
  )
}
