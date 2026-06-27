"use client"

import { Clock, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatTime, formatPrice, getSlotStatus } from "./utils"
import type { TimeSlot } from "./types"

interface SlotCardProps {
  slot: TimeSlot
  onDelete?: (slot: TimeSlot) => void
  onEdit?: (slot: TimeSlot) => void
  showActions?: boolean
  compact?: boolean
}

export function SlotCard({
  slot,
  onDelete,
  onEdit,
  showActions = true,
  compact = false,
}: SlotCardProps) {
  const status = getSlotStatus(slot)

  const statusStyles = {
    available: "border-primary/30 bg-primary/5 dark:border-primary/20",
    reserved:
      "border-destructive/30 bg-destructive/5 dark:border-destructive/20",
    past: "border-muted bg-muted/20 opacity-60",
  }

  const statusLabels = {
    available: "آزاد",
    reserved: "رزرو شده",
    past: "گذشته",
  }

  return (
    <div
      className={`group relative rounded-lg border p-2.5 transition-all hover:shadow-sm ${
        statusStyles[status]
      } ${compact ? "p-1.5" : ""} ${
        onEdit && status !== "past" ? "cursor-pointer" : ""
      }`}
      onClick={() => {
        if (onEdit && status !== "past") onEdit(slot)
      }}
    >
      <div
        className={`mb-1 flex items-center gap-1 font-medium ${compact ? "text-[11px]" : "text-xs"}`}
      >
        <Clock className="size-3 shrink-0" />
        <span>
          {formatTime(slot.start_time)} &ndash; {formatTime(slot.end_time)}
        </span>
      </div>

      {!compact && (
        <div className="mb-1.5 text-xs text-muted-foreground">
          {formatPrice(slot.base_price)}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Badge
          variant={status === "available" ? "outline" : "secondary"}
          className="px-1.5 py-0 text-[10px]"
        >
          {statusLabels[status]}
        </Badge>

        {showActions && status === "available" && onDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(slot)
                }}
              >
                <Trash2 className="size-3 text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>حذف سانس</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {status === "reserved" && (
        <div
          className="absolute inset-0 cursor-help rounded-lg"
          title="این زمان توسط کاربر رزرو شده است"
        />
      )}
    </div>
  )
}
