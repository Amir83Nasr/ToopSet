"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"

interface PersianDatePickerProps {
  value?: Date
  onChange: (date: Date) => void
  minDate?: Date
  placeholder?: string
  className?: string
}

function PersianDatePicker({
  value,
  onChange,
  minDate,
  placeholder = "انتخاب تاریخ",
  className,
}: PersianDatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<Date | undefined>(value)
  const label = value?.toLocaleDateString("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  function handleOpenChange(next: boolean) {
    if (next) setDraft(value)
    setOpen(next)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start gap-1.5 border-input text-start font-normal max-md:px-2.5 dark:bg-background",
            !label && "text-muted-foreground",
            className
          )}
        >
          <HugeiconsIcon
            icon={Calendar01Icon}
            size={16}
            data-icon="inline-start"
          />
          {label ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[calc(100vw-2rem)] p-0"
        align="center"
        sideOffset={8}
        collisionPadding={16}
      >
        <div dir="rtl">
          <div className="border-b px-4 py-2 text-xs text-muted-foreground">
            {draft
              ? `تاریخ انتخاب‌شده: ${draft.toLocaleDateString("fa-IR-u-ca-persian")}`
              : "یک تاریخ انتخاب کنید"}
          </div>
          <Calendar
            mode="single"
            selected={draft}
            defaultMonth={draft ?? minDate}
            disabled={minDate ? { before: minDate } : undefined}
            onSelect={setDraft}
          />
          <div className="flex justify-between gap-2 border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!draft}
              onClick={() => {
                if (!draft) return
                onChange(draft)
                setOpen(false)
              }}
            >
              تایید تاریخ
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { PersianDatePicker, type PersianDatePickerProps }
