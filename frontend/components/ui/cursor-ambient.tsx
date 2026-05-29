"use client"

import { useEffect, useRef, useState } from "react"

export function CursorAmbient() {
  const dotRef = useRef<HTMLDivElement>(null)
  const trailRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const raf = useRef<number>(0)
  const mousePos = useRef({ x: 0, y: 0 })
  const trailPos = useRef({ x: -100, y: -100 })
  const glowPos = useRef({ x: -100, y: -100 })
  const initialized = useRef(false)
  const [pressed, setPressed] = useState(false)
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = "*, *::before, *::after { cursor: none !important }"
    document.head.appendChild(style)

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY }
      if (!initialized.current) {
        trailPos.current = { x: e.clientX, y: e.clientY }
        glowPos.current = { x: e.clientX, y: e.clientY }
        initialized.current = true
      }
      if (raf.current) return
      raf.current = requestAnimationFrame(() => {
        const { x, y } = mousePos.current

        if (dotRef.current) {
          dotRef.current.style.left = `${x}px`
          dotRef.current.style.top = `${y}px`
        }

        const tdx = x - trailPos.current.x
        const tdy = y - trailPos.current.y
        if (Math.abs(tdx) + Math.abs(tdy) < 2) {
          trailPos.current.x = x
          trailPos.current.y = y
        } else {
          trailPos.current.x += tdx * 0.2
          trailPos.current.y += tdy * 0.2
        }
        if (trailRef.current) {
          trailRef.current.style.left = `${trailPos.current.x}px`
          trailRef.current.style.top = `${trailPos.current.y}px`
        }

        const gdx = x - glowPos.current.x
        const gdy = y - glowPos.current.y
        if (Math.abs(gdx) + Math.abs(gdy) < 2) {
          glowPos.current.x = x
          glowPos.current.y = y
        } else {
          glowPos.current.x += gdx * 0.04
          glowPos.current.y += gdy * 0.04
        }
        if (glowRef.current) {
          glowRef.current.style.left = `${glowPos.current.x}px`
          glowRef.current.style.top = `${glowPos.current.y}px`
        }

        raf.current = 0
      })
    }

    const onMouseDown = () => setPressed(true)
    const onMouseUp = () => setPressed(false)

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      setHovering(
        !!target.closest("a, button, input, select, textarea, [role='button']")
      )
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true })
    window.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mouseup", onMouseUp)
    document.addEventListener("mouseover", onMouseOver, { passive: true })
    return () => {
      style.remove()
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mouseup", onMouseUp)
      document.removeEventListener("mouseover", onMouseOver)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <>
      <div ref={glowRef} className="cursor-ambient" aria-hidden />
      <div
        ref={trailRef}
        aria-hidden
        className="pointer-events-none fixed z-[9998] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-primary/8 transition-all duration-200 ease-out"
        style={{
          width: hovering ? 40 : 32,
          height: hovering ? 40 : 32,
          left: -100,
          top: -100,
          borderColor: hovering
            ? "oklch(from var(--color-primary) l c h / 0.4)"
            : "oklch(from var(--color-primary) l c h / 0.2)",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-1/2 rounded-full border backdrop-blur-sm transition-all duration-200 ease-out"
        style={{
          width: pressed ? 48 : hovering ? 16 : 12,
          height: pressed ? 48 : hovering ? 16 : 12,
          left: -100,
          top: -100,
          borderColor: hovering
            ? "oklch(from var(--color-primary) l c h / 0.7)"
            : "oklch(from var(--color-primary) l c h / 0.5)",
          backgroundColor: hovering
            ? "oklch(from var(--color-primary) l c h / 0.35)"
            : "oklch(from var(--color-primary) l c h / 0.2)",
        }}
      />
    </>
  )
}
