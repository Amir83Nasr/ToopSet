import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { BookingTable } from "@/components/bookings/booking-table"
import type { BookingDetail } from "@/components/bookings/types"

describe("BookingTable", () => {
  it("resumes a pending gateway payment without offering site cancellation", async () => {
    const onPay = vi.fn()
    const booking: BookingDetail = {
      id: 24,
      user_id: 7,
      slot_id: 12,
      status: "pending_payment",
      price_paid: 20000,
      penalty_amount: null,
      created_at: "2026-08-16T01:00:00Z",
      updated_at: "2026-08-16T01:00:00Z",
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      vendor_name: "سالن تست",
      vendor_address: "قم",
      slot_start_time: "2026-08-18T10:00:00Z",
      slot_end_time: "2026-08-18T12:00:00Z",
      payment: {
        id: 22,
        status: "pending",
        gateway_transaction_id: "4733198010",
        gateway_name: "zibal",
      },
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
        onPay={onPay}
        onCancelClick={vi.fn()}
        withdrawingId={null}
        onWithdrawCancellation={vi.fn()}
        category="current"
      />
    )

    expect(screen.queryByRole("button", { name: "لغو رزرو" })).toBeNull()
    const continueButton = screen.getByRole("button", { name: /ادامه پرداخت/ })
    await userEvent.click(continueButton)
    expect(onPay).toHaveBeenCalledWith(24)
  })

  it("lets a user withdraw a pending cancellation", async () => {
    const onWithdrawCancellation = vi.fn()
    const booking: BookingDetail = {
      id: 42,
      user_id: 7,
      slot_id: 9,
      status: "pending_cancellation",
      price_paid: 200000,
      penalty_amount: null,
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
        category="current"
      />
    )

    const buttons = screen.getAllByRole("button", { name: /انصراف از لغو/ })
    expect(buttons).not.toHaveLength(0)
    await userEvent.click(buttons[0])
    expect(onWithdrawCancellation).toHaveBeenCalledWith(42)
  })
})
