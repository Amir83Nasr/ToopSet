"use client"

import * as React from "react"
import { flushSync } from "react-dom"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { pwaConfig } from "@/config/pwa"

// ── Theme transition helpers ────────────────────────────────────────────────

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

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

// ── Click tracker for view-transition origin ────────────────────────────────

function ThemeClickTracker() {
  React.useEffect(() => {
    function recordClick(e: MouseEvent) {
      document.documentElement.style.setProperty("--theme-x", `${e.clientX}px`)
      document.documentElement.style.setProperty("--theme-y", `${e.clientY}px`)
    }
    window.addEventListener("click", recordClick)
    return () => window.removeEventListener("click", recordClick)
  }, [])
  return null
}

// ── Keyboard shortcut (D key) ──────────────────────────────────────────────

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (!event.key || event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      toggleThemeWithTransition(
        resolvedTheme === "dark" ? "light" : "dark",
        setTheme
      )
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

// ── Sync chrome meta theme-color with resolved theme ────────────────────────

function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    // Next.js renders viewport theme-color metas via React. Removing those
    // nodes imperatively orphans React fibers -> "null (reading
    // 'removeChild')" on next commit. Mutate attributes in place instead;
    // duplicate tags with identical content are harmless (browser uses last).
    const color =
      resolvedTheme === "dark" ? pwaConfig.themeColorDark : pwaConfig.themeColor
    const metas = document.querySelectorAll('meta[name="theme-color"]')
    if (metas.length === 0) {
      const meta = document.createElement("meta")
      meta.name = "theme-color"
      meta.content = color
      document.head.appendChild(meta)
      return
    }
    metas.forEach((meta) => {
      meta.setAttribute("content", color)
      meta.removeAttribute("media")
    })
  }, [resolvedTheme])

  return null
}

// ── Provider ───────────────────────────────────────────────────────────────

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      {...props}
    >
      <ThemeClickTracker />
      <ThemeHotkey />
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  )
}

export { ThemeProvider, toggleThemeWithTransition }
