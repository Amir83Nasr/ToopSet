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
import { cn, formatPersianDate } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: React.ReactNode
  className?: string
}

const defaultPlaceholder = (
  <span className="flex items-center gap-1.5">
    <span>از تاریخ</span>
    <span aria-hidden="true" className="opacity-50">
      تا
    </span>
    <span>تا تاریخ</span>
  </span>
)

function DateRangePicker({
  value,
  onChange,
  placeholder = defaultPlaceholder,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<DateRange | undefined>(value)
  const [pickingEnd, setPickingEnd] = React.useState(false)

  const rangeText = React.useMemo(() => {
    if (!value?.from && !value?.to) return null
    const fromStr = value.from ? formatPersianDate(value.from) : undefined
    const toStr = value.to ? formatPersianDate(value.to) : undefined
    if (fromStr && toStr && fromStr !== toStr) return `${fromStr} تا ${toStr}`
    if (fromStr && toStr && fromStr === toStr) return fromStr
    if (fromStr) return `از ${fromStr}`
    return `تا ${toStr}`
  }, [value])

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(value)
      setPickingEnd(Boolean(value?.from))
    }
    setOpen(next)
  }

  function handleSelect(date: Date | undefined) {
    if (!date) return
    if (!pickingEnd) {
      setDraft({ from: date, to: undefined })
      return
    }
    // Picking an end before the start restarts the range from that day.
    if (draft?.from && date.getTime() < draft.from.getTime()) {
      setDraft({ from: date, to: undefined })
      return
    }
    setDraft({ from: draft?.from, to: date })
  }

  const canConfirm = Boolean(draft?.from && draft?.to)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!rangeText}
          className={cn(
            "w-fit min-w-40 justify-start gap-1.5 rounded-md border border-input bg-background px-2.5 text-right text-sm font-normal transition-colors max-md:px-2.5 dark:bg-background",
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
      <PopoverContent
        className="w-auto max-w-[calc(100vw-2rem)] p-0"
        align="center"
        sideOffset={8}
        collisionPadding={16}
      >
        <div dir="rtl">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
            {pickingEnd && draft?.from ? (
              <>
                <span>
                  {`انتخاب تاریخ پایان — شروع: ${formatPersianDate(draft.from)}`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setPickingEnd(false)}
                >
                  تغییر
                </Button>
              </>
            ) : draft?.from ? (
              `شروع انتخاب‌شده: ${formatPersianDate(draft.from)}`
            ) : (
              "تاریخ شروع را انتخاب کنید"
            )}
          </div>
          <Calendar
            mode="single"
            defaultMonth={draft?.from ?? value?.from}
            selected={pickingEnd ? draft?.to : draft?.from}
            disabled={
              pickingEnd && draft?.from ? { before: draft.from } : undefined
            }
            onSelect={handleSelect}
          />
          <div className="flex justify-between gap-2 border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              انصراف
            </Button>
            <Button
              size="sm"
              disabled={pickingEnd ? !canConfirm : !draft?.from}
              onClick={() => {
                if (pickingEnd) {
                  onChange?.(draft)
                  setOpen(false)
                } else {
                  setPickingEnd(true)
                }
              }}
            >
              {pickingEnd ? "تایید بازه تاریخ" : "تایید تاریخ شروع"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateRangePicker, type DateRangePickerProps }
