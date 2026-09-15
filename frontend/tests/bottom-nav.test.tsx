import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { BottomNav } from "@/components/public/bottom-nav"

describe("BottomNav", () => {
  it("renders bottom navigation with z-40 so dialogs and drawers stack above it", () => {
    render(<BottomNav />)
    const nav = screen.getByRole("navigation", { name: "منوی پایین" })
    expect(nav).toBeInTheDocument()
    expect(nav.className).toContain("z-40")
    expect(nav.className).not.toContain("z-[999]")
  })

  it("stays pinned via a composited layer and adds no below-fold paint that would surface as phantom space", () => {
    render(<BottomNav />)
    const nav = screen.getByRole("navigation", { name: "منوی پایین" })
    expect(nav.className).toContain("gpu-layer")
    expect(nav.className).not.toContain("after:top-full")
  })

  it("always routes the account tab to /account (page handles guest state itself)", () => {
    render(<BottomNav />)
    const accountTab = screen.getByRole("link", { name: /حساب کاربری/ })
    expect(accountTab.getAttribute("href")).toBe("/account")
  })
})
