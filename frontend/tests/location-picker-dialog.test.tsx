import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("@/components/vendors/location-picker", () => ({
  LocationPicker: ({
    onLiveChange,
    onAddressResolved,
  }: {
    onLiveChange?: (lat: number, lng: number) => void
    onAddressResolved?: (lat: number, lng: number, address?: string) => void
  }) => (
    <button
      type="button"
      onClick={() => {
        onLiveChange?.(34.64, 50.87)
        onAddressResolved?.(34.64, 50.87, "ADDR")
      }}
    >
      mock-picker
    </button>
  ),
}))

import { LocationPickerDialog } from "@/components/vendors/location-picker-dialog"

describe("LocationPickerDialog", () => {
  beforeEach(() => vi.clearAllMocks())

  it("confirms the pick and closes", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <LocationPickerDialog
        open
        onOpenChange={onOpenChange}
        latitude={null}
        longitude={null}
        onConfirm={onConfirm}
      />
    )
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "mock-picker" })
      ).toBeInTheDocument()
    )
    await user.click(screen.getByRole("button", { name: "mock-picker" }))
    await user.click(screen.getByRole("button", { name: "تایید موقعیت" }))
    expect(onConfirm).toHaveBeenCalledWith(34.64, 50.87, "ADDR")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("closes on Escape without confirming", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <LocationPickerDialog
        open
        onOpenChange={onOpenChange}
        latitude={null}
        longitude={null}
        onConfirm={onConfirm}
      />
    )
    await user.keyboard("{Escape}")
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("does not mount the picker while closed", () => {
    render(
      <LocationPickerDialog
        open={false}
        onOpenChange={vi.fn()}
        latitude={null}
        longitude={null}
        onConfirm={vi.fn()}
      />
    )
    expect(
      screen.queryByRole("button", { name: "mock-picker" })
    ).not.toBeInTheDocument()
  })
})
