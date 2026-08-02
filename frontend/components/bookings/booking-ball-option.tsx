import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface BookingBallOptionProps {
  available: boolean
  price: number
  selected: boolean
  onToggle: () => void
  formatPrice: (price: number) => string
}

export function BookingBallOption({
  available,
  price,
  selected,
  onToggle,
  formatPrice,
}: BookingBallOptionProps) {
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
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`flex w-full items-center justify-between rounded-lg border p-3 text-right transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40"
      }`}
    >
      <span>
        <span className="block font-medium">افزودن توپ به رزرو</span>
        <span className="text-xs text-muted-foreground">
          {formatPrice(price)}
        </span>
      </span>
      <Badge variant={selected ? "default" : "outline"}>
        {selected ? "انتخاب شد" : "اختیاری"}
      </Badge>
    </button>
  )
}
