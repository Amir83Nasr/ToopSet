import { vi } from "vitest"

export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}

vi.mock("@/lib/toast", () => ({
  toast: mockToast,
}))

vi.mock("sonner", () => ({
  toast: mockToast,
}))
