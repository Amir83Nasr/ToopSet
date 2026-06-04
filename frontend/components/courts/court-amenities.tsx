"use client"

import { Building2, CheckCircle2, XCircle } from "lucide-react"
import { SectionHeading, amenityLabels } from "@/components/courts/court-shared"

interface CourtAmenitiesProps {
  amenities: Record<string, boolean>
}

export function CourtAmenities({ amenities }: CourtAmenitiesProps) {
  if (!amenities || Object.keys(amenities).length === 0) return null

  return (
    <div className="rounded-xl border bg-card p-5">
      <SectionHeading icon={<Building2 className="size-5" />} title="امکانات" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.entries(amenities).map(([key, val]) => (
          <div
            key={key}
            className={`flex items-center gap-2.5 rounded-lg border p-3 text-sm transition-colors ${
              val
                ? "border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/10"
                : "border-border/50 bg-muted/20 text-muted-foreground/50"
            }`}
          >
            {val ? (
              <CheckCircle2 className="size-4 shrink-0 text-green-500" />
            ) : (
              <XCircle className="size-4 shrink-0 text-muted-foreground/30" />
            )}
            <span className={val ? "font-medium" : "line-through"}>
              {amenityLabels[key] || key}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
