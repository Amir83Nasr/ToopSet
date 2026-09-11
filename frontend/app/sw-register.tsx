"use client"

import { useEffect } from "react"

// ponytail: raw navigator.serviceWorker.register keeps @serwist/window (~22KB
// src) out of the main bundle. Upgrade to SerwistProvider only if client-side
// serwist features (e.g. messageSW cache updates) are ever needed.
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") {
      // Dev server never serves a compiled SW — drop any stale registration
      // left over from a previous prod build on the same origin (localhost),
      // otherwise it keeps serving prod caches to dev pages.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => {
          void r.unregister()
        })
      })
      return
    }
    // Defer SW install until after load so /sw.js never contends with LCP.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is best-effort — never break the page for it.
      })
    }
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])
  return null
}
