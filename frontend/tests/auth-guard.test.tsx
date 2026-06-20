import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { useAuth } from "@/hooks/use-auth"

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset()
  })

  it("shows a loading spinner while loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: false,
    })

    const { container } = render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )
    const spinner = container.querySelector(".animate-spin")
    expect(spinner).toBeInTheDocument()
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
  })

  it("renders nothing when not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: false,
    })

    const { container } = render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
    const spinner = container.querySelector(".animate-spin")
    expect(spinner).not.toBeInTheDocument()
  })

  it("renders children when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1,
        phone: "09120000000",
        full_name: "کاربر تست",
        role: "user" as const,
        is_active: true,
        avatar_url: null,
        created_at: "2026-01-01T00:00:00",
      },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true,
    })

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )
    expect(screen.getByText("Protected Content")).toBeInTheDocument()
  })
})
