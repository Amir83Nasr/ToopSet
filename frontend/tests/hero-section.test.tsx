import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HeroSection } from "@/components/public/hero-section"
import { useAuth } from "@/hooks/use-auth"
import { createMockUser, createMockUseAuth } from "./mocks/use-auth"
import { mockRouter } from "./mocks/next-navigation"
import { mockApi } from "./mocks/api"

describe("HeroSection", () => {
  beforeEach(() => {
    mockRouter.push.mockReset()
    vi.mocked(useAuth).mockReset()
    mockApi.mockReset()
  })

  it("renders the title and description", () => {
    vi.mocked(useAuth).mockReturnValue(createMockUseAuth(null, false))
    render(<HeroSection />)
    expect(screen.getByText("پلتفرم هوشمند رزرو")).toBeInTheDocument()
    expect(screen.getByText("سالن‌های ورزشی")).toBeInTheDocument()
    expect(screen.getByText("توپ‌سِت")).toBeInTheDocument()
  })

  it("renders both action buttons", () => {
    vi.mocked(useAuth).mockReturnValue(createMockUseAuth(null, false))
    render(<HeroSection />)
    expect(screen.getByText("ثبت مجموعه جدید")).toBeInTheDocument()
    expect(screen.getByText("مشاهده سالن‌های ورزشی")).toBeInTheDocument()
  })

  it("redirects to login when unauthenticated user clicks 'ثبت مجموعه جدید'", async () => {
    vi.mocked(useAuth).mockReturnValue(createMockUseAuth(null, false))
    const user = userEvent.setup()
    render(<HeroSection />)
    await user.click(screen.getByText("ثبت مجموعه جدید"))
    expect(mockRouter.push).toHaveBeenCalledWith(
      "/login?reason=login_required&redirect=/"
    )
  })

  it("navigates to vendor create when manager clicks 'ثبت مجموعه جدید'", async () => {
    const managerUser = createMockUser({ role: "manager" })
    vi.mocked(useAuth).mockReturnValue(createMockUseAuth(managerUser, false))
    const user = userEvent.setup()
    render(<HeroSection />)
    await user.click(screen.getByText("ثبت مجموعه جدید"))
    expect(mockRouter.push).toHaveBeenCalledWith("/dashboard/vendors/create")
  })

  it("shows dialog when regular user clicks 'ثبت مجموعه جدید'", async () => {
    const regularUser = createMockUser({ role: "user" })
    vi.mocked(useAuth).mockReturnValue(createMockUseAuth(regularUser, false))
    mockApi.mockResolvedValue(null) // no existing pending request
    const user = userEvent.setup()
    render(<HeroSection />)
    await user.click(screen.getByText("ثبت مجموعه جدید"))

    expect(
      await screen.findByText((content) =>
        content.includes("برای ثبت مجموعه ورزشی")
      )
    ).toBeInTheDocument()
  })

  it("navigates to /vendors when 'مشاهده سالن‌های ورزشی' is clicked", async () => {
    vi.mocked(useAuth).mockReturnValue(createMockUseAuth(null, false))
    const user = userEvent.setup()
    render(<HeroSection />)
    await user.click(screen.getByText("مشاهده سالن‌های ورزشی"))
    expect(mockRouter.push).toHaveBeenCalledWith("/vendors")
  })
})
