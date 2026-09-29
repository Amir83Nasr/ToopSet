import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Tooltip } from "radix-ui"
import { DesktopUserMenu } from "@/components/public/desktop-user-menu"
import { navGroups } from "@/lib/navigation"
import { createMockUser } from "./mocks/use-auth"

describe("DesktopUserMenu", () => {
  it("shows venue registration only for a regular user", async () => {
    const user = userEvent.setup()
    render(
      <Tooltip.Provider>
        <DesktopUserMenu
          user={createMockUser({ role: "user" })}
          loading={false}
          isAuthenticated
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
          onLogout={vi.fn()}
        />
      </Tooltip.Provider>
    )

    await user.click(screen.getByRole("button", { name: /کاربر تست/ }))

    expect(screen.queryByText("ثبت مجموعه ورزشی")).not.toBeInTheDocument()
  })

  it("renders every navGroups item for the role (sidebar parity)", async () => {
    const user = userEvent.setup()
    render(
      <Tooltip.Provider>
        <DesktopUserMenu
          user={createMockUser({ role: "admin" })}
          loading={false}
          isAuthenticated
          onLogout={vi.fn()}
        />
      </Tooltip.Provider>
    )

    await user.click(screen.getByRole("button", { name: /کاربر تست/ }))

    for (const group of navGroups.filter((g) => g.roles.includes("admin"))) {
      for (const item of group.items) {
        expect(screen.getAllByText(item.title).length).toBeGreaterThan(0)
      }
    }
  })
})
