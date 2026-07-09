"use client"

import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"

interface BookingFiltersProps {
  search: string
  onSearchChange: (val: string) => void
}

export function BookingFilters({
  search,
  onSearchChange,
}: BookingFiltersProps) {
  return (
    <DataTableToolbar>
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="جستجوی مجموعه..."
      />
    </DataTableToolbar>
  )
}
