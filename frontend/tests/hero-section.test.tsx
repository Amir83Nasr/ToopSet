import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HeroSection } from "@/components/public/hero-section"
import { mockRouter } from "./mocks/next-navigation"

describe("HeroSection", () => {
  beforeEach(() => {
    mockRouter.push.mockReset()
  })

  it("renders the title and description", () => {
    render(<HeroSection />)
    expect(screen.getByText("پلتفرم هوشمند رزرو")).toBeInTheDocument()
    expect(screen.getByText("سالن‌های ورزشی")).toBeInTheDocument()
    expect(screen.getByText("توپ‌سِت")).toBeInTheDocument()
  })

  it("renders both action buttons", () => {
    render(<HeroSection />)
    expect(screen.getByText("شروع رزرو آنلاین")).toBeInTheDocument()
    expect(screen.getByText("مشاهده سالن‌های ورزشی")).toBeInTheDocument()
  })

  it("navigates to /vendors when 'شروع رزرو آنلاین' is clicked", async () => {
    const user = userEvent.setup()
    render(<HeroSection />)
    await user.click(screen.getByText("شروع رزرو آنلاین"))
    expect(mockRouter.push).toHaveBeenCalledWith("/vendors")
  })

  it("navigates to /vendors when 'مشاهده سالن‌های ورزشی' is clicked", async () => {
    const user = userEvent.setup()
    render(<HeroSection />)
    await user.click(screen.getByText("مشاهده سالن‌های ورزشی"))
    expect(mockRouter.push).toHaveBeenCalledWith("/vendors")
  })
})
