"use client"

import { useState } from "react"
import { X, Save, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TimePicker } from "@/components/ui/time-picker"
import { PersianInput } from "@/components/ui/persian-input"
import { formatPersianDate } from "./utils"

interface QuickSlotFormProps {
  date: Date
  onClose: () => void
  onSubmit: (data: {
    start_time: string
    end_time: string
    base_price: number
  }) => Promise<void>
  submitting?: boolean
}

export function QuickSlotForm({
  date,
  onClose,
  onSubmit,
  submitting,
}: QuickSlotFormProps) {
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [price, setPrice] = useState("")

  async function handleSubmit() {
    if (!start || !end || !price) return
    await onSubmit({
      start_time: start,
      end_time: end,
      base_price: Number(price),
    })
    onClose()
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Clock className="size-4 text-primary" />
          {formatPersianDate(date)}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onClose}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">شروع</Label>
          <TimePicker value={start} onChange={setStart} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">پایان</Label>
          <TimePicker value={end} onChange={setEnd} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">قیمت</Label>
          <PersianInput
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="۱۰۰۰۰۰"
          />
        </div>
      </div>

      <Button
        size="sm"
        className="w-full"
        onClick={handleSubmit}
        disabled={submitting || !start || !end || !price}
      >
        <Save className="ml-1 size-3.5" />
        {submitting ? "در حال ایجاد..." : "ایجاد سانس"}
      </Button>
    </div>
  )
}
