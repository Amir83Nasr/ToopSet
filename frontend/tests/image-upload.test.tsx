import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ImageUpload } from "@/components/vendors/image-upload"

describe("ImageUpload", () => {
  it("marks the first image as the main image", () => {
    render(
      <ImageUpload
        images={["/one.jpg", "/two.jpg", "/three.jpg"]}
        onChange={vi.fn()}
      />
    )

    const firstImage = screen.getByAltText("تصویر 1").parentElement
    expect(firstImage).not.toBeNull()
    expect(within(firstImage!).getByText("عکس اصلی")).toBeInTheDocument()
  })

  it("moves the selected image to the first position", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onTempIdsChange = vi.fn()
    render(
      <ImageUpload
        images={["/one.jpg", "/two.jpg", "/three.jpg"]}
        onChange={onChange}
        tempIds={["temp-one", "temp-two", "temp-three"]}
        onTempIdsChange={onTempIdsChange}
      />
    )

    await user.click(
      screen.getByRole("button", {
        name: "انتخاب تصویر ۲ به عنوان عکس اصلی",
      })
    )

    expect(onChange).toHaveBeenCalledWith([
      "/two.jpg",
      "/one.jpg",
      "/three.jpg",
    ])
    expect(onTempIdsChange).toHaveBeenCalledWith([
      "temp-two",
      "temp-one",
      "temp-three",
    ])
  })
})
