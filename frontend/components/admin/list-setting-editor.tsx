"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/lib/toast"
import {
  Plus,
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Loader2,
  Save,
} from "lucide-react"

/* ── Props ── */

interface ListSettingEditorProps {
  settingKey: string
  label: string
  icon?: React.ReactNode
  className?: string
}

/* ── Helpers ── */

function parseItems(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : []
  } catch {
    return []
  }
}

/* ── Component ── */

export function ListSettingEditor({
  settingKey,
  label,
  className,
}: ListSettingEditorProps) {
  const [items, setItems] = useState<string[]>([""])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settingId, setSettingId] = useState<number | null>(null)

  const fetchSetting = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ id: number; key: string; value: string }[]>(
        "/api/v1/admin/settings"
      )
      const s = res.find((x) => x.key === settingKey)
      if (s) {
        setSettingId(s.id)
        const parsed = parseItems(s.value)
        setItems(parsed.length > 0 ? parsed : [""])
      }
    } catch {
      toast.error("خطا در دریافت تنظیمات")
    } finally {
      setLoading(false)
    }
  }, [settingKey])

  useEffect(() => {
    const timer = setTimeout(() => fetchSetting(), 0)
    return () => clearTimeout(timer)
  }, [fetchSetting])

  // ── Mutations ──

  const updateItem = (idx: number, value: string) => {
    setItems((prev) => prev.map((s, i) => (i === idx ? value : s)))
  }

  const addItem = () => {
    setItems((prev) => [...prev, ""])
  }

  const removeItem = (idx: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      return next.length === 0 ? [""] : next
    })
  }

  const moveItem = (idx: number, direction: "up" | "down") => {
    setItems((prev) => {
      const target = direction === "up" ? idx - 1 : idx + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  // ── Save ──

  const handleSave = async () => {
    if (!settingId) return

    const valid = items.filter((s) => s.trim().length > 0)
    setSaving(true)
    try {
      await api(`/api/v1/admin/settings/${settingId}`, {
        method: "PUT",
        body: JSON.stringify({ value: JSON.stringify(valid) }),
      })
      toast.success(`${label} ذخیره شد`)
    } catch {
      toast.error("خطا در ذخیره")
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──

  if (loading) {
    return (
      <div className={className}>
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="mb-2 h-24 w-full" />
        <Skeleton className="mb-2 h-24 w-full" />
      </div>
    )
  }

  if (!settingId) {
    return null
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-muted-foreground">{label}</h2>
        <Button variant="outline" onClick={addItem}>
          <Plus className="me-1 size-4" />
          افزودن بند
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 rounded-lg border bg-card p-3"
          >
            {/* number */}
            <div className="mt-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              {toPersianDigits(idx + 1)}
            </div>

            {/* drag handle (visual) */}
            <div className="mt-2 shrink-0 text-muted-foreground/40">
              <GripVertical className="size-4" />
            </div>

            {/* input */}
            <div className="min-w-0 flex-1">
              <Textarea
                placeholder={`بند ${toPersianDigits(idx + 1)}...`}
                value={item}
                onChange={(e) => updateItem(idx, e.target.value)}
                rows={3}
                className="min-h-20 bg-background"
              />
            </div>

            {/* actions */}
            <div className="flex shrink-0 flex-col gap-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={idx === 0}
                onClick={() => moveItem(idx, "up")}
              >
                <ChevronUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={idx === items.length - 1}
                onClick={() => moveItem(idx, "down")}
              >
                <ChevronDown className="size-3.5" />
              </Button>
              <Button
                variant="destructive"
                size="icon-xs"
                onClick={() => removeItem(idx)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary + save */}
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="me-1.5 animate-spin" />
          ) : (
            <Save className="me-1.5" />
          )}
          ذخیره {label}
        </Button>
      </div>
    </div>
  )
}
