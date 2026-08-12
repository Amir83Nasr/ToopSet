import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { VendorBookingsTab } from "@/components/vendors/dashboard/vendor-bookings-tab"
import type { TimeSlot } from "@/components/vendors/vendor-shared"
import {
  formatBookingWeekday,
  type ManagerBooking,
} from "@/components/vendors/dashboard/vendor-utils"

const weekDays = Array.from(
  { length: 7 },
  (_, index) => new Date(2026, 7, 1 + index, 12)
)

const slot: TimeSlot = {
  id: 11,
  vendor_id: 2,
  start_time: new Date(2026, 7, 3, 10).toISOString(),
  end_time: new Date(2026, 7, 3, 11, 30).toISOString(),
  base_price: 500000,
  ball_price: 0,
  ball_available: false,
  status: "open",
  is_reserved: false,
  version: 1,
}

const booking: ManagerBooking = {
  id: 21,
  user_id: 7,
  slot_id: slot.id,
  status: "confirmed",
  source: "online",
  price_paid: slot.base_price,
  penalty_amount: null,
  created_at: slot.start_time,
  updated_at: slot.start_time,
  expires_at: null,
  vendor_name: "سالن تست",
  vendor_address: "تهران",
  user_name: "کاربر تست",
  user_phone: "09120000000",
  slot_start_time: slot.start_time,
  slot_end_time: slot.end_time,
}

function renderTab({ reserved = false }: { reserved?: boolean } = {}) {
  render(
    <VendorBookingsTab
      vendorId={2}
      allSlots={[
        reserved ? { ...slot, status: "reserved", is_reserved: true } : slot,
      ]}
      bookings={reserved ? [booking] : []}
      bookingsLoading={false}
      weekLabel="۱۰ تا ۱۶ مرداد"
      weekDays={weekDays}
      onPrevWeek={() => undefined}
      onNextWeek={() => undefined}
      onThisWeek={() => undefined}
      onRefresh={() => undefined}
    />
  )
}

describe("VendorBookingsTab mobile dialogs", () => {
  const originalInnerWidth = window.innerWidth

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it("shows the manual booking dialog for an available slot", async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText("آزاد"))

    expect(
      await screen.findByRole("heading", { name: "رزرو سانس آزاد" })
    ).toBeInTheDocument()
    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).getByText(formatBookingWeekday(slot.start_time))
    ).toBeInTheDocument()
    expect(dialog).toHaveClass(
      "fixed",
      "inset-s-1/2",
      "top-1/2"
    )
  })

  it("shows booking details and cancellation actions for a reserved slot", async () => {
    const user = userEvent.setup()
    renderTab({ reserved: true })

    await user.click(screen.getByText("رزرو شده"))

    expect(
      await screen.findByRole("heading", { name: "جزئیات رزرو سانس" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "لغو و آزادسازی" })
    ).toBeInTheDocument()
  })
})
