"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface BookingFiltersProps {
  search: string
  onSearchChange: (val: string) => void
}

export function BookingFilters({
  search,
  onSearchChange,
}: BookingFiltersProps) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="جستجوی مجموعه..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>
    </div>
  )
}
