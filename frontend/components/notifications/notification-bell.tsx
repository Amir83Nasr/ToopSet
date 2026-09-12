"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { cn, toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const POLL_INTERVAL_MS = 60_000

/**
 * Header bell with the unread-notification count.
 *
 * Polls `/notifications/unread-count` on mount, on window focus, and once a
 * minute. Auth or network failures render as "no unread" — the bell must never
 * block navigation.
 */
export function NotificationBell({ className }: { className?: string }) {
  const { isAuthenticated } = useAuth()
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ count: number }>(
        "/api/v1/notifications/unread-count"
      )
      setUnread(res.count ?? 0)
    } catch {
      setUnread(0)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const initial = setTimeout(() => refresh(), 0)
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS)
    const onFocus = () => refresh()
    const onChanged = () => refresh()
    window.addEventListener("focus", onFocus)
    window.addEventListener("notifications:changed", onChanged)
    return () => {
      clearTimeout(initial)
      window.clearInterval(timer)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("notifications:changed", onChanged)
    }
  }, [isAuthenticated, refresh])

  if (!isAuthenticated) return null

  const label =
    unread > 0
      ? `اعلان‌ها — ${toPersianDigits(unread)} اعلان خوانده نشده`
      : "اعلان‌ها"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          asChild
          className={cn(
            "relative text-muted-foreground transition-colors hover:text-foreground max-sm:size-11",
            className
          )}
        >
          <Link href="/dashboard/notifications" aria-label={label}>
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute -start-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-bold text-white tabular-nums">
                {unread > 9 ? "۹+" : toPersianDigits(unread)}
              </span>
            )}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
