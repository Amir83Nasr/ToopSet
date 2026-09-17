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
        onSelect={vi.fn()}
        formatPrice={formatPrice}
      />
    )

    expect(screen.getByRole("status")).toHaveTextContent("مجموعه بدون توپ است")
    expect(
      screen.getByText(/در صورت نیاز، توپ همراه داشته باشید/)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("radio", { name: /اجاره توپ/ })
    ).not.toBeInTheDocument()
  })

  it("shows the configured price and lets the user pick ball rental", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <BookingBallOption
        available
        price={75000}
        selected={false}
        onSelect={onSelect}
        formatPrice={formatPrice}
      />
    )

    // "Bring my own ball" is the default selection
    expect(
      screen.getByRole("radio", { name: "خیر، خودم توپ دارم" })
    ).toBeChecked()
    const rentRadio = screen.getByRole("radio", { name: "اجاره توپ" })
    expect(rentRadio).not.toBeChecked()
    expect(screen.getByText("(۷۵٬۰۰۰ تومان)")).toBeInTheDocument()

    await user.click(rentRadio)
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(true)
  })

  it("lets the user switch back to bringing their own ball", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <BookingBallOption
        available
        price={75000}
        selected
        onSelect={onSelect}
        formatPrice={formatPrice}
      />
    )

    expect(screen.getByRole("radio", { name: "اجاره توپ" })).toBeChecked()

    await user.click(screen.getByRole("radio", { name: "خیر، خودم توپ دارم" }))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(false)
  })
})
