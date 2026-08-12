"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { toEnglishDigits, toPersianDigits } from "@/lib/utils"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { AlertTriangle, CreditCard, Loader2 } from "lucide-react"
import type {
  BookingCancellationTerms,
  BookingDetail,
} from "@/components/bookings/types"

interface BookingCancelDialogProps {
  booking: BookingDetail | null
  terms: BookingCancellationTerms | null
  cardNumber: string
  acceptedTerms: boolean
  onCardNumberChange: (value: string) => void
  onAcceptedTermsChange: (value: boolean) => void
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  loading: boolean
}

function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat("fa-IR").format(amount)} تومان`
}

function modeLabel(mode: string): string {
  switch (mode) {
    case "pending_payment":
      return "لغو رزرو پرداخت‌نشده"
    case "pending_replacement":
      return "در انتظار جایگزین"
    case "refund_with_penalty":
      return "عودت با کسر جریمه"
    default:
      return "بررسی شروط لغو"
  }
}

export function BookingCancelDialog({
  booking,
  terms,
  cardNumber,
  acceptedTerms,
  onCardNumberChange,
  onAcceptedTermsChange,
  onOpenChange,
  onConfirm,
  loading,
}: BookingCancelDialogProps) {
  const needsCard = Boolean(
    terms?.requires_bank_card && !terms.has_verified_bank_card
  )
  const canSubmit =
    Boolean(terms?.can_cancel) &&
    acceptedTerms &&
    (!needsCard || cardNumber.replace(/\D/g, "").length === 16)

  return (
    <ResponsiveDialog
      open={!!booking}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false)
      }}
    >
      <ResponsiveDialogContent
        className="sm:max-w-lg"
        mobileMaxHeight="calc(100dvh - 2rem)"
      >
        {booking && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>لغو رزرو</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                شروط لغو رزرو {booking.vendor_name} را بررسی و تایید کنید.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            {!terms ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border p-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                در حال دریافت شروط لغو...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 rounded-lg border p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">نوع لغو</span>
                    <span className="font-medium">{modeLabel(terms.mode)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">مبلغ پرداختی</span>
                    <span>{formatMoney(booking.price_paid)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {terms.mode === "pending_replacement"
                        ? "مبلغ در صورت جایگزینی"
                        : "مبلغ بازگشتی"}
                    </span>
                    <span className="font-medium text-status-confirmed">
                      {formatMoney(terms.refund_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">جریمه</span>
                    <span className="font-medium text-destructive">
                      {formatMoney(terms.penalty_amount)}
                    </span>
                  </div>
                </div>

                {terms.mode === "pending_replacement" && (
                  <div className="rounded-lg border border-status-pending/30 bg-status-pending-bg p-3 text-sm text-status-pending">
                    این رزرو اکنون لغو نمی‌شود؛ ابتدا در انتظار جایگزین قرار
                    می‌گیرد. بازگشت وجه فقط پس از پرداخت موفق کاربر جایگزین ثبت
                    خواهد شد.
                  </div>
                )}

                {terms.blocking_reason && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>{terms.blocking_reason}</span>
                  </div>
                )}

                <div className="rounded-lg border p-4">
                  <p className="mb-2 text-sm font-medium">شروط لغو</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {terms.rules.map((rule) => (
                      <li key={rule} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {needsCard && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CreditCard className="size-4 text-muted-foreground" />
                      شماره کارت برای بازگشت وجه
                    </div>
                    <Input
                      value={toPersianDigits(cardNumber)}
                      onChange={(e) => {
                        const digits = toEnglishDigits(e.target.value).replace(
                          /\D/g,
                          ""
                        )
                        onCardNumberChange(digits.slice(0, 16))
                      }}
                      inputMode="numeric"
                      dir="ltr"
                      maxLength={16}
                      className="text-end"
                      placeholder="۶۰۳۷ ۰۰۰۰ ۰۰۰۰ ۰۰۰۰"
                    />
                    <p className="text-xs text-muted-foreground">
                      این کارت همان لحظه استعلام و برای عودت وجه ثبت می‌شود.
                    </p>
                  </div>
                )}

                <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <Checkbox
                    checked={acceptedTerms}
                    disabled={!terms.can_cancel}
                    onCheckedChange={(checked) =>
                      onAcceptedTermsChange(checked === true)
                    }
                  />
                  <span>شروط لغو را مطالعه کردم و تایید می‌کنم.</span>
                </label>
              </div>
            )}

            <ResponsiveDialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                انصراف
              </Button>
              <Button
                disabled={!canSubmit || loading}
                onClick={onConfirm}
                variant="destructive"
              >
                {loading ? (
                  <>
                    <Loader2 className="me-1 size-4 animate-spin" />
                    در حال لغو...
                  </>
                ) : (
                  "تأیید لغو"
                )}
              </Button>
            </ResponsiveDialogFooter>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
