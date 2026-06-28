import { vi } from "vitest"

// Mock next/link to render as a plain anchor in test environment
// This avoids issues with Next.js Link requiring a Router context
vi.mock("next/link", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children, href, ...props }: Record<string, any>) => {
    return (
      <a href={href as string} {...props}>
        {children}
      </a>
    )
  },
}))
