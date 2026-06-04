"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Heart, Loader2 } from "lucide-react"
import { toast } from "@/lib/toast"

interface FavoriteButtonProps {
  courtId: number
  className?: string
  size?: "sm" | "md"
}

export function FavoriteButton({
  courtId,
  className = "",
  size = "sm",
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [favorited, setFavorited] = useState(false)
  const [loading, setLoading] = useState(false)

  // Check if favorited on mount
  useEffect(() => {
    if (!isAuthenticated) return
    api<{ favorited_court_ids: number[] }>(
      `/api/v1/favorites/check?court_ids=${courtId}`
    )
      .then((data) => setFavorited(data.favorited_court_ids.includes(courtId)))
      .catch(() => {})
  }, [courtId, isAuthenticated])

  const toggle = useCallback(async () => {
    if (!isAuthenticated) {
      router.push(
        `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      )
      return
    }

    setLoading(true)
    try {
      if (favorited) {
        await api(`/api/v1/favorites/${courtId}`, { method: "DELETE" })
        setFavorited(false)
      } else {
        await api(`/api/v1/favorites/${courtId}`, { method: "POST" })
        setFavorited(true)
        toast.success("به علاقه‌مندی‌ها اضافه شد")
      }
    } catch {
      toast.error("خطا در به‌روزرسانی علاقه‌مندی")
    } finally {
      setLoading(false)
    }
  }, [courtId, favorited, isAuthenticated, router])

  const iconSize = size === "sm" ? "size-4" : "size-5"

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle()
      }}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : (
        <Heart
          className={`${iconSize} transition-colors ${
            favorited ? "fill-red-500 text-red-500" : "text-muted-foreground"
          }`}
        />
      )}
    </Button>
  )
}
