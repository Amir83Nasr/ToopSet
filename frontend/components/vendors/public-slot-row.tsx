"use client"

import { memo } from "react"
import { Clock, CreditCard, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  formatPrice,
  formatTime,
  isSlotBookable,
  MY_RESERVING_HINT,
  RESERVING_HINT,
  type TimeSlot,
} from "@/components/vendors/vendor-shared"

// Frozen timestamp for slot expiry checks — computed once at module load so the
// React Compiler does not flag a mutable ref or an impure render-time call.
const NOW = Date.now()

export const SlotRow = memo(function SlotRow({
  slot,
  selectedSlot,
  onSelect,
  payingBookingId = null,
}: {
  slot: TimeSlot
  selectedSlot: TimeSlot | null
  onSelect: (slot: TimeSlot) => void
  /** Booking id currently being sent to the gateway — disables the row while paying. */
  payingBookingId?: number | null
}) {
  const isSelected = selectedSlot?.id === slot.id
  const isPast = new Date(slot.start_time).getTime() <= NOW
  const isReserving = slot.status === "reserving"
  // Own pending_payment booking on this slot → row stays clickable to resume payment
  const isMinePending =
    isReserving && !!slot.reserved_by_me && !!slot.my_booking_id
  const isPaying =
    !!slot.my_booking_id && payingBookingId === slot.my_booking_id
  const bookable = isSlotBookable(slot)
  const disabled = isPast || (!bookable && !isMinePending) || isPaying
  const hint = isMinePending ? MY_RESERVING_HINT : RESERVING_HINT
  const slotDay = new Date(slot.start_time).toLocaleDateString("fa-IR", {
    weekday: "long",
  })

  const rowButton = (
    <button
      onClick={() => !disabled && onSelect(slot)}
      disabled={disabled}
      title={isReserving && !isPast ? hint : undefined}
      className={`grid w-full grid-cols-2 items-center gap-x-3 gap-y-3 border-b px-4 py-3.5 text-right transition-colors sm:grid-cols-[6rem_minmax(11rem,1fr)_8.75rem_7rem] sm:gap-0 sm:text-center ${
        isPast
          ? "cursor-not-allowed opacity-35"
          : isReserving
            ? isMinePending
              ? "cursor-pointer border-amber-300 bg-amber-50/60 hover:bg-amber-100/70 dark:border-amber-900/60 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
              : "cursor-not-allowed border-amber-300 bg-amber-50/50 hover:bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20"
            : disabled
              ? "cursor-not-allowed opacity-35"
              : isSelected
                ? "bg-primary/5"
                : "cursor-pointer hover:bg-muted/20"
      }`}
    >
      <div className="order-1 text-xs font-medium text-muted-foreground sm:order-none sm:text-center">
        {slotDay}
      </div>
      <div className="order-3 flex items-center gap-3 sm:order-none sm:justify-center">
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            isPast
              ? "bg-muted text-muted-foreground"
              : isReserving
                ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                : disabled
                  ? "bg-muted text-muted-foreground"
                  : isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary"
          }`}
        >
          {isMinePending ? (
            <CreditCard className="size-4" />
          ) : (
            <Clock className="size-4" />
          )}
        </div>
        <p
          dir="ltr"
          className="text-sm font-semibold whitespace-nowrap text-foreground"
        >
          {formatTime(slot.start_time)}
          <span className="mx-1.5 text-muted-foreground/30">—</span>
          {formatTime(slot.end_time)}
        </p>
      </div>
      <div className="order-4 text-left sm:order-none sm:text-center">
        <span
          className={`text-sm font-bold ${
            isPast || (disabled && !isReserving)
              ? "text-muted-foreground"
              : isReserving
                ? "text-amber-700 dark:text-amber-400"
                : "text-primary"
          }`}
        >
          {formatPrice(slot.base_price)}
        </span>
      </div>
      <div className="order-2 flex justify-end sm:order-none sm:justify-center">
        {isPast ? (
          <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[10px] font-semibold text-muted-foreground">
            گذشته
          </span>
        ) : isReserving ? (
          <span
            className={`inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[10px] font-semibold ${
              isMinePending
                ? "border-amber-400 bg-amber-200/90 text-amber-900 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-200"
                : "border-amber-300 bg-amber-100/80 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
            }`}
          >
            {isMinePending ? (
              <>
                <CreditCard className="size-3" />
                {isPaying ? "در حال انتقال…" : "ادامه پرداخت"}
              </>
            ) : (
              "در حال رزرو"
            )}
          </span>
        ) : !bookable ? (
          <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[10px] font-semibold text-muted-foreground">
            رزرو شده
          </span>
        ) : isSelected ? (
          <span className="inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-[10px] font-semibold text-primary-foreground">
            انتخاب شد
          </span>
        ) : (
          <span className="inline-flex h-6 items-center rounded-full border border-emerald-200 bg-emerald-50/60 px-2.5 text-[10px] font-semibold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
            آزاد
          </span>
        )}
      </div>
    </button>
  )

  if (isReserving && !isPast) {
    return (
      <div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">{rowButton}</div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-center">
            {hint}
          </TooltipContent>
        </Tooltip>
        {/* Inline hint — always visible so touch users see it too */}
        <p
          className={`flex items-start gap-1.5 border-b px-4 pb-3 text-[11px] leading-5 font-medium ${
            isMinePending
              ? "border-amber-300/80 bg-amber-100/50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
              : "border-amber-200/70 bg-amber-50/40 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300"
          }`}
        >
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {hint}
        </p>
      </div>
    )
  }

  return rowButton
})
