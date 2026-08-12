"use client"

import { useEffect } from "react"

/**
 * Lock page scroll by setting overflow:hidden on the scroll container (html).
 * react-remove-scroll targets body, but our scroll container is html — so we
 * lock html too to prevent scroll chaining to the page behind modals/drawers.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return

    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = "hidden"

    return () => {
      html.style.overflow = prev
    }
  }, [active])
}
