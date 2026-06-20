import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { SiteHeader } from "@/components/public/site-header"
import { useAuth } from "@/hooks/use-auth"
import { mockRouter } from "./mocks/next-navigation"
import { Tooltip } from "radix-ui"
const TooltipProvider = Tooltip.Provider

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe("SiteHeader", () => {
  beforeEach(() => {
    mockRouter.push.mockReset()
    vi.mocked(useAuth).mockReset()
  })

  describe("when not authenticated", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        isAuthenticated: false,
      })
    })

    it("renders the logo and site name", () => {
      renderWithProviders(<SiteHeader />)
      expect(screen.getByText("توپ‌سِت")).toBeInTheDocument()
    })

    it("renders nav links", () => {
      renderWithProviders(<SiteHeader />)
      expect(screen.getByText("صفحه اصلی")).toBeInTheDocument()
      expect(screen.getByText("جستجوی سالن‌ها")).toBeInTheDocument()
      expect(screen.getByText("ارتباط با ما")).toBeInTheDocument()
    })

    it("shows login and register buttons", () => {
      renderWithProviders(<SiteHeader />)
      const loginLinks = screen.getAllByText("ورود")
      expect(loginLinks.length).toBeGreaterThan(0)
      const registerLinks = screen.getAllByText("ثبت‌نام")
      expect(registerLinks.length).toBeGreaterThan(0)
    })
  })

  describe("when loading", () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        loading: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        isAuthenticated: false,
      })
    })

    it("shows a loading spinner", () => {
      const { container } = renderWithProviders(<SiteHeader />)
      const spinner = container.querySelector(".animate-spin")
      expect(spinner).toBeInTheDocument()
    })
  })

  describe("when authenticated as user", () => {
    beforeEach(() => {
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
    })

    it("shows the user's full name", () => {
      renderWithProviders(<SiteHeader />)
      expect(screen.getByText("کاربر تست")).toBeInTheDocument()
    })

    it("does NOT show login/register buttons", () => {
      renderWithProviders(<SiteHeader />)
      expect(screen.queryByText("ورود")).not.toBeInTheDocument()
      expect(screen.queryByText("ثبت‌نام")).not.toBeInTheDocument()
    })
  })
})
