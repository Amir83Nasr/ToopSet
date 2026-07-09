"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"

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
    <DataTableToolbar>
      <SearchInput
        value={searchInput}
        onChange={onSearchInputChange}
        placeholder="جستجوی اعلان..."
      />
      <div className="flex gap-2">
        <div>
          <Select value={typeFilter} onValueChange={onTypeFilterChange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="نوع اعلان" />
            </SelectTrigger>
            <SelectContent>
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
            <SelectContent>
              <SelectGroup>
                <SelectLabel>وضعیت</SelectLabel>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="unread">خوانده نشده</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </DataTableToolbar>
  )
}
