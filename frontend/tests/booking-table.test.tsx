import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { BookingTable } from "@/components/bookings/booking-table"
import type { BookingDetail } from "@/components/bookings/types"

describe("BookingTable", () => {
  it("lets a user withdraw a pending cancellation", async () => {
    const onWithdrawCancellation = vi.fn()
    const booking: BookingDetail = {
      id: 42,
      user_id: 7,
      slot_id: 9,
      status: "pending_cancellation",
      price_paid: 200000,
      penalty_amount: null,
      participants_count: 1,
      created_at: "2026-08-01T10:00:00Z",
      updated_at: "2026-08-01T10:00:00Z",
      vendor_name: "سالن تست",
      vendor_address: "قم",
      slot_start_time: "2026-08-03T10:00:00Z",
      slot_end_time: "2026-08-03T12:00:00Z",
      payment: { id: 1, status: "success" },
      refund_status: null,
      refund_amount: null,
      refund_penalty_amount: null,
      refund_requested_at: null,
      refund_approved_at: null,
      refund_paid_at: null,
      refund_payment_tracking_code: null,
      refund_destination_card_masked: null,
    }

    render(
      <BookingTable
        bookings={[booking]}
        totalPages={1}
        page={0}
        onPageChange={vi.fn()}
        payingId={null}
        onPay={vi.fn()}
        onCancelClick={vi.fn()}
        withdrawingId={null}
        onWithdrawCancellation={onWithdrawCancellation}
      />
    )

    const buttons = screen.getAllByRole("button", { name: /انصراف از لغو/ })
    expect(buttons).not.toHaveLength(0)
    await userEvent.click(buttons[0])
    expect(onWithdrawCancellation).toHaveBeenCalledWith(42)
  })
})
