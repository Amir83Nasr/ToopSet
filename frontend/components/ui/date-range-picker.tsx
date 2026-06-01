"use client"

import * as React from "react"
import { type DateRange } from "@daypicker/react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
}

function DateRangePicker({
  value,
  onChange,
  placeholder = "انتخاب بازه",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const rangeText = React.useMemo(() => {
    if (!value?.from && !value?.to) return null
    const fromStr = value.from?.toLocaleDateString("fa-IR")
    const toStr = value.to?.toLocaleDateString("fa-IR")
    if (fromStr && toStr) return `از ${fromStr} تا ${toStr}`
    if (fromStr) return `از ${fromStr}`
    return `تا ${toStr}`
  }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!rangeText}
          className={cn(
            "h-8 w-full justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 text-right text-base font-normal transition-colors md:text-sm",
            "data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          <HugeiconsIcon
            icon={Calendar01Icon}
            size={16}
            data-icon="inline-start"
          />
          <span>{rangeText ?? placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
        <div dir="rtl">
          <div className="border-b px-4 py-2 text-xs text-muted-foreground">
            تاریخ شروع را انتخاب کنید — تاریخ پایان:{" "}
            {value?.to?.toLocaleDateString("fa-IR") ?? "امروز"}
          </div>
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value?.from ? value : undefined}
            onSelect={(dayPickerRange) => {
              if (!dayPickerRange?.from) {
                onChange?.(undefined)
                return
              }
              // DayPicker auto-fills 'to' = 'from' on first click in range mode.
              // Preserve current 'to' unless user explicitly set a different one.
              const isAutoFill =
                !dayPickerRange.to ||
                dayPickerRange.from.getTime() === dayPickerRange.to.getTime()
              const newRange: DateRange = {
                from: dayPickerRange.from,
                to: isAutoFill ? value?.to : dayPickerRange.to,
              }
              onChange?.(newRange)
              if (newRange.from && newRange.to) {
                setOpen(false)
              }
            }}
            numberOfMonths={2}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateRangePicker, type DateRangePickerProps }
