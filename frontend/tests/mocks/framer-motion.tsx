import { vi } from "vitest"

// Mock framer-motion to render children directly without animation
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const {
        initial: _initial,
        animate: _animate,
        transition: _transition,
        ...rest
      } = props
      return <div {...rest}>{children}</div>
    },
    h1: ({ children, ...props }: Record<string, unknown>) => {
      const {
        initial: _initial,
        animate: _animate,
        transition: _transition,
        ...rest
      } = props
      return <h1 {...rest}>{children}</h1>
    },
    p: ({ children, ...props }: Record<string, unknown>) => {
      const {
        initial: _initial,
        animate: _animate,
        transition: _transition,
        ...rest
      } = props
      return <p {...rest}>{children}</p>
    },
    span: ({ children, ...props }: Record<string, unknown>) => {
      const {
        initial: _initial,
        animate: _animate,
        transition: _transition,
        ...rest
      } = props
      return <span {...rest}>{children}</span>
    },
    section: ({ children, ...props }: Record<string, unknown>) => {
      const {
        initial: _initial,
        animate: _animate,
        transition: _transition,
        ...rest
      } = props
      return <section {...rest}>{children}</section>
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
