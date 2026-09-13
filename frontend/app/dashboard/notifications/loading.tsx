import { Skeleton } from "@/components/ui/skeleton"
import { NotificationTableSkeleton } from "@/components/notifications/notification-table-skeleton"

/** Mirrors the notifications page: header + filter row + list skeleton. */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>

      <NotificationTableSkeleton />
    </div>
  )
}
