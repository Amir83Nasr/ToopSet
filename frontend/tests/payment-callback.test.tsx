import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import PaymentCallbackPage from "@/app/book/payment/callback/page"
import { api } from "@/lib/api"

const mockPush = vi.fn()
let currentSearchParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => currentSearchParams,
}))

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/components/public/site-header", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}))

vi.mock("@/components/public/site-footer", () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}))

describe("PaymentCallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentSearchParams = new URLSearchParams()
  })

  it("shows payment failure without booking id or track id when outcome is failed", async () => {
    currentSearchParams = new URLSearchParams({
      trackId: "4734811734",
    })

    vi.mocked(api).mockImplementation(async () => ({
      outcome: "failed",
      booking_id: 29,
      message: "پرداخت انجام نشد و رزرو موقت آزاد شد.",
    }))

    render(<PaymentCallbackPage />)

    await waitFor(() => {
      expect(screen.getByText("پرداخت ناموفق")).toBeInTheDocument()
    })

    expect(
      screen.getByText("پرداخت انجام نشد و رزرو موقت آزاد شد.")
    ).toBeInTheDocument()

    // Ensure booking id and track id are not shown
    expect(screen.queryByText(/شماره رزرو/)).not.toBeInTheDocument()
    expect(screen.queryByText("4734811734")).not.toBeInTheDocument()

    // Check actions
    expect(
      screen.getByRole("button", { name: "انتخاب مجدد سانس" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "صفحه اصلی" })
    ).toBeInTheDocument()
  })

  it("shows payment success with booking id and track/ref id when outcome is paid", async () => {
    currentSearchParams = new URLSearchParams({
      trackId: "4734811734",
    })

    vi.mocked(api).mockImplementation(async () => ({
      outcome: "paid",
      booking_id: 29,
      ref_id: "REF-12345",
      message: "پرداخت با موفقیت ثبت شد و رزرو شما نهایی گردید.",
    }))

    render(<PaymentCallbackPage />)

    await waitFor(() => {
      expect(screen.getByText("پرداخت موفق")).toBeInTheDocument()
    })

    expect(
      screen.getByText("پرداخت با موفقیت ثبت شد و رزرو شما نهایی گردید.")
    ).toBeInTheDocument()
    expect(screen.getByText("شماره رزرو: 29")).toBeInTheDocument()
    expect(screen.getByText("REF-12345")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "مشاهده رزروها" })
    ).toBeInTheDocument()
  })
})
