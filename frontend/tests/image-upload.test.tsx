import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ImageUpload } from "@/components/vendors/image-upload"

const uploadFilesMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/api", () => ({
  buildVendorImageUrl: (url: string) => url,
  uploadFiles: (...args: unknown[]) => uploadFilesMock(...args),
  ApiError: class extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock("@/lib/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

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

  it("uploads several selected files in a single batch request", async () => {
    const user = userEvent.setup()
    uploadFilesMock.mockResolvedValue([
      { temp_id: "t1", url: "/uploads/vendors/a.png" },
      { temp_id: "t2", url: "/uploads/vendors/b.png" },
      { temp_id: "t3", url: "/uploads/vendors/c.png" },
    ])
    const onChange = vi.fn()
    const onTempIdsChange = vi.fn()
    render(
      <ImageUpload
        images={[]}
        onChange={onChange}
        tempIds={[]}
        onTempIdsChange={onTempIdsChange}
      />
    )

    const files = [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.png", { type: "image/png" }),
      new File(["c"], "c.png", { type: "image/png" }),
    ]
    await user.upload(screen.getByLabelText(/افزودن تصویر/), files)

    expect(uploadFilesMock).toHaveBeenCalledTimes(1)
    expect(uploadFilesMock).toHaveBeenCalledWith(files)
    expect(onChange).toHaveBeenCalledWith([
      "/uploads/vendors/a.png",
      "/uploads/vendors/b.png",
      "/uploads/vendors/c.png",
    ])
    expect(onTempIdsChange).toHaveBeenCalledWith(["t1", "t2", "t3"])
  })

  it("treats images as optional — no minimum count warning", () => {
    render(<ImageUpload images={[]} onChange={vi.fn()} />)

    expect(screen.queryByText(/الزامی است/)).not.toBeInTheDocument()
  })
})
