import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { BookingTable } from "@/components/bookings/booking-table"
import type { BookingDetail } from "@/components/bookings/types"

describe("BookingTable", () => {
  it("resumes a pending gateway payment and offers in-site cancellation", async () => {
    const onPay = vi.fn()
    const onCancelClick = vi.fn()
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
        onCancelClick={onCancelClick}
        withdrawingId={null}
        onWithdrawCancellation={vi.fn()}
        category="current"
      />
    )

    const continueButton = screen.getByRole("button", { name: /ادامه پرداخت/ })
    await userEvent.click(continueButton)
    expect(onPay).toHaveBeenCalledWith(24)

    const cancelButton = screen.getByRole("button", { name: "لغو رزرو" })
    await userEvent.click(cancelButton)
    expect(onCancelClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 24 })
    )
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

describe("BookingTable review action", () => {
  const completedBooking: BookingDetail = {
    id: 51,
    user_id: 7,
    slot_id: 12,
    status: "confirmed",
    price_paid: 150000,
    penalty_amount: null,
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-01T10:00:00Z",
    expires_at: null,
    vendor_name: "سالن گذشته",
    vendor_address: "قم",
    slot_start_time: "2026-08-10T10:00:00Z",
    slot_end_time: "2026-08-10T12:00:00Z",
    payment: null,
    refund_status: null,
    refund_amount: null,
    refund_penalty_amount: null,
    refund_requested_at: null,
    refund_approved_at: null,
    refund_paid_at: null,
    refund_payment_tracking_code: null,
    refund_destination_card_masked: null,
  }

  it("offers review submission for an unreviewed completed booking in the past tab", async () => {
    const onReviewClick = vi.fn()
    render(
      <BookingTable
        bookings={[completedBooking]}
        totalPages={1}
        page={0}
        onPageChange={vi.fn()}
        payingId={null}
        onPay={vi.fn()}
        onCancelClick={vi.fn()}
        withdrawingId={null}
        onWithdrawCancellation={vi.fn()}
        onReviewClick={onReviewClick}
        category="past"
      />
    )

    const reviewButton = screen.getByRole("button", { name: /ثبت نظر/ })
    await userEvent.click(reviewButton)
    expect(onReviewClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 51 })
    )
  })

  it("shows the reviewed state instead of a button when has_review is true", () => {
    render(
      <BookingTable
        bookings={[{ ...completedBooking, has_review: true }]}
        totalPages={1}
        page={0}
        onPageChange={vi.fn()}
        payingId={null}
        onPay={vi.fn()}
        onCancelClick={vi.fn()}
        withdrawingId={null}
        onWithdrawCancellation={vi.fn()}
        onReviewClick={vi.fn()}
        category="past"
      />
    )

    expect(screen.queryByRole("button", { name: /ثبت نظر/ })).toBeNull()
    expect(screen.getByText("نظر شما ثبت شده است")).toBeVisible()
  })

  it("does not offer review on the current tab", () => {
    render(
      <BookingTable
        bookings={[completedBooking]}
        totalPages={1}
        page={0}
        onPageChange={vi.fn()}
        payingId={null}
        onPay={vi.fn()}
        onCancelClick={vi.fn()}
        withdrawingId={null}
        onWithdrawCancellation={vi.fn()}
        onReviewClick={vi.fn()}
        category="current"
      />
    )

    expect(screen.queryByRole("button", { name: /ثبت نظر/ })).toBeNull()
  })
})
