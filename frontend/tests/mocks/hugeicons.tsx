import { vi } from "vitest"

// Mock @hugeicons/react to render a simple SVG placeholder for any icon passed
// We do NOT mock @hugeicons/core-free-icons — the actual icon modules work fine in jsdom
vi.mock("@hugeicons/react", () => ({
  HugeiconsIcon: ({ icon: _icon, ...props }: Record<string, unknown>) => {
    const { strokeWidth: _strokeWidth, ...rest } = props

    return <svg data-testid="hugeicon" {...rest} />
  },
}))
