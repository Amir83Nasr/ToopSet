"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn, toPersianDigits } from "@/lib/utils"

/* ─── helpers ─── */

function pad(n: number): string {
  return n.toString().padStart(2, "0")
}

function persianPad(n: number): string {
  return toPersianDigits(pad(n))
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5) // 0,5,10,...,55

/* ─── props ─── */

interface TimePickerProps {
  value?: string
  onChange?: (val: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/* ─── component ─── */

export function TimePicker({
  value,
  onChange,
  placeholder = "--:--",
  className,
  disabled,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [hour, setHour] = React.useState<number>(12)
  const [minute, setMinute] = React.useState<number>(0)
  const hourRef = React.useRef<HTMLDivElement>(null)
  const minuteRef = React.useRef<HTMLDivElement>(null)

  // Parse initial value
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(":").map(Number)
      setHour(h)
      setMinute(m)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [value])

  // Auto-scroll to selected hour/minute when popover opens
  React.useEffect(() => {
    if (!open) return
    const hEl = hourRef.current?.querySelector(`[data-hour="${hour}"]`)
    hEl?.scrollIntoView({ block: "center" })
    const mEl = minuteRef.current?.querySelector(`[data-minute="${minute}"]`)
    mEl?.scrollIntoView({ block: "center" })
  }, [open, hour, minute])

  function handleConfirm() {
    onChange?.(`${pad(hour)}:${pad(minute)}`)
    setOpen(false)
  }

  const displayText =
    value && /^\d{2}:\d{2}$/.test(value) ? toPersianDigits(value) : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-8 w-fit min-w-25 justify-start gap-2 rounded-md border border-input bg-background px-2.5 text-start text-base font-normal transition-colors md:text-sm",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="size-4 shrink-0" />
          <span>{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start" sideOffset={4}>
        <div className="p-4" dir="ltr">
          {/* Large time display — hours : minutes */}
          <div className="mb-4 flex items-center justify-center gap-1 rounded-md bg-muted/60 py-3 text-center">
            <span className="min-w-[3ch] text-2xl font-bold tracking-wider tabular-nums">
              {persianPad(hour)}
            </span>
            <span className="text-lg text-muted-foreground">:</span>
            <span className="min-w-[3ch] text-2xl font-bold tracking-wider tabular-nums">
              {persianPad(minute)}
            </span>
          </div>

          {/* Scrollable columns — hours left, minutes right */}
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="mb-1 text-center text-[11px] font-medium text-muted-foreground">
                ساعت
              </p>
              <div
                ref={hourRef}
                className="h-44 scrollbar-none overflow-y-auto rounded-md border"
              >
                {HOURS.map((h) => (
                  <button
                    key={h}
                    data-hour={h}
                    type="button"
                    onClick={() => setHour(h)}
                    className={cn(
                      "flex w-full items-center justify-center px-2 py-1.5 text-sm transition-colors",
                      hour === h
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="tabular-nums">{persianPad(h)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <p className="mb-1 text-center text-[11px] font-medium text-muted-foreground">
                دقیقه
              </p>
              <div
                ref={minuteRef}
                className="h-44 scrollbar-none overflow-y-auto rounded-md border"
              >
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    data-minute={m}
                    type="button"
                    onClick={() => setMinute(m)}
                    className={cn(
                      "flex w-full items-center justify-center px-2 py-1.5 text-sm transition-colors",
                      minute === m
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="tabular-nums">{persianPad(m)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              انصراف
            </Button>
            <Button size="sm" onClick={handleConfirm}>
              تایید
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
