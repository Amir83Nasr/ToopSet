import { describe, expect, it } from "vitest"
import {
  settlementStateForBooking,
  type FinanceBooking,
  type SettlementState,
} from "@/components/vendors/dashboard/vendor-utils"

describe("settlementStateForBooking", () => {
  const cases: Array<[SettlementState, string]> = [
    ["settled", "تسویه شده"],
    ["eligible", "قابل تسویه"],
    ["pending_settlement", "در انتظار تسویه"],
    ["not_yet_eligible", "غیرقابل تسویه (سانس هنوز پایان نیافته)"],
  ]

  it.each(cases)("maps %s to its clear Persian label", (state, label) => {
    const booking = { settlement_state: state } as FinanceBooking
    expect(settlementStateForBooking(booking).label).toBe(label)
  })

  it("falls back safely for unexpected settlement states", () => {
    const booking = {
      settlement_state: "excluded_due_to_cancellation",
    } as FinanceBooking

    expect(settlementStateForBooking(booking)).toEqual({
      label: "وضعیت نامشخص: excluded_due_to_cancellation",
      variant: "outline",
    })
  })
})
