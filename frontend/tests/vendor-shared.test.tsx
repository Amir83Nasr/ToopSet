import { describe, it, expect } from "vitest"
import {
  formatTime,
  formatPrice,
  Stars,
} from "@/components/vendors/vendor-shared"
import { render } from "@testing-library/react"

describe("formatTime", () => {
  it("formats ISO time to Persian time string", () => {
    // 14:30 UTC → should show as fa-IR locale time
    const result = formatTime("2026-06-20T14:30:00")
    expect(result).toBeTruthy()
    expect(typeof result).toBe("string")
  })
})

describe("formatPrice", () => {
  it("formats number with Persian digits and تومان suffix", () => {
    const result = formatPrice(150000)
    expect(result).toContain("تومان")
    expect(result).toContain("۱۵۰")
  })

  it("handles zero", () => {
    const result = formatPrice(0)
    expect(result).toContain("تومان")
  })
})

describe("Stars", () => {
  it("renders 5 star elements", () => {
    const { container } = render(<Stars rating={4} />)
    const stars = container.querySelectorAll("svg")
    expect(stars).toHaveLength(5)
  })

  it("renders all filled for rating 5", () => {
    const { container } = render(<Stars rating={5} />)
    const stars = container.querySelectorAll("svg")
    stars.forEach((star) => {
      expect(star.classList.contains("fill-amber-400")).toBe(true)
    })
  })

  it("renders none filled for rating 0", () => {
    const { container } = render(<Stars rating={0} />)
    const stars = container.querySelectorAll("svg")
    stars.forEach((star) => {
      expect(star.classList.contains("text-muted-foreground/20")).toBe(true)
    })
  })
})
