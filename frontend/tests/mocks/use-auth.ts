import { vi } from "vitest"
import type { User } from "@/types/auth"

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    phone: "09120000000",
    full_name: "کاربر تست",
    role: "user",
    is_active: true,
    has_password: true,
    avatar_url: null,
    created_at: "2026-01-01T00:00:00",
    ...overrides,
  }
}

export const mockLogin = vi.fn()
export const mockCheckLoginOptions = vi.fn()
export const mockRegister = vi.fn()
export const mockLogout = vi.fn()
export const mockRefreshUser = vi.fn()
export const mockSendOtp = vi.fn()
export const mockVerifyOtp = vi.fn()

export function createMockUseAuth(user: User | null = null, loading = false) {
  return {
    user,
    loading,
    login: mockLogin,
    checkLoginOptions: mockCheckLoginOptions,
    register: mockRegister,
    logout: mockLogout,
    refreshUser: mockRefreshUser,
    sendOtp: mockSendOtp,
    verifyOtp: mockVerifyOtp,
    isAuthenticated: !!user,
  }
}

const defaultMock = () => createMockUseAuth(null, false)

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(defaultMock),
}))
