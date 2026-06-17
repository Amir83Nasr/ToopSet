"use client"

import { CheckCircle2, X, Building2 } from "lucide-react"
import {
  SectionHeading,
  amenityLabels,
  amenityIcons,
} from "@/components/courts/court-shared"

interface CourtAmenitiesProps {
  amenities: Record<string, boolean>
}

export function CourtAmenities({ amenities }: CourtAmenitiesProps) {
  if (!amenities || Object.keys(amenities).length === 0) return null

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <SectionHeading
        icon={<Building2 className="size-5" />}
        title="امکانات و خدمات"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.entries(amenities).map(([key, val]) => {
          const Icon = amenityIcons[key]
          return (
            <div
              key={key}
              className={`group flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                val
                  ? "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 dark:border-primary/20 dark:bg-primary/10 dark:hover:border-primary/40 dark:hover:bg-primary/15"
                  : "border-border/40 bg-muted/10 text-muted-foreground/40 hover:border-border"
              }`}
            >
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                  val
                    ? "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground/30"
                }`}
              >
                {Icon ? (
                  <Icon className="size-5" />
                ) : val ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <X className="size-5" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm leading-tight font-medium ${
                    val ? "" : "line-through"
                  }`}
                >
                  {amenityLabels[key] || key}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
