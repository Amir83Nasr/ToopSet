"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, MapPin, Star, Trash2 } from "lucide-react"
import { toast } from "@/lib/toast"

const sportLabels: Record<string, string> = {
  volleyball: "والیبال",
  basketball: "بسکتبال",
  futsal: "فوتسال",
  handball: "هندبال",
}

interface Court {
  id: number
  name: string
  sport_types: string[]
  address: string
  average_rating: number
}

interface Favorite {
  id: number
  court_id: number
  court?: Court
}

const sportColors: Record<string, string> = {
  volleyball: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  basketball:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  futsal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  handball:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFavorites = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<Favorite[]>("/api/v1/favorites")
      // Fetch court details for each favorite
      const withCourts = await Promise.all(
        data.map(async (fav) => {
          try {
            const court = await api<Court>(`/api/v1/courts/${fav.court_id}`)
            return { ...fav, court }
          } catch {
            return { ...fav, court: null }
          }
        })
      )
      setFavorites(withCourts.filter((f) => f.court !== null))
    } catch {
      toast.error("خطا در دریافت لیست علاقه‌مندی‌ها")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFavorites()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchFavorites])

  const handleRemove = async (courtId: number) => {
    try {
      await api(`/api/v1/favorites/${courtId}`, { method: "DELETE" })
      setFavorites((prev) => prev.filter((f) => f.court_id !== courtId))
      toast.success("از علاقه‌مندی‌ها حذف شد")
    } catch {
      toast.error("خطا در حذف")
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="size-5 text-red-500" />
            علاقه‌مندی‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <Skeleton className="mb-2 h-5 w-40" />
                  <Skeleton className="h-4 w-60" />
                </div>
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <Heart className="size-12 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                هنوز هیچ مجموعهی به علاقه‌مندی‌ها اضافه نکرده‌اید
              </p>
              <Button asChild variant="outline">
                <Link href="/">جستجوی مجموعه‌ها</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map((fav) => {
                const court = fav.court
                if (!court) return null
                return (
                  <div
                    key={fav.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <Link
                      href={`/courts/${court.id}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold">{court.name}</h3>
                        <div className="flex flex-wrap gap-1">
                          {court.sport_types?.map((st: string) => (
                            <Badge
                              key={st}
                              className={sportColors[st] || ""}
                              variant="secondary"
                            >
                              {sportLabels[st] || st}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          <span className="truncate">{court.address}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" />
                          {court.average_rating?.toFixed(1) || "—"}
                        </span>
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(court.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
