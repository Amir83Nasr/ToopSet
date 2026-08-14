import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BookingBallOption } from "@/components/bookings/booking-ball-option"

import { formatPrice } from "@/lib/utils"

describe("BookingBallOption", () => {
  it("warns the user when the vendor has no ball", () => {
    render(
      <BookingBallOption
        available={false}
        price={0}
        selected={false}
        onToggle={vi.fn()}
        formatPrice={formatPrice}
      />
    )

    expect(screen.getByRole("status")).toHaveTextContent("مجموعه بدون توپ است")
    expect(
      screen.getByText(/در صورت نیاز، توپ همراه داشته باشید/)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /افزودن توپ/ })
    ).not.toBeInTheDocument()
  })

  it("shows the configured price and lets the user add the ball", async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <BookingBallOption
        available
        price={75000}
        selected={false}
        onToggle={onToggle}
        formatPrice={formatPrice}
      />
    )

    const button = screen.getByRole("button", { name: /افزودن توپ به رزرو/ })
    expect(button).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText("۷۵٬۰۰۰ تومانءء")).toBeInTheDocument()
    await user.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
  })
})
