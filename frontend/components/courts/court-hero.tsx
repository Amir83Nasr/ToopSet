"use client"

import { Badge } from "@/components/ui/badge"
import { FavoriteButton } from "@/components/courts/favorite-button"
import { toPersianDigits } from "@/lib/utils"
import {
  sportColors,
  sportLabels,
  Stars,
  formatPrice,
  type CourtData,
} from "@/components/courts/court-shared"
import { MapPin, Users, UserCircle } from "lucide-react"

interface CourtHeroProps {
  court: CourtData
  minPrice: number | null
  reviewsTotal: number
}

export function CourtHero({ court, minPrice, reviewsTotal }: CourtHeroProps) {
  return (
    <div className="mb-10">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {court.sport_types?.map((st) => (
          <Badge key={st} className={sportColors[st] || ""} variant="secondary">
            {sportLabels[st] || st}
          </Badge>
        ))}
        <div className="mr-auto">
          <FavoriteButton courtId={court.id} size="sm" />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {court.name}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <Stars rating={court.average_rating} size={16} />
            <span className="text-sm font-semibold">
              {toPersianDigits(court.average_rating.toFixed(1))}
            </span>
            {reviewsTotal > 0 && (
              <span className="text-sm text-muted-foreground">
                ({toPersianDigits(reviewsTotal)} نظر)
              </span>
            )}
          </div>
        </div>

        {minPrice && (
          <div className="shrink-0 rounded-xl border bg-background/60 px-5 py-3 text-center backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">قیمت هر سانس از</p>
            <p className="text-xl font-bold text-primary">
              {formatPrice(minPrice)}
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-4 shrink-0 text-primary/60" />
          <span className="max-w-[300px] truncate">{court.address}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-4 shrink-0 text-primary/60" />
          <span>ظرفیت {toPersianDigits(court.capacity)} نفر</span>
        </div>
        {court.manager_name && (
          <div className="flex items-center gap-1.5">
            <UserCircle className="size-4 shrink-0 text-primary/60" />
            <span>مدیر: {court.manager_name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
