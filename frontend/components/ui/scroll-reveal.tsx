"use client"

import { useRef, useEffect, useState, Children, isValidElement } from "react"

type AnimationVariant =
  | "fade-in-up"
  | "fade-in-down"
  | "fade-in-left"
  | "fade-in-right"
  | "scale-in"
  | "none"

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  animation?: AnimationVariant
  delay?: number
  threshold?: number
  once?: boolean
  stagger?: number
  initialHidden?: boolean
}

const CSS_CLASSES: Record<AnimationVariant, string> = {
  "fade-in-up": "animate-fade-in",
  "fade-in-down": "animate-fade-in-down",
  "fade-in-left": "animate-fade-in-left",
  "fade-in-right": "animate-fade-in-right",
  "scale-in": "animate-scale-in",
  none: "",
}

export function ScrollReveal({
  children,
  className = "",
  animation = "fade-in-up",
  delay = 0,
  threshold = 0.15,
  once = true,
  stagger = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) observer.unobserve(el)
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, once])

  const animClass = CSS_CLASSES[animation]
  const isVisible = animation === "none" || visible

  if (stagger > 0) {
    const childrenArray = Children.toArray(children)
    return (
      <div ref={ref} className={`${className} ${isVisible ? "" : "opacity-0"}`}>
        {childrenArray.map((child, i) => {
          if (!isValidElement(child)) return child
          return (
            <div
              key={i}
              className={isVisible ? animClass : "opacity-0"}
              style={{
                animationDelay: `${delay + i * stagger}s`,
                animationFillMode: "both",
              }}
            >
              {child}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? animClass : "opacity-0"}`}
      style={{
        animationDelay: `${delay}s`,
        animationFillMode: "both",
      }}
    >
      {children}
    </div>
  )
}
