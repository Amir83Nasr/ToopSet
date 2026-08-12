import { describe, expect, it, vi } from "vitest"

describe("buildVendorImageUrl", () => {
  it("proxies backend uploads but preserves external object-storage URLs", async () => {
    const { buildVendorImageUrl } =
      await vi.importActual<typeof import("@/lib/api")>("@/lib/api")

    expect(
      buildVendorImageUrl("http://localhost:8000/uploads/vendors/photo.jpg")
    ).toBe("/uploads/vendors/photo.jpg")
    expect(
      buildVendorImageUrl(
        "https://s3.example.com/toopset/vendors/photo.jpg?version=1"
      )
    ).toBe("https://s3.example.com/toopset/vendors/photo.jpg?version=1")
  })
})
