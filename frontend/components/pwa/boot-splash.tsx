"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

// Cold-start splash: white page (black in dark mode), centered logo, no text.
// Server-rendered as part of first paint (PWA launch), fades out once window
// loads. Fallback timeout covers cases where load already fired or hangs.
export function BootSplash() {
  const [hide, setHide] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const done = () => setHide(true)
    if (document.readyState === "complete") done()
    else window.addEventListener("load", done, { once: true })
    const t = setTimeout(done, 2500)
    return () => {
      window.removeEventListener("load", done)
      clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (!hide) return
    const t = setTimeout(() => setGone(true), 400)
    return () => clearTimeout(t)
  }, [hide])

  if (gone) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-100 flex items-center justify-center bg-white transition-opacity duration-300 dark:bg-black",
        hide && "pointer-events-none opacity-0"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- instant paint, no JS dependency */}
      <img
        src="/icons/square.svg"
        alt="pwa-bootstrap-logo"
        width={96}
        height={96}
        className="size-24"
      />
    </div>
  )
}
