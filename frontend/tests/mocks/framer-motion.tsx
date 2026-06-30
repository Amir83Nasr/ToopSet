import { vi } from "vitest"

// Mock framer-motion to render children directly without animation
vi.mock("framer-motion", () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: ({ children, ...props }: Record<string, any>) => {
      const { initial, animate, transition, ...rest } = props
      void initial
      void animate
      void transition
      return <div {...rest}>{children}</div>
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1: ({ children, ...props }: Record<string, any>) => {
      const { initial, animate, transition, ...rest } = props
      void initial
      void animate
      void transition
      return <h1 {...rest}>{children}</h1>
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p: ({ children, ...props }: Record<string, any>) => {
      const { initial, animate, transition, ...rest } = props
      void initial
      void animate
      void transition
      return <p {...rest}>{children}</p>
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    span: ({ children, ...props }: Record<string, any>) => {
      const { initial, animate, transition, ...rest } = props
      void initial
      void animate
      void transition
      return <span {...rest}>{children}</span>
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    section: ({ children, ...props }: Record<string, any>) => {
      const { initial, animate, transition, ...rest } = props
      void initial
      void animate
      void transition
      return <section {...rest}>{children}</section>
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    svg: ({ children, ...props }: Record<string, any>) => {
      const { initial, animate, transition, ...rest } = props
      void initial
      void animate
      void transition
      return <svg {...rest}>{children}</svg>
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    g: ({ children, ...props }: Record<string, any>) => {
      const { initial, animate, transition, ...rest } = props
      void initial
      void animate
      void transition
      return <g {...rest}>{children}</g>
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
