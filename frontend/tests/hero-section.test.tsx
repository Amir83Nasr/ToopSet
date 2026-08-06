import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HeroSection } from "@/components/public/hero-section"
import { mockRouter } from "./mocks/next-navigation"

describe("HeroSection", () => {
  beforeEach(() => {
    mockRouter.push.mockReset()
  })

  it("renders the title without the old description", () => {
    render(<HeroSection />)
    expect(screen.getByText("پلتفرم هوشمند رزرو")).toBeInTheDocument()
    expect(screen.getByText("مجموعه‌های ورزشی")).toBeInTheDocument()
    expect(
      screen.queryByText(/پلتفرم جامع رزرو آنلاین مجموعه‌های ورزشی/)
    ).not.toBeInTheDocument()
  })

  it("renders the venue search action", () => {
    render(<HeroSection />)
    expect(screen.getByText("مشاهده مجموعه‌های ورزشی")).toBeInTheDocument()
    expect(screen.queryByText("ثبت مجموعه جدید")).not.toBeInTheDocument()
  })

  it("navigates to /vendors when 'مشاهده مجموعه‌های ورزشی' is clicked", async () => {
    const user = userEvent.setup()
    render(<HeroSection />)
    await user.click(screen.getByText("مشاهده مجموعه‌های ورزشی"))
    expect(mockRouter.push).toHaveBeenCalledWith("/vendors")
  })
})
