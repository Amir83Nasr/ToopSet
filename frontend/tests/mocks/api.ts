import { vi } from "vitest"

// Use vi.hoisted to ensure these are available when vi.mock factory runs
const mocks = vi.hoisted(() => ({
  mockApi: vi.fn(),
  mockSetTokens: vi.fn(),
  mockClearTokens: vi.fn(),
  mockGetCookie: vi.fn(),
}))

export const mockApi = mocks.mockApi
export const mockSetTokens = mocks.mockSetTokens
export const mockClearTokens = mocks.mockClearTokens
export const mockGetCookie = mocks.mockGetCookie

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

vi.mock("@/lib/api", () => ({
  api: mocks.mockApi,
  ApiError,
  setTokens: mocks.mockSetTokens,
  clearTokens: mocks.mockClearTokens,
  getCookie: mocks.mockGetCookie,
  buildAvatarUrl: (url?: string | null) => url ?? null,
}))
