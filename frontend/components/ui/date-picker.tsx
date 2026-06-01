"use client"

import * as React from "react"
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

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

function DatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!value}
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
          {value ? (
            value.toLocaleDateString("fa-IR")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, type DatePickerProps }
