"use client"

import { toPersianDigits } from "@/lib/utils"
import {
  Stars,
  sportLabels,
  type CourtData,
} from "@/components/courts/court-shared"
import { Users, Star, MessageSquareText, Swords } from "lucide-react"

interface QuickStatsProps {
  court: CourtData
  reviewsTotal: number
}

export function QuickStats({ court, reviewsTotal }: QuickStatsProps) {
  const sportCount = court.sport_types?.length || 0

  return (
    <div className="mb-10">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border bg-card/50 px-6 py-4 backdrop-blur-sm">
        {/* Capacity */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">
              ظرفیت
            </p>
            <p className="text-sm font-bold">
              {toPersianDigits(court.capacity)}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                نفر
              </span>
            </p>
          </div>
        </div>

        <div className="hidden h-10 w-px bg-border/60 sm:block" />

        {/* Sport types */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-chart-1/10">
            <Swords className="size-5 text-chart-1" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">
              رشته ورزشی
            </p>
            <p className="text-sm font-bold">
              {toPersianDigits(sportCount)}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                {sportCount === 1 ? "رشته" : "رشته"}
              </span>
            </p>
          </div>
        </div>

        <div className="hidden h-10 w-px bg-border/60 sm:block" />

        {/* Rating */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/20">
            <Star className="size-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">
              امتیاز
            </p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold">
                {toPersianDigits(court.average_rating.toFixed(1))}
              </p>
              <Stars rating={court.average_rating} size={12} />
            </div>
          </div>
        </div>

        <div className="hidden h-10 w-px bg-border/60 sm:block" />

        {/* Reviews count */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/20">
            <MessageSquareText className="size-5 text-sky-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">
              نظرات
            </p>
            <p className="text-sm font-bold">
              {toPersianDigits(reviewsTotal)}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                نظر
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
