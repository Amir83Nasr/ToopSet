import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { HeroSection } from "@/components/public/hero-section"

describe("HeroSection", () => {
  it("renders the title without the old description", () => {
    render(<HeroSection />)
    expect(screen.getByText("سامانه رزرو آنلاین")).toBeInTheDocument()
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

  it("links to /vendors on 'مشاهده مجموعه‌های ورزشی'", () => {
    render(<HeroSection />)
    expect(
      screen.getByRole("link", { name: /مشاهده مجموعه‌های ورزشی/ })
    ).toHaveAttribute("href", "/vendors")
  })
})
