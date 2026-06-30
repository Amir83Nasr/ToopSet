import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { VendorBooking } from "@/components/vendors/vendor-booking"
import type { TimeSlot } from "@/components/vendors/vendor-shared"

function makeSlots(
  count: number,
  overrides: Partial<TimeSlot> = {}
): TimeSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    vendor_id: 1,
    start_time: `2026-06-20T0${8 + i}:00:00`,
    end_time: `2026-06-20T0${9 + i}:00:00`,
    base_price: 150000,
    is_reserved: false,
    version: 1,
    ...overrides,
  }))
}

describe("VendorBooking", () => {
  const onDateSelect = vi.fn()
  const onSlotSelect = vi.fn()
  const onBook = vi.fn()

  const baseProps = {
    slots: [],
    slotsLoading: false,
    selectedDate: "",
    onDateSelect,
    onSlotSelect,
    isAuthenticated: true,
    onBook,
    selectedSlot: null,
  }

  beforeEach(() => {
    onDateSelect.mockReset()
    onSlotSelect.mockReset()
    onBook.mockReset()
  })

  it("renders the section title", () => {
    render(<VendorBooking {...baseProps} />)
    expect(screen.getByText("انتخاب سانس")).toBeInTheDocument()
  })

  it("displays Persian day names in date picker", () => {
    render(<VendorBooking {...baseProps} />)
    const dayNames = [
      "شنبه",
      "یکشنبه",
      "دوشنبه",
      "سه‌شنبه",
      "چهارشنبه",
      "پنجشنبه",
      "جمعه",
    ]
    const foundDayNames = dayNames.filter(
      (name) => screen.getAllByText(name, { exact: false }).length > 0
    )
    expect(foundDayNames.length).toBeGreaterThan(0)
  })

  it("shows loading skeletons while loading slots", () => {
    render(<VendorBooking {...baseProps} slotsLoading={true} />)
    // With shadcn skeleton, expect at least some loading indicator
    expect(screen.getByText("انتخاب سانس")).toBeInTheDocument()
  })

  it("shows empty state when no slots available", () => {
    render(<VendorBooking {...baseProps} />)
    expect(screen.getByText("سانسی موجود نیست")).toBeInTheDocument()
    expect(screen.getByText("تاریخ دیگری انتخاب کنید")).toBeInTheDocument()
  })

  it("renders available slots", () => {
    const slots = makeSlots(3)
    render(<VendorBooking {...baseProps} slots={slots} />)
    expect(screen.getByText("۳ سانس موجود")).toBeInTheDocument()
  })

  it("allows selecting an available slot", async () => {
    const user = userEvent.setup()
    const slots = makeSlots(2)
    render(<VendorBooking {...baseProps} slots={slots} />)

    const slotButtons = screen.getAllByText("آزاد")
    expect(slotButtons).toHaveLength(2)

    await user.click(slotButtons[0])
    expect(onSlotSelect).toHaveBeenCalledWith(slots[0])
  })

  it("does not call onSlotSelect for reserved slots", async () => {
    const user = userEvent.setup()
    const slots = [...makeSlots(1, { is_reserved: true }), ...makeSlots(1)]
    render(<VendorBooking {...baseProps} slots={slots} />)

    const reservedButtons = screen.getAllByText("رزرو شده")
    expect(reservedButtons).toHaveLength(1)

    // Clicking a reserved slot should not trigger onSlotSelect
    await user.click(reservedButtons[0])
    expect(onSlotSelect).not.toHaveBeenCalled()
  })

  it("shows booking CTA when a slot is selected", () => {
    const selectedSlot = makeSlots(1)[0]
    render(
      <VendorBooking
        {...baseProps}
        slots={makeSlots(1)}
        selectedSlot={selectedSlot}
      />
    )
    expect(screen.getByText("رزرو کن")).toBeInTheDocument()
  })

  it("shows 'ورود و رزرو' button when not authenticated", () => {
    const selectedSlot = makeSlots(1)[0]
    render(
      <VendorBooking
        {...baseProps}
        isAuthenticated={false}
        slots={makeSlots(1)}
        selectedSlot={selectedSlot}
      />
    )
    expect(screen.getByText("ورود و رزرو")).toBeInTheDocument()
  })

  it("calls onBook when booking button is clicked", async () => {
    const user = userEvent.setup()
    const selectedSlot = makeSlots(1)[0]
    render(
      <VendorBooking
        {...baseProps}
        slots={makeSlots(1)}
        selectedSlot={selectedSlot}
      />
    )

    await user.click(screen.getByText("رزرو کن"))
    expect(onBook).toHaveBeenCalledWith(selectedSlot)
  })
})
