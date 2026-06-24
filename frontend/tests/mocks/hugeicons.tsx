import { vi } from "vitest"

// Mock @hugeicons/react to render a simple SVG placeholder for any icon passed
// We do NOT mock @hugeicons/core-free-icons — the actual icon modules work fine in jsdom
vi.mock("@hugeicons/react", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  HugeiconsIcon: ({ icon, ...props }: Record<string, unknown>) => (
    <svg data-testid="hugeicon" {...props} />
  ),
}))
