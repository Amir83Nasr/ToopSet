"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const AMENITIES = [
  { key: "toilet", label: "سرویس بهداشتی" },
  { key: "water_cooler", label: "آبسردکن" },
  { key: "standard_flooring", label: "کفپوش استاندارد" },
  { key: "spectator_seating", label: "جایگاه تماشاگر" },
  { key: "air_conditioning", label: "تهویه مطبوع" },
  { key: "parking", label: "پارکینگ" },
  { key: "locker_room", label: "رختکن" },
]

interface AmenityCheckboxesProps {
  value: Record<string, boolean>
  onChange: (amenities: Record<string, boolean>) => void
}

export function AmenityCheckboxes({ value, onChange }: AmenityCheckboxesProps) {
  const current = value || {}

  function handleToggle(key: string, checked: boolean) {
    onChange({ ...current, [key]: checked })
  }

  return (
    <div className="space-y-2">
      <Label>امکانات</Label>
      <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
        {AMENITIES.map((amenity) => (
          <div key={amenity.key} className="flex items-center gap-2">
            <Checkbox
              id={`amenity-${amenity.key}`}
              checked={!!current[amenity.key]}
              onCheckedChange={(checked) => handleToggle(amenity.key, checked === true)}
            />
            <Label
              htmlFor={`amenity-${amenity.key}`}
              className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {amenity.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}

export { AMENITIES }
