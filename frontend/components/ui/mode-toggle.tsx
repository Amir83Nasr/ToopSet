"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Monitor } from "lucide-react"

const themes = ["light", "dark", "system"] as const

const icons: Record<string, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const labels: Record<string, string> = {
  light: "روشن",
  dark: "تیره",
  system: "سیستم",
}

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        disabled
        aria-label="تغییر تم"
      >
        <Sun className="size-4" />
      </Button>
    )
  }

  const current = theme || "system"
  const Icon = icons[current] || Sun

  function cycle() {
    const idx = themes.indexOf(current as (typeof themes)[number])
    setTheme(themes[(idx + 1) % themes.length])
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      className="size-9 text-muted-foreground transition-colors hover:text-foreground"
      aria-label={`تم فعلی: ${labels[current] || "سیستم"}`}
      title={`تم فعلی: ${labels[current] || "سیستم"}`}
    >
      <Icon className="size-4" />
    </Button>
  )
}
