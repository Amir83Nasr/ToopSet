import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SlotRow } from "@/components/vendors/public-slot-row"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  MY_RESERVING_HINT,
  RESERVING_HINT,
  type TimeSlot,
} from "@/components/vendors/vendor-shared"

const openSlot: TimeSlot = {
  id: 11,
  vendor_id: 14,
  start_time: "2099-08-02T06:30:00Z",
  end_time: "2099-08-02T08:00:00Z",
  base_price: 350000,
  ball_available: false,
  ball_price: 0,
  is_reserved: false,
  status: "open",
  version: 1,
}

describe("public vendor slot row", () => {
  it("uses the same centered desktop grid as the slot header", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <TooltipProvider>
        <SlotRow slot={openSlot} selectedSlot={null} onSelect={onSelect} />
      </TooltipProvider>
    )

    const row = screen.getByRole("button")
    expect(row).toHaveClass(
      "sm:grid-cols-[6rem_minmax(11rem,1fr)_8.75rem_7rem]",
      "sm:text-center"
    )
    expect(screen.getByText("آزاد")).toBeInTheDocument()
    await user.click(row)
    expect(onSelect).toHaveBeenCalledWith(openSlot)
  })

  it("labels an unavailable reserved slot correctly", () => {
    render(
      <TooltipProvider>
        <SlotRow
          slot={{ ...openSlot, is_reserved: true, status: "reserved" }}
          selectedSlot={null}
          onSelect={vi.fn()}
        />
      </TooltipProvider>
    )

    expect(screen.getByRole("button")).toBeDisabled()
    expect(screen.getByText("رزرو شده")).toBeInTheDocument()
  })

  it("labels a reserving slot with yellow state and hint", () => {
    render(
      <TooltipProvider>
        <SlotRow
          slot={{ ...openSlot, is_reserved: true, status: "reserving" }}
          selectedSlot={null}
          onSelect={vi.fn()}
        />
      </TooltipProvider>
    )

    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
    expect(screen.getByText("در حال رزرو")).toBeInTheDocument()
    expect(button).toHaveAttribute("title", RESERVING_HINT)
    // Inline hint must be visible without hover (mobile users)
    expect(screen.getByText(RESERVING_HINT)).toBeInTheDocument()
  })

  it("makes the user's own reserving slot clickable to continue payment", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const ownSlot: TimeSlot = {
      ...openSlot,
      is_reserved: true,
      status: "reserving",
      reserved_by_me: true,
      my_booking_id: 77,
    }
    render(
      <TooltipProvider>
        <SlotRow slot={ownSlot} selectedSlot={null} onSelect={onSelect} />
      </TooltipProvider>
    )

    const button = screen.getByRole("button")
    expect(button).toBeEnabled()
    expect(screen.getByText("ادامه پرداخت")).toBeInTheDocument()
    expect(button).toHaveAttribute("title", MY_RESERVING_HINT)
    expect(screen.getByText(MY_RESERVING_HINT)).toBeInTheDocument()

    await user.click(button)
    expect(onSelect).toHaveBeenCalledWith(ownSlot)
  })

  it("disables the row while its payment is being started", () => {
    render(
      <TooltipProvider>
        <SlotRow
          slot={{
            ...openSlot,
            is_reserved: true,
            status: "reserving",
            reserved_by_me: true,
            my_booking_id: 77,
          }}
          selectedSlot={null}
          onSelect={vi.fn()}
          payingBookingId={77}
        />
      </TooltipProvider>
    )

    expect(screen.getByRole("button")).toBeDisabled()
    expect(screen.getByText("در حال انتقال…")).toBeInTheDocument()
  })
})
