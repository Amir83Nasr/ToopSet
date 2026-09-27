import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { HeroSection } from "@/components/public/hero-section"

describe("HeroSection", () => {
  it("renders the current hero message", () => {
    render(<HeroSection />)
    expect(
      screen.getByText("پلتفرم هوشمند رزرو مجموعه‌های ورزشی")
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/پلتفرم جامع رزرو آنلاین مجموعه‌های ورزشی/)
    ).not.toBeInTheDocument()
  })

  it("renders the venue search action", () => {
    render(<HeroSection />)
    expect(screen.getByText("جستجوی مجموعه‌های ورزشی")).toBeInTheDocument()
    expect(screen.queryByText("ثبت مجموعه جدید")).not.toBeInTheDocument()
  })

  it("links to /vendors on 'جستجوی مجموعه‌های ورزشی'", () => {
    render(<HeroSection />)
    expect(
      screen.getByRole("link", { name: /جستجوی مجموعه‌های ورزشی/ })
    ).toHaveAttribute("href", "/vendors")
  })
})
