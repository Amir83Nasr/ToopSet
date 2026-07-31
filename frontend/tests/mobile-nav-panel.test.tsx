import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MobileNavPanel } from "@/components/public/mobile-nav-panel"
import { useAuth } from "@/hooks/use-auth"
import { createMockUser, createMockUseAuth } from "./mocks/use-auth"
import { mockApi } from "./mocks/api"

function MobileNavHarness() {
  const [open, setOpen] = useState(false)
  const user = createMockUser({ role: "user" })

  return (
    <MobileNavPanel
      open={open}
      onOpenChange={setOpen}
      user={user}
      isAuthenticated
      onLogout={vi.fn()}
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
})
