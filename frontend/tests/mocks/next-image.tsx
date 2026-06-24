import { vi } from "vitest"

// Mock next/image to render a plain img tag in test environment
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, priority, unoptimized, ...rest } = props
    void fill
    void priority
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />
  },
}))
