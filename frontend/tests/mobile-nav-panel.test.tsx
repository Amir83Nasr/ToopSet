import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MobileNavPanel } from "@/components/public/mobile-nav-panel"
import { useAuth } from "@/hooks/use-auth"
import { createMockUser, createMockUseAuth } from "./mocks/use-auth"
import { mockApi } from "./mocks/api"

function MobileNavHarness({ onLogout = vi.fn() }: { onLogout?: () => void }) {
  const [open, setOpen] = useState(false)
  const user = createMockUser({ role: "user" })

  return (
    <MobileNavPanel
      open={open}
      onOpenChange={setOpen}
      user={user}
      isAuthenticated
      onLogout={onLogout}
    />
  )
}

describe("MobileNavPanel", () => {
  beforeEach(() => {
    const user = createMockUser({ role: "user" })
    vi.mocked(useAuth).mockReturnValue(createMockUseAuth(user, false))
    mockApi.mockResolvedValue(null)
  })

  it("opens venue registration after closing the mobile sheet", async () => {
    const user = userEvent.setup()
    render(<MobileNavHarness />)

    await user.click(screen.getByRole("button", { name: "منو" }))
    await user.click(await screen.findByText("ثبت مجموعه ورزشی"))

    expect(
      await screen.findByRole("heading", { name: "ثبت مجموعه جدید" })
    ).toBeInTheDocument()
  })

  it("closes the sheet before confirming and performing logout", async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn()
    render(<MobileNavHarness onLogout={onLogout} />)

    await user.click(screen.getByRole("button", { name: "منو" }))
    await user.click(await screen.findByRole("button", { name: "خروج" }))

    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByRole("heading", { name: "خروج از حساب" })
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "خروج" }))

    expect(onLogout).toHaveBeenCalledOnce()
  })
})
