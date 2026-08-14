import { Skeleton } from "@/components/ui/skeleton"
import { BookingTableSkeleton } from "@/components/bookings/booking-table-skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Page Title & Refresh Button Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 border-b pb-4">
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <BookingTableSkeleton />
    </div>
  )
}
