import { vi } from "vitest"

type RouterPush = (url: string) => void
type RouterReplace = (url: string) => void

const push = vi.fn<RouterPush>()
const replace = vi.fn<RouterReplace>()

export const mockRouter = {
  push,
  replace,
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))
