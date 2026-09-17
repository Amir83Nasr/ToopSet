"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn, toPersianDigits } from "@/lib/utils"

/* ─── helpers ─── */

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i))
const MINUTES = Array.from({ length: 6 }, (_, i) => pad(i * 10))

/* ─── props ─── */

interface TimePickerProps {
  value?: string
  onChange?: (val: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  ariaLabel?: string
}

/* ─── component ─── */

export function TimePicker({
  value,
  onChange,
  placeholder = "دقیقه : ساعت",
  className,
  disabled,
  ariaLabel,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const parsed = value && /^\d{2}:\d{2}$/.test(value) ? value.split(":") : null
  const hour = parsed?.[0]
  const minute = parsed?.[1]

  function handleHour(h: string) {
    onChange?.(`${h}:${minute ?? "00"}`)
  }

  function handleMinute(m: string) {
    onChange?.(`${hour ?? "00"}:${m}`)
  }

  const displayText = parsed ? toPersianDigits(value as string) : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "w-fit min-w-25 justify-start gap-1.5 rounded-md border border-input bg-background px-2.5 text-start text-sm font-normal transition-colors max-md:px-2.5 dark:bg-background",
            !parsed && "text-muted-foreground",
            className
          )}
        >
          <Clock className="size-4 shrink-0" />
          <span className="tabular-nums">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-60 max-w-[calc(100vw-2rem)] p-0"
        align="center"
        sideOffset={8}
        collisionPadding={16}
      >
        <div className="p-4" dir="rtl">
          {/* Large time display — hours : minutes, 24h, no seconds */}
          <div
            className="mb-4 flex items-center justify-center gap-1 rounded-md bg-muted/60 py-3 text-center"
            dir="ltr"
          >
            <span className="min-w-[3ch] text-2xl font-bold tracking-wider tabular-nums">
              {hour ? toPersianDigits(hour) : "--"}
            </span>
            <span className="text-lg text-muted-foreground">:</span>
            <span className="min-w-[3ch] text-2xl font-bold tracking-wider tabular-nums">
              {minute ? toPersianDigits(minute) : "--"}
            </span>
          </div>

          {/* Minute right, hour left (RTL first = right) */}
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="mb-1 text-center text-[11px] font-medium text-muted-foreground">
                دقیقه
              </p>
              <Select
                value={minute}
                onValueChange={handleMinute}
                disabled={disabled}
                dir="rtl"
              >
                <SelectTrigger aria-label="دقیقه" className="w-full">
                  <SelectValue placeholder="دقیقه" />
                </SelectTrigger>
                <SelectContent>
                  {MINUTES.map((m) => (
                    <SelectItem key={m} value={m}>
                      <span className="tabular-nums">{toPersianDigits(m)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <p className="mb-1 text-center text-[11px] font-medium text-muted-foreground">
                ساعت
              </p>
              <Select
                value={hour}
                onValueChange={handleHour}
                disabled={disabled}
                dir="rtl"
              >
                <SelectTrigger aria-label="ساعت" className="w-full">
                  <SelectValue placeholder="ساعت" />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={h}>
                      <span className="tabular-nums">{toPersianDigits(h)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
