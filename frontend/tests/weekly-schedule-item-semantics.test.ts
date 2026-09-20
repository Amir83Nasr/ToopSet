import { describe, expect, it } from "vitest"
import {
  isAfterMidnightItem,
  nightSortRank,
  slotRangesOverlap,
  slotSpanMinutes,
} from "@/components/dashboard/schedule/utils"

describe("weekly schedule item semantics", () => {
  it("measures wrapped slots from midnight", () => {
    expect(slotSpanMinutes("09:00", "10:30")).toBe(90)
    expect(slotSpanMinutes("22:30", "00:00")).toBe(90)
    expect(slotSpanMinutes("23:00", "01:30")).toBe(150)
    expect(slotSpanMinutes("10:00", "10:00")).toBe(0)
  })

  it("sorts night items last on their day row", () => {
    expect(nightSortRank("00:00")).toBe(1)
    expect(nightSortRank("02:59")).toBe(1)
    expect(nightSortRank("03:00")).toBe(0)
    expect(nightSortRank("22:30")).toBe(0)
  })

  it("detects overlap across the midnight boundary", () => {
    // A back-to-back chain 21:00→22:30→00:00→01:30 never overlaps itself
    const chain: Array<[string, string]> = [
      ["21:00", "22:30"],
      ["22:30", "00:00"],
      ["00:00", "01:30"],
    ]
    for (let index = 0; index < chain.length - 1; index++) {
      const previous = chain[index]
      const current = chain[index + 1]
      expect(
        slotRangesOverlap(previous[0], previous[1], current[0], current[1])
      ).toBe(false)
    }
    // ...but a wrapped slot colliding with the night tail does
    expect(slotRangesOverlap("21:00", "01:00", "00:30", "02:00")).toBe(true)
    // overlap that string ordering never puts next to each other
    expect(slotRangesOverlap("00:30", "02:00", "23:30", "01:00")).toBe(true)
    expect(slotRangesOverlap("09:00", "10:30", "10:30", "12:00")).toBe(false)
    expect(slotRangesOverlap("09:00", "10:30", "10:00", "11:00")).toBe(true)
  })

  it("flags items that happen after their row day's midnight", () => {
    expect(isAfterMidnightItem("22:30", "00:00")).toBe(true)
    expect(isAfterMidnightItem("00:00", "01:30")).toBe(true)
    expect(isAfterMidnightItem("09:00", "10:30")).toBe(false)
  })
})
