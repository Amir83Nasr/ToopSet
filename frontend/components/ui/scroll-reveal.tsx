"use client"

import { motion, type Variants } from "framer-motion"
import { Children, isValidElement } from "react"

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
  /** Delay in seconds before animation starts */
  delay?: number
  /** Intersection threshold (0-1) */
  threshold?: number
  /** Only animate once (default: true) */
  once?: boolean
  /** Stagger delay between each child in seconds (default: 0 = no stagger) */
  stagger?: number
  /** Hide element initially (default: true) */
  initialHidden?: boolean
}

const animVariants: Record<AnimationVariant, Variants> = {
  "fade-in-up": {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-in-down": {
    hidden: { opacity: 0, y: -24 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-in-left": {
    hidden: { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0 },
  },
  "fade-in-right": {
    hidden: { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0 },
  },
  "scale-in": {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  none: {
    hidden: {},
    visible: {},
  },
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
  const anim = animVariants[animation]

  // Stagger children using framer-motion's staggerChildren
  if (stagger > 0) {
    const childrenArray = Children.toArray(children)
    return (
      <motion.div
        className={className}
        initial={initialHidden ? "hidden" : "visible"}
        whileInView="visible"
        viewport={{ once, amount: threshold }}
        variants={{
          visible: {
            transition: {
              staggerChildren: stagger,
              delayChildren: delay,
            },
          },
        }}
      >
        {childrenArray.map((child, i) => {
          if (!isValidElement(child)) return child
          return (
            <motion.div key={i} variants={anim}>
              {child}
            </motion.div>
          )
        })}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={className}
      initial={initialHidden ? "hidden" : "visible"}
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      variants={anim}
      transition={{ delay, duration: 0.5 }}
    >
      {children}
    </motion.div>
  )
}
