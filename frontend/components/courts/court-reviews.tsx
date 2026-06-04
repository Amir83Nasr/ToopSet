"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Star } from "lucide-react"
import { toPersianDigits } from "@/lib/utils"
import {
  Stars,
  SectionHeading,
  formatPersianDate,
  type Review,
} from "@/components/courts/court-shared"

interface CourtReviewsProps {
  reviews: Review[]
  averageRating: number
  total: number
  courtId: number
}

function getReviewDistribution(reviews: Review[]): number[] {
  const dist = [0, 0, 0, 0, 0]
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++
  })
  return dist
}

export function CourtReviews({
  reviews,
  averageRating,
  total,
  courtId,
}: CourtReviewsProps) {
  if (!reviews || reviews.length === 0) return null

  const distribution = getReviewDistribution(reviews)

  return (
    <div className="rounded-xl border bg-card p-5">
      <SectionHeading
        icon={<Star className="size-5 text-amber-400" />}
        title="نظرات کاربران"
      />

      <div className="mb-6 flex flex-wrap items-start gap-6 rounded-lg bg-muted/30 p-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-4xl font-bold">
            {toPersianDigits(averageRating.toFixed(1))}
          </span>
          <Stars rating={averageRating} size={14} />
          <span className="text-xs text-muted-foreground">
            {toPersianDigits(total)} نظر
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star - 1]
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-left font-medium">
                  {toPersianDigits(star)}
                </span>
                <Star className="size-3 fill-amber-400 text-amber-400" />
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted-foreground/20">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-5 text-muted-foreground">
                  {toPersianDigits(count)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-4">
        {reviews.slice(0, 5).map((rev) => (
          <div
            key={rev.id}
            className="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/30"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {(rev.user_name || "ک")[0]}
                </div>
                <div>
                  <span className="text-sm font-medium">
                    {rev.user_name || "کاربر"}
                  </span>
                  <span className="mr-2 text-xs text-muted-foreground">
                    {formatPersianDate(rev.created_at)}
                  </span>
                </div>
              </div>
              <Stars rating={rev.rating} size={14} />
            </div>
            {rev.comment && (
              <p className="pr-11 text-sm leading-relaxed text-muted-foreground">
                {rev.comment}
              </p>
            )}
            {rev.response && (
              <div className="mt-3 mr-11 rounded-lg border-r-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  پاسخ مدیریت:
                </span>
                {rev.response}
              </div>
            )}
          </div>
        ))}
      </div>

      {total > 5 && (
        <Button variant="outline" className="mt-4 w-full" asChild>
          <Link href={`/courts/${courtId}/reviews`}>
            مشاهده همه {toPersianDigits(total)} نظر
            <ChevronLeft className="mr-2 size-4" />
          </Link>
        </Button>
      )}
    </div>
  )
}
