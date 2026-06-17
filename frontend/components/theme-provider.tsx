"use client"

import * as React from "react"
import { flushSync } from "react-dom"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

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
      {children}
    </NextThemesProvider>
  )
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

/* Track last click position for view-transition origin */
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

export { ThemeProvider }
