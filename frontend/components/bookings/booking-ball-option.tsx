import { useId } from "react"
import { cn } from "@/lib/utils"

interface BookingBallOptionProps {
  available: boolean
  price: number
  /** Whether the "rent a ball" option is chosen; null = nothing picked yet */
  selected: boolean | null
  onSelect: (withBall: boolean) => void
  formatPrice: (price: number) => string
}

const optionBase =
  "flex cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background"

export function BookingBallOption({
  available,
  price,
  selected,
  onSelect,
  formatPrice,
}: BookingBallOptionProps) {
  const groupName = useId()

  if (!available) {
    return (
      <div role="status" className="rounded-xl bg-muted px-3 py-2.5">
        <p className="text-sm font-medium text-foreground">
          این مجموعه توپ ارائه نمی‌دهد
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          در صورت نیاز، توپ همراه داشته باشید.
        </p>
      </div>
    )
  }

  return (
    <fieldset>
      <legend className="sr-only">وضعیت توپ</legend>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
        {/* Rent a ball — rendered first so it sits on the right in RTL */}
        <label
          className={cn(
            optionBase,
            selected === true
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <input
            type="radio"
            name={groupName}
            checked={selected === true}
            onChange={() => onSelect(true)}
            className="sr-only"
            aria-label="اجاره توپ"
          />
          <span className="text-sm leading-6 font-semibold">اجاره توپ</span>
          <span className="text-xs text-muted-foreground">
            {formatPrice(price)}
          </span>
        </label>

        {/* Bring my own ball */}
        <label
          className={cn(
            optionBase,
            selected === false
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <input
            type="radio"
            name={groupName}
            checked={selected === false}
            onChange={() => onSelect(false)}
            className="sr-only"
            aria-label="توپ دارم"
          />
          <span className="text-sm leading-6 font-semibold">توپ دارم</span>
          <span className="text-xs text-muted-foreground">رایگان</span>
        </label>
      </div>
    </fieldset>
  )
}
