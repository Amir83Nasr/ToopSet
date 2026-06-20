// Mock next/link to render as a plain anchor in test environment
// This avoids issues with Next.js Link requiring a Router context
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => {
    return (
      <a href={href as string} {...props}>
        {children}
      </a>
    )
  },
}))
