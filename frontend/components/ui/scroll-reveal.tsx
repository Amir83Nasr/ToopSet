"use client"

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from "react"

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
  /** Animation variant (default: "fade-in-up") */
  animation?: AnimationVariant
  /** Delay in ms before animation starts */
  delay?: number
  /** Intersection threshold (0-1) */
  threshold?: number
  /** Only animate once (default: true) */
  once?: boolean
  /** Stagger delay between each child in ms (default: 0 = no stagger) */
  stagger?: number
  /** Hide element initially (default: true) */
  initialHidden?: boolean
}

const animClass: Record<AnimationVariant, string> = {
  "fade-in-up": "animate-fade-in-up",
  "fade-in-down": "animate-fade-in-down",
  "fade-in-left": "animate-fade-in-left",
  "fade-in-right": "animate-fade-in-right",
  "scale-in": "animate-scale-in",
  none: "",
}

const initialClass: Record<AnimationVariant, string> = {
  "fade-in-up": "translate-y-6 opacity-0",
  "fade-in-down": "-translate-y-6 opacity-0",
  "fade-in-left": "translate-x-6 opacity-0",
  "fade-in-right": "-translate-x-6 opacity-0",
  "scale-in": "scale-90 opacity-0",
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
  initialHidden = true,
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

  const anim = animClass[animation]
  const init = initialHidden ? initialClass[animation] : ""

  // Stagger children
  if (stagger > 0 && visible) {
    const childrenArray = Children.toArray(children)
    return (
      <div ref={ref} className={className}>
        {childrenArray.map((child, i) => {
          if (!isValidElement<{ className?: string; style?: React.CSSProperties }>(child)) return child
          return cloneElement(child, {
            className: `${child.props.className || ""} ${anim}`,
            style: {
              ...child.props.style,
              animationDelay: `${delay + i * stagger}ms`,
            },
          })
        })}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? anim : init}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
