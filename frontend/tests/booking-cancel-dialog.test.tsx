import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { BookingCancelDialog } from "@/components/bookings/booking-cancel-dialog"
import type {
  BookingCancellationTerms,
  BookingDetail,
} from "@/components/bookings/types"

const booking: BookingDetail = {
  id: 24,
  user_id: 7,
  slot_id: 12,
  status: "pending_payment",
  price_paid: 20000,
  penalty_amount: null,
  created_at: "2026-09-17T10:00:00Z",
  updated_at: "2026-09-17T10:00:00Z",
  expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  vendor_name: "سالن تست",
  vendor_address: "قم",
  slot_start_time: "2026-09-19T10:00:00Z",
  slot_end_time: "2026-09-19T12:00:00Z",
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

const unpaidTerms: BookingCancellationTerms = {
  booking_id: 24,
  can_cancel: true,
  requires_bank_card: false,
  has_verified_bank_card: false,
  mode: "pending_payment",
  refund_amount: 0,
  penalty_amount: 0,
  rules: ["رزرو در انتظار پرداخت را می‌توانید از داخل سایت لغو کنید."],
  blocking_reason: null,
}

const paidTerms: BookingCancellationTerms = {
  booking_id: 24,
  can_cancel: true,
  requires_bank_card: true,
  has_verified_bank_card: true,
  mode: "refund_with_penalty",
  refund_amount: 90000,
  penalty_amount: 10000,
  rules: ["اگر بیش از ۴۸ ساعت تا شروع سانس باقی مانده باشد، ۹۰٪ عودت می‌شود."],
  blocking_reason: null,
}

function setup(terms: BookingCancellationTerms) {
  return render(
    <BookingCancelDialog
      booking={booking}
      terms={terms}
      cardNumber=""
      acceptedTerms={false}
      onCardNumberChange={vi.fn()}
      onAcceptedTermsChange={vi.fn()}
      onOpenChange={vi.fn()}
      onConfirm={vi.fn()}
      loading={false}
    />
  )
}

describe("BookingCancelDialog", () => {
  it("skips cancellation terms for an unpaid booking", async () => {
    const onConfirm = vi.fn()
    render(
      <BookingCancelDialog
        booking={booking}
        terms={unpaidTerms}
        cardNumber=""
        acceptedTerms={false}
        onCardNumberChange={vi.fn()}
        onAcceptedTermsChange={vi.fn()}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        loading={false}
      />
    )

    expect(
      screen.getByText(/رزرو پرداخت‌نشده سالن تست را لغو می‌کنید/)
    ).toBeInTheDocument()
    // No terms list and no acceptance checkbox — nothing was paid yet.
    expect(screen.queryByText("شروط لغو")).toBeNull()
    expect(
      screen.queryByText("شروط لغو را مطالعه کردم و تایید می‌کنم.")
    ).toBeNull()

    const confirm = screen.getByRole("button", { name: "تأیید لغو" })
    expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalled()
  })

  it("requires accepting the terms for a paid booking", async () => {
    setup(paidTerms)

    expect(screen.getByText("شروط لغو")).toBeInTheDocument()
    expect(
      screen.getByText("شروط لغو را مطالعه کردم و تایید می‌کنم.")
    ).toBeInTheDocument()

    expect(screen.getByRole("button", { name: "تأیید لغو" })).toBeDisabled()
  })
})
