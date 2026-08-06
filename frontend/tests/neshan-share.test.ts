import { describe, it, expect } from "vitest"
import { buildNeshanShareUrl } from "@/lib/neshan-share"

describe("buildNeshanShareUrl", () => {
  it("encodes a known coordinate to the reference hash (Mashhad, zoom 17)", () => {
    expect(buildNeshanShareUrl(36.3038683, 59.5303411, 17)).toBe(
      "https://nshn.ir/rb1JjKpJxD9n"
    )
  })

  it("produces a nshn.ir short link with 12-char hash", () => {
    const url = buildNeshanShareUrl(34.64, 50.88, 15)
    expect(url).toMatch(/^https:\/\/nshn\.ir\/[A-Za-z0-9_-]{12}$/)
  })

  it("zoom changes the leading hash character", () => {
    const base = buildNeshanShareUrl(34.64, 50.88, 15)
    const close = buildNeshanShareUrl(34.64, 50.88, 17)
    // zoom char is index 16 (after `https://nshn.ir/`); coordinate hash follows
    expect(base[16]).not.toBe(close[16])
  })
})
