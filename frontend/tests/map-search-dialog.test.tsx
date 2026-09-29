import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

vi.mock("@/components/vendors/location-picker", () => ({
  LocationPicker: ({
    onPick,
  }: {
    onPick?: (lat: number, lng: number) => void
  }) => (
    <button type="button" onClick={() => onPick?.(34.6416, 50.8764)}>
      mock-pick
    </button>
  ),
}))

import { MapSearchDialog } from "@/components/vendors/map-search-dialog"

const vendors = [{ id: 7, name: "V7", latitude: 34.6416, longitude: 50.8764 }]

function setup(props = {}) {
  const onOpenChange = vi.fn()
  render(
    <MapSearchDialog
      open
      onOpenChange={onOpenChange}
      vendors={vendors}
      {...props}
    />
  )
  return { onOpenChange }
}

describe("MapSearchDialog", () => {
  beforeEach(() => vi.clearAllMocks())

  it("keeps the go button disabled until a venue is picked", async () => {
    const user = userEvent.setup()
    setup()
    const go = screen.getByRole("button", { name: "رفتن به مجموعه انتخاب شده" })
    expect(go).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "mock-pick" }))
    expect(go).toBeEnabled()
    expect(screen.getByText("V7")).toBeInTheDocument()
  })

  it("opens the picked vendor page on go", async () => {
    const user = userEvent.setup()
    const { onOpenChange } = setup()
    await user.click(screen.getByRole("button", { name: "mock-pick" }))
    await user.click(
      screen.getByRole("button", { name: "رفتن به مجموعه انتخاب شده" })
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(push).toHaveBeenCalledWith("/vendors/7")
  })

  it("does not mount the picker while closed", () => {
    render(
      <MapSearchDialog open={false} onOpenChange={vi.fn()} vendors={vendors} />
    )
    expect(
      screen.queryByRole("button", { name: "mock-pick" })
    ).not.toBeInTheDocument()
  })
})
