"use client"

import { Suspense, useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

// ── Timing constants ─────────────────────────────────────────────────────────
// Instant/prefetched navigations complete before SHOW_DELAY elapses, so the
// bar never flashes for them — it only appears when a route genuinely takes
// time (dev roundtrips, cold network, unprefetched targets).

const SHOW_DELAY_MS = 120
const CREEP_INTERVAL_MS = 200
const FADE_MS = 250
const MAX_DURATION_MS = 8000

function RouteProgressBar() {
  const pathname = usePathname()
  const search = searchParamsToString(useSearchParams())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const barRef = useRef<HTMLDivElement | null>(null)
  // Controller is wired up by the mount effect; the URL-change effect below
  // finishes the bar through it. Keeps timer state out of React renders.
  const ctrl = useRef<{ start: () => void; finish: () => void } | null>(null)

  // ── URL change ⇒ navigation committed ⇒ finish the bar ────────────────────
  useEffect(() => {
    ctrl.current?.finish()
  }, [pathname, search])

  // ── Navigation start signals + imperative bar animation ────────────────────
  useEffect(() => {
    const container = containerRef.current
    const bar = barRef.current
    if (!container || !bar) return

    let visible = false
    let progress = 0
    let showTimer: ReturnType<typeof setTimeout> | null = null
    let creepTimer: ReturnType<typeof setInterval> | null = null
    let fadeTimer: ReturnType<typeof setTimeout> | null = null
    let maxTimer: ReturnType<typeof setTimeout> | null = null

    const paint = () => {
      bar.style.transform = `scaleX(${progress})`
      container.style.opacity = visible ? "1" : "0"
    }

    const clearTimers = () => {
      if (showTimer) clearTimeout(showTimer)
      if (creepTimer) clearInterval(creepTimer)
      if (fadeTimer) clearTimeout(fadeTimer)
      if (maxTimer) clearTimeout(maxTimer)
      showTimer = creepTimer = fadeTimer = maxTimer = null
    }

    const finish = () => {
      // Navigation landed before the bar was shown — it was instant; skip.
      if (showTimer) {
        clearTimeout(showTimer)
        showTimer = null
        return
      }
      if (!visible) return
      clearTimers()
      progress = 1
      paint()
      fadeTimer = setTimeout(() => {
        visible = false
        paint()
        fadeTimer = setTimeout(() => {
          progress = 0
          paint()
        }, FADE_MS)
      }, FADE_MS)
    }

    const start = () => {
      if (fadeTimer) {
        clearTimeout(fadeTimer)
        fadeTimer = null
      }
      if (visible || showTimer) return // already tracking a navigation
      showTimer = setTimeout(() => {
        showTimer = null
        visible = true
        progress = 0.1
        paint()
        creepTimer = setInterval(() => {
          // Asymptotic creep toward 90% — never completes on its own
          progress += (0.9 - progress) * 0.12
          paint()
        }, CREEP_INTERVAL_MS)
        maxTimer = setTimeout(finish, MAX_DURATION_MS)
      }, SHOW_DELAY_MS)
    }

    ctrl.current = { start, finish }

    // 1) Link clicks — capture phase so we see them before Next's own handler
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return
      const anchor = (e.target as HTMLElement | null)?.closest?.(
        "a[href]"
      ) as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target && anchor.target !== "_self") return
      if (anchor.hasAttribute("download")) return
      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return

      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      // Same-path clicks (hash jumps / re-nav) don't change the route
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return
      start()
    }
    document.addEventListener("click", onClick, true)

    // 2) Back/forward
    const onPopState = () => start()
    window.addEventListener("popstate", onPopState)

    // 3) Programmatic router.push/replace — the App Router commits the URL via
    //    the History API, so wrapping it catches every programmatic navigation.
    const nativePush = history.pushState.bind(history)
    const nativeReplace = history.replaceState.bind(history)
    let lastHref = window.location.href
    const wrap = (
      native: (data: unknown, unused: string, url?: string | URL | null) => void
    ) => {
      return (data: unknown, unused: string, url?: string | URL | null) => {
        native(data, unused, url)
        if (window.location.href !== lastHref) {
          lastHref = window.location.href
          start()
        }
      }
    }
    history.pushState = wrap(nativePush)
    history.replaceState = wrap(nativeReplace)

    return () => {
      ctrl.current = null
      clearTimers()
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("popstate", onPopState)
      history.pushState = nativePush
      history.replaceState = nativeReplace
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      // Pointer-transparent, sits above the header (z-40) but is only 3px
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px] opacity-0 transition-opacity duration-200"
    >
      {/* RTL app — the bar grows right-to-left */}
      <div
        ref={barRef}
        className="h-full w-full origin-right bg-primary shadow-[0_0_10px] shadow-primary/60"
        style={{
          transform: "scaleX(0)",
          transition: "transform 200ms ease-out",
        }}
      />
    </div>
  )
}

function searchParamsToString(params: URLSearchParams | null): string {
  return params?.toString() ?? ""
}

/**
 * Top route progress bar (nprogress-style, zero-dependency).
 *
 * Appears ~120ms after a navigation starts — prefetched/instant routes never
 * flash it — and completes when the new URL commits (pathname or search
 * change). Signals: Link clicks (capture), popstate, and history.pushState /
 * replaceState (catches router.push from anywhere in the app).
 *
 * Wrapped in Suspense because useSearchParams must not run during static
 * prerendering of pages that render this component from the root layout.
 */
export function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <RouteProgressBar />
    </Suspense>
  )
}
