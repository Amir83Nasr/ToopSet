import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Tooltip } from "radix-ui"
import { DesktopUserMenu } from "@/components/public/desktop-user-menu"
import { createMockUser } from "./mocks/use-auth"
import { mockRouter } from "./mocks/next-navigation"

describe("DesktopUserMenu", () => {
  it("shows venue registration only for a regular user", async () => {
    const user = userEvent.setup()
    render(
      <Tooltip.Provider>
        <DesktopUserMenu
          user={createMockUser({ role: "user" })}
          loading={false}
          isAuthenticated
          router={mockRouter}
          onLogout={vi.fn()}
        />
      </Tooltip.Provider>
    )

    await user.click(screen.getByRole("button", { name: /کاربر تست/ }))

    await user.click(screen.getByText("ثبت مجموعه ورزشی"))

    expect(
      await screen.findByRole("heading", { name: "ثبت مجموعه جدید" })
    ).toBeInTheDocument()
  })

  it("does not show venue registration for a manager", async () => {
    const user = userEvent.setup()
    render(
      <Tooltip.Provider>
        <DesktopUserMenu
          user={createMockUser({ role: "manager" })}
          loading={false}
          isAuthenticated
          router={mockRouter}
          onLogout={vi.fn()}
        />
      </Tooltip.Provider>
    )

    await user.click(screen.getByRole("button", { name: /کاربر تست/ }))

    expect(screen.queryByText("ثبت مجموعه ورزشی")).not.toBeInTheDocument()
  })
})
