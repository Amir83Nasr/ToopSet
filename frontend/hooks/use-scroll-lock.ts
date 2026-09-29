"use client"

import { useLayoutEffect } from "react"

let lockCount = 0
let prevOverflow = ""
let prevPadding = ""

/**
 * html scroll lock (html is the scroll container here, not body).
 *
 * Root cause (verified with headless-Chrome CDP on the real page):
 * `overflow-y: scroll` on html only forces the scrollbar track visible, it
 * does NOT reserve the gutter. Setting `overflow: hidden` on html drops the
 * gutter (innerWidth - clientWidth 6 -> 0) and the fixed header jumps
 * 1274 -> 1280px. So: measure the gutter BEFORE locking and re-reserve it
 * with padding-inline-start/end matching the scrollbar side (RTL puts the
 * classic scrollbar at inline-start/left, LTR at inline-end/right),
 * restore both on release. Refcounted for nested dialogs.
 *
 * Radix RemoveScroll locks body in parallel; its own margin compensation
 * is neutralized in globals.css so only this html compensation applies.
 */
export function useScrollLock(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return

    const html = document.documentElement
    lockCount += 1
    if (lockCount === 1) {
      prevOverflow = html.style.overflow
      prevPadding = html.style.paddingInlineStart
      const gutter = Math.max(0, window.innerWidth - html.clientWidth)
      html.style.overflow = "hidden"
      if (gutter > 0) html.style.paddingInlineStart = `${gutter}px`
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) {
        html.style.overflow = prevOverflow
        html.style.paddingInlineStart = prevPadding
      }
    }
  }, [active])
}
