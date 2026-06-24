"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"

interface BookingFiltersProps {
  search: string
  onSearchChange: (val: string) => void
  statusFilter: string
  onStatusFilterChange: (val: string) => void
}

export function BookingFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
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
        <div>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="همه وضعیت‌ها" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectGroup>
                <SelectLabel>وضعیت رزرو</SelectLabel>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="pending_payment">
                  در انتظار پرداخت
                </SelectItem>
                <SelectItem value="confirmed">تایید شده</SelectItem>
                <SelectItem value="cancelled">لغو شده</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
