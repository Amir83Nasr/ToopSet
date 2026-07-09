"use client"

import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { flushSync } from "react-dom"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const themes = ["light", "dark"] as const

const icons: Record<string, typeof Sun> = {
  light: Sun,
  dark: Moon,
}

const labels: Record<string, string> = {
  light: "روشن",
  dark: "تیره",
}

function toggleThemeWithTransition(
  theme: string,
  setTheme: (t: string) => void
) {
  if (typeof document !== "undefined" && document.startViewTransition) {
    document.startViewTransition(() => {
      flushSync(() => setTheme(theme))
    })
  } else {
    setTheme(theme)
  }
}

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const current = theme || "light"
  const cycle = useCallback(() => {
    const idx = themes.indexOf(current as (typeof themes)[number])
    const next = themes[(idx + 1) % themes.length]
    toggleThemeWithTransition(next, setTheme)
  }, [current, setTheme])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="max-sm:size-11"
        disabled
        aria-label="تغییر تم"
      >
        <Sun className="size-4" />
      </Button>
    )
  }

  const Icon = icons[current] || Sun

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={cycle}
          className="text-muted-foreground transition-colors hover:text-foreground max-sm:size-11"
          aria-label={`تم فعلی: ${labels[current] || "روشن"}`}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>تغییر تم به {current === "light" ? "تیره" : "روشن"}</p>
      </TooltipContent>
    </Tooltip>
  )
}
