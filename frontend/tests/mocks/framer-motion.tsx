import { vi } from "vitest"

// Mock framer-motion to render children directly without animation.
// Strips animation-only props so they don't leak onto the DOM node.
vi.mock("framer-motion", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const strip = (props: Record<string, any>) => {
    const { initial, animate, exit, transition, variants, ...rest } = props
    void initial
    void animate
    void exit
    void transition
    void variants
    return rest
  }

  const motionEl = (Tag: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Motion = ({ children, ...props }: Record<string, any>) => {
      const Component = Tag as React.ElementType
      return <Component {...strip(props)}>{children}</Component>
    }
    Motion.displayName = `motion.${Tag}`
    return Motion
  }

  return {
    motion: {
      div: motionEl("div"),
      h1: motionEl("h1"),
      p: motionEl("p"),
      span: motionEl("span"),
      section: motionEl("section"),
      svg: motionEl("svg"),
      g: motionEl("g"),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useReducedMotion: () => false,
  }
})
