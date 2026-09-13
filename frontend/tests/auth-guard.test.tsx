import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { useAuth } from "@/hooks/use-auth"
import { mockRouter } from "./mocks/next-navigation"

const baseAuth = {
  login: vi.fn(),
  checkLoginOptions: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset()
    mockRouter.replace.mockReset()
  })

  it("renders children immediately while auth is loading (non-blocking)", () => {
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      user: null,
      loading: true,
      isAuthenticated: false,
    })

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )
    // Children mount right away — pages show their own skeletons while the
    // auth check resolves in parallel; the guard must not block the route.
    expect(screen.getByText("Protected Content")).toBeInTheDocument()
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it("redirects to login once confirmed unauthenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      user: null,
      loading: false,
      isAuthenticated: false,
    })

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )
    expect(mockRouter.replace).toHaveBeenCalledWith(
      "/login?reason=login_required&redirect=%2F"
    )
  })

  it("renders children when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      user: {
        id: 1,
        phone: "09120000000",
        full_name: "کاربر تست",
        role: "user" as const,
        is_active: true,
        has_password: true,
        avatar_url: null,
        created_at: "2026-01-01T00:00:00",
      },
      loading: false,
      isAuthenticated: true,
    })

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )
    expect(screen.getByText("Protected Content")).toBeInTheDocument()
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })
})
