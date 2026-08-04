import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAuth } from "@/hooks/use-auth"
import { createMockUser, createMockUseAuth, mockLogout } from "./mocks/use-auth"

describe("AppSidebar", () => {
  const originalInnerWidth = window.innerWidth
  const originalResizeObserver = globalThis.ResizeObserver
  const originalSetPointerCapture = Element.prototype.setPointerCapture
  const originalReleasePointerCapture = Element.prototype.releasePointerCapture
  const originalHasPointerCapture = Element.prototype.hasPointerCapture

  beforeEach(() => {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
    Element.prototype.hasPointerCapture = vi.fn(() => false)
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
    })
    vi.mocked(useAuth).mockReturnValue(
      createMockUseAuth(createMockUser({ role: "user" }), false)
    )
    mockLogout.mockResolvedValue(undefined)
  })

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver
    Element.prototype.setPointerCapture = originalSetPointerCapture
    Element.prototype.releasePointerCapture = originalReleasePointerCapture
    Element.prototype.hasPointerCapture = originalHasPointerCapture
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it("closes the mobile sidebar before showing logout confirmation", async () => {
    const user = userEvent.setup()

    render(
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarTrigger />
        </SidebarProvider>
      </TooltipProvider>
    )

    await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }))
    await user.click(await screen.findByRole("button", { name: "خروج" }))

    const dialog = await screen.findByRole("alertdialog", {}, { timeout: 1500 })
    expect(
      within(dialog).getByRole("heading", { name: "خروج از حساب" })
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole("button", { name: "خروج" }))
    expect(mockLogout).toHaveBeenCalledOnce()
  })
})
