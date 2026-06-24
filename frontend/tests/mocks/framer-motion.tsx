import { vi } from "vitest"

// Mock framer-motion to render children directly without animation
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, transition, ...rest } = props
      void initial
      void animate
      void transition
      return <div {...rest}>{children}</div>
    },
    h1: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, transition, ...rest } = props
      void initial
      void animate
      void transition
      return <h1 {...rest}>{children}</h1>
    },
    p: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, transition, ...rest } = props
      void initial
      void animate
      void transition
      return <p {...rest}>{children}</p>
    },
    span: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, transition, ...rest } = props
      void initial
      void animate
      void transition
      return <span {...rest}>{children}</span>
    },
    section: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, transition, ...rest } = props
      void initial
      void animate
      void transition
      return <section {...rest}>{children}</section>
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
