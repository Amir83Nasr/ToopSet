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

const typeOptions = [
  { value: "booking_created", label: "رزرو جدید" },
  { value: "booking_confirmed", label: "تایید رزرو" },
  { value: "booking_cancelled", label: "لغو رزرو" },
  { value: "broadcast", label: "اعلان همگانی" },
]

interface NotificationFiltersProps {
  searchInput: string
  onSearchInputChange: (val: string) => void
  typeFilter: string
  onTypeFilterChange: (val: string) => void
  statusFilter: string
  onStatusFilterChange: (val: string) => void
}

export function NotificationFilters({
  searchInput,
  onSearchInputChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
}: NotificationFiltersProps) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="جستجوی اعلان..."
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex gap-2">
          <div>
            <Select value={typeFilter} onValueChange={onTypeFilterChange}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="نوع اعلان" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectLabel>نوع اعلان</SelectLabel>
                  <SelectItem value="all">همه</SelectItem>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectLabel>وضعیت</SelectLabel>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="unread">خوانده نشده</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
