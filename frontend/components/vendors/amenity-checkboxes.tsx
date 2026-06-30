"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"

const AMENITIES = [
  { key: "toilet", label: "سرویس بهداشتی" },
  { key: "water_cooler", label: "آبسردکن" },
  { key: "standard_flooring", label: "کفپوش استاندارد" },
  { key: "spectator_seating", label: "جایگاه تماشاگر" },
  { key: "air_conditioning", label: "تهویه مطبوع" },
  { key: "parking", label: "پارکینگ" },
  { key: "locker_room", label: "رختکن" },
  { key: "snack_bar", label: "بوفه" },
]

interface AmenityCheckboxesProps {
  value: Record<string, boolean>
  onChange: (amenities: Record<string, boolean>) => void
}

export function AmenityCheckboxes({ value, onChange }: AmenityCheckboxesProps) {
  const current = value || {}
  const [customKey, setCustomKey] = useState("")

  function handleToggle(key: string, checked: boolean) {
    onChange({ ...current, [key]: checked })
  }

  function handleAddCustom() {
    const trimmed = customKey.trim()
    if (!trimmed) return
    const key = `custom_${trimmed.replace(/\s+/g, "_")}`
    onChange({ ...current, [key]: true })
    setCustomKey("")
  }

  function handleRemoveCustom(key: string) {
    const next = { ...current }
    delete next[key]
    onChange(next)
  }

  const customAmenities = Object.keys(current).filter((k) =>
    k.startsWith("custom_")
  )

  return (
    <div className="space-y-2">
      <Label>امکانات</Label>
      <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
        {AMENITIES.map((amenity) => (
          <div key={amenity.key} className="flex items-center gap-2">
            <Checkbox
              id={`amenity-${amenity.key}`}
              checked={!!current[amenity.key]}
              onCheckedChange={(checked) =>
                handleToggle(amenity.key, checked === true)
              }
            />
            <Label
              htmlFor={`amenity-${amenity.key}`}
              className="text-sm leading-none font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {amenity.label}
            </Label>
          </div>
        ))}

        {/* Custom amenities */}
        {customAmenities.length > 0 && (
          <div className="col-span-2 border-t pt-3">
            <p className="mb-2 text-xs text-muted-foreground">
              امکانات اضافه شده
            </p>
            <div className="flex flex-wrap gap-2">
              {customAmenities.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-full border bg-primary/5 px-3 py-1 text-xs"
                >
                  <span className="font-medium">
                    {key.replace("custom_", "").replace(/_/g, " ")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleRemoveCustom(key)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3" />
                  </Button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add custom amenity */}
        <div className="col-span-2 flex items-center gap-2 border-t pt-3">
          <Input
            placeholder="نام امکان جدید..."
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAddCustom()
              }
            }}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustom}
            className="h-8 shrink-0 gap-1"
          >
            <Plus className="size-3.5" />
            افزودن
          </Button>
        </div>
      </div>
    </div>
  )
}

export { AMENITIES }
