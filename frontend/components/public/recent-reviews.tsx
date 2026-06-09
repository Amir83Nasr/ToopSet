"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import { Star, ChevronLeft, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

interface Review {
  id: number
  rating: number
  comment: string | null
  user_name: string
  court_name: string
  court_id: number
  created_at: string
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/20"
          }
        />
      ))}
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function RecentReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api<{ reviews: Review[]; total: number }>(
          "/api/v1/reviews/recent?limit=6"
        )
        setReviews(res.reviews || [])
      } catch {
        // reviews may not be available
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  if (loading) {
    return (
      <section className="relative overflow-hidden px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary/40" />
              نظرات کاربران
            </div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              آخرین <span className="text-primary">نظرات</span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-5">
                <Skeleton className="mb-3 h-4 w-32" />
                <Skeleton className="mb-2 h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (reviews.length === 0) return null

  return (
    <section className="relative overflow-hidden border-t px-4 py-16 md:py-20">
      <div className="bg-grid absolute inset-0 opacity-15 dark:opacity-[0.03]" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-[400px] rounded-full bg-amber-400/3 blur-[100px]" />
      </div>

      <ScrollReveal className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground"
          >
            <span className="size-1.5 rounded-full bg-primary/40" />
            نظرات کاربران
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            آخرین <span className="text-primary">نظرات</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            آنچه کاربران درباره سالن‌ها می‌گویند
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {reviews.map((review, i) => (
              <CarouselItem
                key={review.id}
                className="pl-2 md:basis-1/2 md:pl-4 lg:basis-1/3"
              >
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="group flex h-full flex-col rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {(review.user_name || "ک")[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {review.user_name || "کاربر"}
                      </p>
                      <div className="flex items-center gap-2">
                        <Stars rating={review.rating} size={12} />
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {review.comment && (
                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {review.comment}
                    </p>
                  )}

                  <div className="mt-auto flex items-center gap-1.5 pt-4 text-xs text-muted-foreground/60">
                    <Building2 className="size-3" />
                    <span className="truncate">{review.court_name}</span>
                  </div>

                  <Link
                    href={`/courts/${review.court_id}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    مشاهده مجموعه
                    <ChevronLeft className="size-3" />
                  </Link>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="mt-6 flex justify-center gap-2">
            <CarouselPrevious className="static size-9 translate-y-0" />
            <CarouselNext className="static size-9 translate-y-0" />
          </div>
        </Carousel>

        <div className="mt-10 text-center">
          <Button variant="outline" asChild>
            <Link href="/?sort=rating">
              مشاهده همه نظرات
              <ChevronLeft className="mr-2 size-4" />
            </Link>
          </Button>
        </div>
      </ScrollReveal>
    </section>
  )
}
