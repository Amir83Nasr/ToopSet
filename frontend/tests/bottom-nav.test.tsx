import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { BottomNav } from "@/components/public/bottom-nav"
import { useAuth, type UseAuthReturn } from "@/hooks/use-auth"
import { createMockUser, createMockUseAuth } from "./mocks/use-auth"

function authState(
  user: Parameters<typeof createMockUseAuth>[0],
  loading: boolean
) {
  return createMockUseAuth(user, loading) as unknown as UseAuthReturn
}

describe("BottomNav", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authState(null, false))
  })

  it("renders bottom navigation with z-40 so dialogs and drawers stack above it", () => {
    render(<BottomNav />)
    const nav = screen.getByRole("navigation", { name: "منوی پایین" })
    expect(nav).toBeInTheDocument()
    expect(nav.className).toContain("z-40")
    expect(nav.className).not.toContain("z-[999]")
  })

  it("routes the account tab to /login for guests", () => {
    render(<BottomNav />)
    const accountTab = screen.getByRole("link", { name: /حساب کاربری/ })
    expect(accountTab.getAttribute("href")).toBe("/login")
  })

  it("keeps the account tab on /account while auth state is loading", () => {
    vi.mocked(useAuth).mockReturnValue(authState(null, true))
    render(<BottomNav />)
    const accountTab = screen.getByRole("link", { name: /حساب کاربری/ })
    expect(accountTab.getAttribute("href")).toBe("/account")
  })

  it("routes the account tab to /account for authenticated users", () => {
    vi.mocked(useAuth).mockReturnValue(authState(createMockUser(), false))
    render(<BottomNav />)
    const accountTab = screen.getByRole("link", { name: /حساب کاربری/ })
    expect(accountTab.getAttribute("href")).toBe("/account")
  })
})
