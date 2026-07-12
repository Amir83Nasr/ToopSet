"use client"

import { useEffect, useState } from "react"
import { getApiBase } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const API_BASE = getApiBase()

/* ── Props ── */

interface TextListDisplayProps {
  /** Setting key to fetch (rules_text or privacy_text) */
  settingKey: string
  /** Optional callback to receive the updated_at string from the API */
  onUpdatedAt?: (date: string | null) => void
}

/* ── Component ── */

export function TextListDisplay({
  settingKey,
  onUpdatedAt,
}: TextListDisplayProps) {
  const [items, setItems] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(`${API_BASE}/api/v1/settings/public/text/${settingKey}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value)
            if (Array.isArray(parsed))
              setItems(parsed.filter((s): s is string => typeof s === "string"))
          } catch {
            /* ignore */
          }
        }
        if (onUpdatedAt && data?.updated_at) {
          onUpdatedAt(data.updated_at)
        }
      })
      .catch(() => {
        /* network/backend error — fall through to the empty state below */
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [settingKey, onUpdatedAt])

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{"محتوایی ثبت نشده است."}</p>
    )
  }

  return (
    <div className="space-y-8">
      {items.map((item, i) => (
        <section key={i} className="space-y-3">
          <h2 className="flex items-center gap-3 text-lg font-semibold">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {toPersianDigits(i + 1)}
            </span>
            {/* Extract the title from the text (before first colon) */}
            {item.includes(":")
              ? item.split(":")[0] + ":"
              : `بند ${toPersianDigits(i + 1)}`}
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            {item.includes(":")
              ? item.substring(item.indexOf(":") + 1).trim()
              : item}
          </p>
        </section>
      ))}
    </div>
  )
}
