import { vi } from "vitest"

// Mock next/link to render as a plain anchor in test environment
// This avoids issues with Next.js Link requiring a Router context
vi.mock("next/link", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children, href, prefetch, ...props }: Record<string, any>) => {
    void prefetch
    return (
      <a href={href as string} {...props}>
        {children}
      </a>
    )
  },
  // Link provides this via context to its children; tests always render
  // non-pending links.
  useLinkStatus: () => ({ pending: false }),
}))
