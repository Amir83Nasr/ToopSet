"use client"

import { useEffect, useRef } from "react"

export function CursorAmbient() {
  const ref = useRef<HTMLDivElement>(null)
  const raf = useRef<number>(0)
  const mousePos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY }
      if (raf.current) return
      raf.current = requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.style.left = `${mousePos.current.x}px`
          ref.current.style.top = `${mousePos.current.y}px`
        }
        raf.current = 0
      })
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true })
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  return <div ref={ref} className="cursor-ambient" aria-hidden />
}
