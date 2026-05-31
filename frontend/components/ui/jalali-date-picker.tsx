"use client"

import * as React from "react"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn, toPersianDigits } from "@/lib/utils"
import {
  toJalali,
  fromJalali,
  formatJalali,
  buildJalaliGrid,
  JALALI_MONTHS,
  JALALI_WEEKDAYS,
  isToday,
} from "@/lib/jalali"

interface JalaliDatePickerProps {
  value?: Date | string | null
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

function JalaliDatePicker({
  value: valueProp,
  onChange,
  placeholder = "انتخاب تاریخ",
  className,
}: JalaliDatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedDate: Date | undefined = React.useMemo(() => {
    if (!valueProp) return undefined
    if (valueProp instanceof Date && !isNaN(valueProp.getTime())) return valueProp
    if (typeof valueProp === "string") {
      const d = new Date(valueProp)
      if (!isNaN(d.getTime())) return d
    }
    return undefined
  }, [valueProp])

  const [viewDate, setViewDate] = React.useState<Date>(
    () => selectedDate ?? new Date()
  )

  const viewJalali = toJalali(viewDate)
  const selectedJalali = selectedDate ? toJalali(selectedDate) : undefined

  const grid = React.useMemo(
    () => buildJalaliGrid(viewJalali.year, viewJalali.month),
    [viewJalali.year, viewJalali.month]
  )

  const goToPrevMonth = () => {
    let ny = viewJalali.year
    let nm = viewJalali.month - 1
    if (nm < 1) { nm = 12; ny-- }
    setViewDate(fromJalali(ny, nm, 1))
  }

  const goToNextMonth = () => {
    let ny = viewJalali.year
    let nm = viewJalali.month + 1
    if (nm > 12) { nm = 1; ny++ }
    setViewDate(fromJalali(ny, nm, 1))
  }

  const handleSelect = (day: number) => {
    if (!day) return
    const date = fromJalali(viewJalali.year, viewJalali.month, day)
    setViewDate(date)
    onChange?.(date)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 w-full justify-start gap-2 text-right font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarDays className="size-4 shrink-0" />
          <span>
            {selectedDate
              ? formatJalali(selectedDate, "long")
              : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        {/* Month/Year header */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={goToPrevMonth}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Button>
          <span className="text-sm font-medium">
            {JALALI_MONTHS[viewJalali.month - 1]} {toPersianDigits(viewJalali.year)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={goToNextMonth}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {JALALI_WEEKDAYS.map((name) => (
            <div
              key={name}
              className="flex h-8 w-full items-center justify-center text-xs font-medium text-muted-foreground"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((week, wi) =>
            week.map((day, di) => {
              const isSelected =
                day &&
                selectedJalali &&
                selectedJalali.year === viewJalali.year &&
                selectedJalali.month === viewJalali.month &&
                selectedJalali.day === day

              const isTodayDate =
                day && isToday(viewJalali.year, viewJalali.month, day)

              if (!day) {
                return (
                  <div
                    key={`${wi}-${di}`}
                    className="h-8 w-full"
                  />
                )
              }

              return (
                <Button
                  key={`${wi}-${di}`}
                  variant="ghost"
                  className={cn(
                    "flex h-8 w-full items-center justify-center rounded-md p-0 text-sm font-normal",
                    isSelected &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    !isSelected &&
                      isTodayDate &&
                      "border border-primary/40 text-primary",
                    !isSelected &&
                      !isTodayDate &&
                      "text-foreground hover:bg-accent"
                  )}
                  onClick={() => handleSelect(day)}
                >
                  {toPersianDigits(day)}
                </Button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { JalaliDatePicker, type JalaliDatePickerProps }
