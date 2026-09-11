import { Skeleton } from "@/components/ui/skeleton"

interface BookingTableSkeletonProps {
  showRefundStatus?: boolean
}

/** Mirrors the booking card: header (venue + status), date/time box, price row, action button. */
export function BookingTableSkeleton({
  showRefundStatus = false,
}: BookingTableSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border">
          {/* Header: venue + status */}
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>

          {/* Body: date/time box + price row */}
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>

            {showRefundStatus && (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            )}
          </div>

          {/* Footer: action button */}
          <div className="p-3">
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
