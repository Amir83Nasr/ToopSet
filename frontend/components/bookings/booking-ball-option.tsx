import { useId } from "react"
import { AlertTriangle, CircleCheck, Volleyball } from "lucide-react"
import { cn } from "@/lib/utils"

/** Minimal line-art icon of a hand holding a ball, drawn in the lucide
 *  style (24×24 grid, 2px strokes, round caps) so it blends with the
 *  icon pack and stays crisp at small sizes. */
function HandWithBallIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* ball with two curved seams */}
      <circle cx="12" cy="6.5" r="4" />
      <path d="M9 4.9a4 4 0 0 1 6 0" />
      <path d="M10 8.5a3 3 0 0 0 4 0" />
      {/* open hand cradling the ball */}
      <path d="M3.7 17.8 6 13.5c1.8 2.4 4 3.2 6 3.2s4.2-.8 6-3.2l2.3 4.3" />
    </svg>
  )
}

interface BookingBallOptionProps {
  available: boolean
  price: number
  /** Whether the "rent a ball" option is chosen; null = nothing picked yet */
  selected: boolean | null
  onSelect: (withBall: boolean) => void
  formatPrice: (price: number) => string
}

const cardBase =
  "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all duration-150 sm:p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background"

function SelectedBadge({ visible }: { visible: boolean }) {
  return (
    <CircleCheck
      aria-hidden="true"
      className={cn(
        "absolute start-2 top-2 size-4 fill-primary text-primary-foreground transition-all duration-150 sm:start-2.5 sm:top-2.5 sm:size-5",
        visible ? "scale-100 opacity-100" : "scale-50 opacity-0"
      )}
    />
  )
}

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
      <div
        role="status"
        className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="text-sm font-medium">مجموعه بدون توپ است</p>
          <p className="mt-0.5 text-xs opacity-80">
            این مجموعه توپ در اختیار رزروکننده قرار نمی‌دهد؛ در صورت نیاز، توپ
            همراه داشته باشید.
          </p>
        </div>
      </div>
    )
  }

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-foreground">
        آیا نیاز به توپ دارید؟{" "}
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      </legend>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        {/* Rent a ball — rendered first so it sits on the right in RTL */}
        <label
          className={cn(
            cardBase,
            selected === true
              ? "border-primary bg-primary/5 shadow-md shadow-primary/15"
              : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-600"
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
          <SelectedBadge visible={selected === true} />
          <Volleyball
            aria-hidden="true"
            className="size-8 text-primary sm:size-10"
          />
          <span className="text-sm leading-5 font-medium">اجاره توپ</span>
          <span className="text-xs text-muted-foreground">
            ({formatPrice(price)})
          </span>
        </label>

        {/* Bring my own ball */}
        <label
          className={cn(
            cardBase,
            selected === false
              ? "border-primary bg-primary/5 shadow-md shadow-primary/15"
              : "border-input bg-card hover:border-zinc-400 dark:hover:border-zinc-600"
          )}
        >
          <input
            type="radio"
            name={groupName}
            checked={selected === false}
            onChange={() => onSelect(false)}
            className="sr-only"
            aria-label="خیر، خودم توپ دارم"
          />
          <SelectedBadge visible={selected === false} />
          <HandWithBallIcon className="size-8 text-muted-foreground sm:size-10" />
          <span className="text-sm leading-5 font-medium">
            خیر، خودم توپ دارم
          </span>
        </label>
      </div>
    </fieldset>
  )
}
