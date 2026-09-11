import { Skeleton } from "@/components/ui/skeleton"

interface BookingTableSkeletonProps {
  showRefundStatus?: boolean
}

export function BookingTableSkeleton({
  showRefundStatus = false,
}: BookingTableSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-md border p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            {showRefundStatus && <Skeleton className="h-4 w-full" />}
          </div>
        </div>
      ))}
    </div>
  )
}
