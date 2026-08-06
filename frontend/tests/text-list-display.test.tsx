import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { TextListDisplay } from "@/components/public/text-list-display"

// Override the setup-level @/lib/api mock: this component only needs getApiBase.
vi.mock("@/lib/api", () => ({
  getApiBase: () => "http://localhost:8000",
}))

describe("TextListDisplay", () => {
  it("renders section headers, cards, bullets and bold", async () => {
    const value = JSON.stringify([
      "# بخش اول",
      "## ماده ۱ — ایجاد حساب کاربری\nمتن ماده:\n- بند یک\n- بند دو",
      "## ماده ۲ — شرایط لغو\n| زمان | وضعیت |\n| کمتر از ۲ ساعت | امکان لغو ندارد |\n**نام:** توپ‌سِت",
    ])
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value, updated_at: null }),
      })
    )

    render(<TextListDisplay settingKey="rules_text" />)

    await waitFor(() => {
      expect(screen.getByText("بخش اول")).toBeInTheDocument()
    })
    expect(screen.getByText("ماده ۱ — ایجاد حساب کاربری")).toBeInTheDocument()
    expect(screen.getByText("بند یک")).toBeInTheDocument()
    expect(screen.getByText("بند دو")).toBeInTheDocument()
    // number badges — first card is ۱, second card is ۲
    expect(screen.getByText("۱")).toBeInTheDocument()
    expect(screen.getByText("۲")).toBeInTheDocument()
    // table header + cell
    expect(screen.getByText("زمان")).toBeInTheDocument()
    expect(screen.getByText("کمتر از ۲ ساعت")).toBeInTheDocument()
    // bold — <strong> renders its text, query by role/text
    expect(screen.getByText("نام:")).toBeInTheDocument()
    expect(screen.getByText("توپ‌سِت")).toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it("shows empty state when no content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ value: "[]", updated_at: null }),
      })
    )
    render(<TextListDisplay settingKey="privacy_text" />)
    await waitFor(() => {
      expect(screen.getByText("محتوایی ثبت نشده است.")).toBeInTheDocument()
    })
    vi.unstubAllGlobals()
  })
})
